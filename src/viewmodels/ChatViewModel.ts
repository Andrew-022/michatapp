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
          
          // Si no hay mensajes nuevos ni en caché, actualizar el estado de carga
          if (newMessages.length === 0 && cachedMessages.length === 0) {
            runInAction(() => {
              this.loading = false;
            });
            return;
          }

          // Filtrar solo mensajes nuevos que no están en caché
          const uniqueNewMessages = newMessages.filter(
            newMsg => !cachedMessages.some(cachedMsg => cachedMsg.id === newMsg.id)
          );

          if (uniqueNewMessages.length === 0) {
            runInAction(() => {
              this.messages = cachedMessages;
              this.loading = false;
            });
            return;
          }

          // Procesar solo los mensajes nuevos
          const processedNewMessages = await Promise.all(uniqueNewMessages.map(async doc => {
            try {
              const data = doc;
              if (!data) {
                console.log('Mensaje no encontrado en Firestore, probablemente ya fue leído y eliminado');
                return null;
              }

              // Si es un mensaje propio, no procesar la imagen
              if (this.isOwnMessage(data) && data.type === 'image') {
                return MessageModel.fromFirestore(doc.id, data);
              }

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

              // Solo intentar descifrar si hay texto
              if (data.text) {
                try {
                  const decryptedText = decryptMessage(data.text, this.encryptionKey);
                  return MessageModel.fromFirestore(doc.id, {
                    ...data,
                    text: decryptedText
                  });
                } catch (error) {
                  console.error('Error al descifrar mensaje:', error);
                  // Si falla el descifrado, devolver el mensaje sin descifrar
                  return MessageModel.fromFirestore(doc.id, data);
                }
              }

              // Si no hay texto ni imagen, devolver el mensaje tal cual
              return MessageModel.fromFirestore(doc.id, data);
            } catch (error) {
              console.error('Error al procesar mensaje:', error);
              return null;
            }
          }));

          // Filtrar mensajes nulos y combinar con los existentes
          const validNewMessages = processedNewMessages.filter(msg => msg !== null);
          const allMessages = [...cachedMessages, ...validNewMessages].sort((a, b) => {
            const dateA = a.createdAt?.getTime() || 0;
            const dateB = b.createdAt?.getTime() || 0;
            return dateB - dateA;
          });

          // Guardar todos los mensajes en caché
          await CacheService.saveChatMessages(this.chatId, allMessages);

          // Eliminar mensajes y sus imágenes de Firebase solo para mensajes nuevos
          const auth = getAuth();
          const currentUserId = auth.currentUser?.uid;
          
          for (const message of uniqueNewMessages) {
            try {
              if (message) {
                await processAndDeleteMessage(message, this.chatId, currentUserId || '');
              }
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

      // Crear mensaje temporal para actualización inmediata
      const tempMessage: Message = {
        id: Date.now().toString(),
        text: messageToSend,
        senderId: currentUser.uid,
        createdAt: new Date(),
        fromName: userName,
        to: this.otherParticipantId,
        status: 'sending'
      };

      // Actualizar estado inmediatamente
      runInAction(() => {
        this.messages = [tempMessage, ...this.messages];
      });

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

      // Actualizar el estado del mensaje a enviado
      runInAction(() => {
        const messageIndex = this.messages.findIndex(m => m.id === tempMessage.id);
        if (messageIndex !== -1) {
          this.messages[messageIndex] = {
            ...this.messages[messageIndex],
            status: 'sent'
          };
        }
      });
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      // En caso de error, actualizar el estado del mensaje
      runInAction(() => {
        const messageIndex = this.messages.findIndex(m => m.id === Date.now().toString());
        if (messageIndex !== -1) {
          this.messages[messageIndex] = {
            ...this.messages[messageIndex],
            status: 'error'
          };
        }
      });
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

  private async sendImage(imageAsset: any) {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const userDoc = await getUser(currentUser.uid);
      const userName = userDoc?.name || 'Usuario';

      // Crear mensaje temporal para actualización inmediata
      const tempMessage: Message = {
        id: Date.now().toString(),
        type: 'image',
        imageUrl: imageAsset.uri || imageAsset.path,
        senderId: currentUser.uid,
        createdAt: new Date(),
        fromName: userName,
        to: this.otherParticipantId,
        text: '', // Campo requerido por Message
        status: 'sending'
      };

      // Actualizar estado inmediatamente
      runInAction(() => {
        this.messages = [tempMessage, ...this.messages];
      });

      // Subir imagen a Firebase Storage
      const imageUrl = await uploadChatImage(this.chatId, {
        path: imageAsset.uri || imageAsset.path,
        type: imageAsset.type,
        fileName: imageAsset.fileName
      });

      // Enviar mensaje con la URL de Firebase
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

      // Actualizar el mensaje con la URL final y el estado de enviado
      runInAction(() => {
        const messageIndex = this.messages.findIndex(m => m.id === tempMessage.id);
        if (messageIndex !== -1) {
          this.messages[messageIndex] = {
            ...this.messages[messageIndex],
            imageUrl,
            status: 'sent'
          };
        }
      });

      // Guardar imagen localmente después de enviar el mensaje
      await CacheService.saveChatImage(this.chatId, imageUrl);

    } catch (error) {
      console.error('Error al enviar imagen:', error);
      // En caso de error, actualizar el estado del mensaje
      runInAction(() => {
        const messageIndex = this.messages.findIndex(m => m.id === Date.now().toString());
        if (messageIndex !== -1) {
          this.messages[messageIndex] = {
            ...this.messages[messageIndex],
            status: 'error'
          };
        }
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