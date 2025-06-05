import 'react-native-get-random-values';  // Importar primero
import { makeAutoObservable, runInAction } from 'mobx';
import { getAuth } from '@react-native-firebase/auth';
import { Message, MessageModel } from '../models/Message';
import CryptoJS from 'crypto-js';
import { Platform, Image } from 'react-native';
import {
  loadOtherParticipantInfo,
  resetChatUnreadCount,
  subscribeToChatMessages,
  sendChatMessage,
  decryptMessage,
  getUser,
  uploadChatImage,
  sendChatImage,
  deleteMessage,
  processAndDeleteMessage,
  COLLECTIONS
} from '../services/firestore';
import { setCurrentChatId } from '../../App';
import * as ImagePicker from 'react-native-image-picker';
import { CacheService } from '../services/cache';
import storage from '@react-native-firebase/storage';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';

export class ChatViewModel {
  messages: Message[] = [];
  newMessage: string = '';
  loading: boolean = true;
  chatId: string;
  otherParticipantId: string;
  otherParticipantName: string = '';
  otherParticipantPhoto: string | undefined;
  private readonly encryptionKey: string;
  private unsubscribe: (() => void) | null = null;
  uploadingImage: boolean = false;
  private lastSyncTime: Date | null = null;

  constructor(chatId: string, otherParticipantId: string) {
    this.chatId = chatId;
    this.otherParticipantId = otherParticipantId;
    this.encryptionKey = this.generateChatKey(chatId);
    makeAutoObservable(this);
    this.initializeChat();
  }

  private async initializeChat() {
    try {
      // Cargar mensajes desde caché primero
      const cachedMessages = await CacheService.getChatMessages(this.chatId);
      if (cachedMessages) {
        runInAction(() => {
          this.messages = cachedMessages;
          this.loading = false;
        });
      }

      // Cargar información del participante
      await this.loadOtherParticipantInfo();
      
      // Suscribirse a nuevos mensajes
      this.subscribeToMessages();
      
      // Resetear contador de mensajes no leídos
      await this.resetUnreadCount();
      
      // Actualizar chat actual
      setCurrentChatId(this.chatId);
    } catch (error) {
      console.error('Error al inicializar chat:', error);
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  private generateChatKey(chatId: string): string {
    return chatId;
  }

  private async loadOtherParticipantInfo() {
    try {
      const participantInfo = await loadOtherParticipantInfo(this.otherParticipantId);
      runInAction(() => {
        this.otherParticipantName = participantInfo.name;
        this.otherParticipantPhoto = participantInfo.photoURL;
      });
    } catch (error) {
      console.error('Error al cargar información del participante:', error);
      runInAction(() => {
        this.otherParticipantName = 'Usuario';
      });
    }
  }

  setNewMessage = (text: string) => {
    this.newMessage = text;
  }

  private async resetUnreadCount() {
    await resetChatUnreadCount(this.chatId);
  }

  private subscribeToMessages() {
    this.unsubscribe = subscribeToChatMessages(
      this.chatId,
      async (newMessages) => {
        try {
          // Obtener mensajes del caché
          const cachedMessages = await CacheService.getChatMessages(this.chatId) || [];
          
          // Procesar solo los mensajes nuevos
          const processedNewMessages = await Promise.all(newMessages
            .filter(newMsg => !cachedMessages.some(cachedMsg => cachedMsg.id === newMsg.id))
            .map(async doc => {
              const data = doc;
              if (data.type === 'image') {
                // Guardar imagen localmente
                const localPath = await CacheService.saveImageLocally(data.imageUrl, this.chatId);
                if (localPath) {
                  // Actualizar la URL de la imagen a la local
                  return MessageModel.fromFirestore(doc.id, {
                    ...data,
                    imageUrl: localPath
                  });
                }
              }
              const decryptedText = decryptMessage(data.text, this.encryptionKey);
              return MessageModel.fromFirestore(doc.id, {
                ...data,
                text: decryptedText
              });
            }));

          // Combinar mensajes del caché con los nuevos y ordenar por fecha (más recientes primero)
          const allMessages = [...cachedMessages, ...processedNewMessages].sort((a, b) => {
            const dateA = a.createdAt?.getTime() || 0;
            const dateB = b.createdAt?.getTime() || 0;
            return dateB - dateA;
          });

          // Guardar todos los mensajes en caché
          await CacheService.saveChatMessages(this.chatId, allMessages);

          // Eliminar mensajes y sus imágenes de Firebase
          const auth = getAuth();
          const currentUserId = auth.currentUser?.uid;
          
          for (const message of newMessages) {
            try {
              await processAndDeleteMessage(message, this.chatId, currentUserId || '');
            } catch (error) {
              console.error('Error al procesar mensaje:', error);
            }
          }

          runInAction(() => {
            this.messages = allMessages;
            this.loading = false;
          });
        } catch (error) {
          console.error('Error al procesar mensajes:', error);
          runInAction(() => {
            this.loading = false;
          });
        }
      },
      (error) => {
        console.error('Error al cargar mensajes:', error);
        runInAction(() => {
          this.loading = false;
        });
      }
    );
  }

  async sendMessage() {
    if (!this.newMessage.trim()) return;

    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const messageToSend = this.newMessage.trim();
    runInAction(() => {
      this.newMessage = '';
    });

    try {
      // Obtener el nombre del usuario desde Firestore
      const userDoc = await getUser(currentUser.uid);
      const userName = userDoc?.name || 'Usuario';

      await sendChatMessage(
        this.chatId,
        messageToSend,
        currentUser.uid,
        this.otherParticipantId,
        {
          fromName: userName,
          to: this.otherParticipantId
        }
      );
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  }

  async pickAndSendImage() {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel) {
        return;
      }

      if (result.assets && result.assets[0]) {
        await this.sendImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
    }
  }

  async takeAndSendPhoto() {
    try {
      const result = await ImagePicker.launchCamera({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel) {
        return;
      }

      if (result.assets && result.assets[0]) {
        await this.sendImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
    }
  }

  private async sendImage(imageAsset: ImagePicker.ImagePickerAsset) {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      runInAction(() => {
        this.uploadingImage = true;
      });

      const userDoc = await getUser(currentUser.uid);
      const userName = userDoc?.name || 'Usuario';

      // Subir imagen a Firebase Storage
      const imageUrl = await uploadChatImage(this.chatId, {
        path: imageAsset.uri || imageAsset.path,
        type: imageAsset.type,
        fileName: imageAsset.fileName
      });

      // Guardar imagen localmente
      const localPath = await CacheService.saveImageLocally(imageUrl, this.chatId);
      
      // Enviar mensaje con la URL de Firebase (para que el otro dispositivo pueda descargarla)
      await sendChatImage(
        this.chatId,
        imageUrl,
        currentUser.uid,
        this.otherParticipantId,
        {
          fromName: userName,
          to: this.otherParticipantId
        }
      );

      // Guardar mensaje en caché con la ruta local
      const newMessage = {
        id: Date.now().toString(), // ID temporal
        type: 'image',
        imageUrl: localPath || imageUrl, // Usar ruta local si está disponible
        senderId: currentUser.uid,
        createdAt: new Date(),
        fromName: userName,
        to: this.otherParticipantId
      };

      // Actualizar mensajes en caché
      const cachedMessages = await CacheService.getChatMessages(this.chatId) || [];
      const updatedMessages = [...cachedMessages, newMessage].sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return dateB - dateA;
      });
      
      await CacheService.saveChatMessages(this.chatId, updatedMessages);

      runInAction(() => {
        this.messages = updatedMessages;
      });

    } catch (error) {
      console.error('Error al enviar imagen:', error);
    } finally {
      runInAction(() => {
        this.uploadingImage = false;
      });
    }
  }

  async deleteMessage(message: Message) {
    try {
      // Actualizar mensajes en caché
      const updatedMessages = this.messages.filter(m => m.id !== message.id);
      await CacheService.saveChatMessages(this.chatId, updatedMessages);
      
      runInAction(() => {
        this.messages = updatedMessages;
      });
    } catch (error) {
      console.error('Error al eliminar mensaje:', error);
    }
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.resetUnreadCount();
    setCurrentChatId(null);
  }

  isOwnMessage(message: Message): boolean {
    const auth = getAuth();
    return message.senderId === auth.currentUser?.uid;
  }
} 