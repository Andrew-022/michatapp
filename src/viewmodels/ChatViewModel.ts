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
    let isProcessing = false;

    this.unsubscribe = subscribeToChatMessages(
      this.chatId,
      async (newMessages) => {
        // Evitar procesamiento simultáneo
        if (isProcessing) {
          console.log('Ya hay un proceso en curso, ignorando nuevos mensajes');
          return;
        }

        try {
          isProcessing = true;
          console.log('Empezando a cargar mensajes', newMessages.length);
          for (const message of newMessages) {
            console.log('Documento:', {
              id: message.id,
              path: message.ref?.path,
              data: message.data,
              exists: message.exists,
              metadata: message.metadata
            });
          }
          // Filtrar solo mensajes nuevos
          const auth = getAuth();
          const currentUserId = auth.currentUser?.uid;
          const filteredNewMessages = newMessages.filter(msg => msg.senderId !== currentUserId);

          if (filteredNewMessages.length === 0) {
            runInAction(() => {
              this.loading = false;
            });
            return;
          }

          // Obtener mensajes del caché
          const cachedMessages = await CacheService.getChatMessages(this.chatId) || [];
          
          // Crear un Set para mantener IDs únicos
          const messageIds = new Set<string>();
          this.messages.forEach(msg => messageIds.add(msg.id));

          // Verificar qué mensajes nuevos no están en caché
          const messagesToProcess = filteredNewMessages.filter(newMsg => {
            const existsInCache = cachedMessages.some(cachedMsg => cachedMsg.id === newMsg.id);
            const existsInCurrent = messageIds.has(newMsg.id);
            return !existsInCache && !existsInCurrent;
          });

          if (messagesToProcess.length === 0) {
            runInAction(() => {
              this.messages = [...this.messages, ...cachedMessages.filter(msg => !messageIds.has(msg.id))];
              this.loading = false;
            });
            return;
          }

          // Procesar mensajes secuencialmente
          const processedNewMessages: MessageModel[] = [];
          for (const doc of messagesToProcess) {
            try {
              const data = doc;
              if (!data) {
                console.log('Mensaje no encontrado en Firestore, probablemente ya fue leído y eliminado');
                continue;
              }

              let processedMessage;

              if (data.type === 'image') {
                // Guardar imagen localmente
                const localPath = await CacheService.saveImageLocally(data.imageUrl, this.chatId);
                if (localPath) {
                  // Crear mensaje con la URL local
                  processedMessage = MessageModel.fromFirestore(doc.id, {
                    ...data,
                    imageUrl: localPath
                  });
                } else {
                  // Si no se pudo guardar localmente, usar la URL de Firebase
                  processedMessage = MessageModel.fromFirestore(doc.id, data);
                }
              } else if (data.text) {
                try {
                  const decryptedText = decryptMessage(data.text, this.encryptionKey);
                  processedMessage = MessageModel.fromFirestore(doc.id, {
                    ...data,
                    text: decryptedText
                  });
                } catch (error) {
                  console.error('Error al descifrar mensaje:', error);
                  processedMessage = MessageModel.fromFirestore(doc.id, data);
                }
              } else {
                processedMessage = MessageModel.fromFirestore(doc.id, data);
              }

              if (processedMessage) {
                processedNewMessages.push(processedMessage);
                // Actualizar caché después de cada mensaje procesado
                const currentMessages = [...this.messages, ...cachedMessages.filter(msg => !messageIds.has(msg.id)), ...processedNewMessages];
                await CacheService.saveChatMessages(this.chatId, currentMessages);
              }
            } catch (error) {
              console.error('Error al procesar mensaje:', error);
            }
          }
          
          // Filtrar mensajes en caché que no estén en los mensajes actuales
          const otherCachedMessages = cachedMessages.filter(msg => !messageIds.has(msg.id));
          
          // Combinar todos los mensajes
          const allMessages = [...this.messages, ...otherCachedMessages, ...processedNewMessages];
          
          // Ordenar mensajes por fecha de creación (más recientes primero)
          allMessages.sort((a, b) => {
            const dateA = a.createdAt?.getTime() || 0;
            const dateB = b.createdAt?.getTime() || 0;
            return dateB - dateA;
          });

          // Guardar mensajes en caché
          await CacheService.saveChatMessages(this.chatId, allMessages);

          // Eliminar mensajes y sus imágenes de Firebase solo para mensajes nuevos
          for (const message of messagesToProcess) {
            try {
              if (message) {
                await processAndDeleteMessage(message, this.chatId, currentUserId || '');
              }
            } catch (error) {
              console.error('Error al procesar mensaje:', error);
            }
          }

          console.log('Mensajes cargados', allMessages);
          runInAction(() => {
            this.messages = allMessages;
            this.loading = false;
          });
        } catch (error) {
          console.error('Error al procesar mensajes:', error);
          runInAction(() => {
            this.loading = false;
          });
        } finally {
          isProcessing = false;
        }
      },
      (error) => {
        console.error('Error al cargar mensajes:', error);
        runInAction(() => {
          this.loading = false;
        });
        isProcessing = false;
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
          const updatedMessages = [...this.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            status: 'sent'
          };
          this.messages = updatedMessages;
        }
      });

      // Guardar mensajes actualizados en caché
      await CacheService.saveChatMessages(this.chatId, this.messages);

    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      // En caso de error, actualizar el estado del mensaje
      runInAction(() => {
        const messageIndex = this.messages.findIndex(m => m.id === Date.now().toString());
        if (messageIndex !== -1) {
          const updatedMessages = [...this.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            status: 'error'
          };
          this.messages = updatedMessages;
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
    const id_temp = Date.now().toString();
    if (!currentUser) return;
    try {
      const userDoc = await getUser(currentUser.uid);
      const userName = userDoc?.name || 'Usuario';

      // Crear mensaje temporal para actualización inmediata
      
      const tempMessage: Message = {
        id: id_temp,
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
          const updatedMessages = [...this.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            status: 'sent'
          };
          this.messages = updatedMessages;
        }
      });

      // Guardar imagen localmente después de enviar el mensaje
      //await CacheService.saveChatImage(this.chatId, imageUrl);
      
      // Guardar mensajes actualizados en caché
      await CacheService.saveChatMessages(this.chatId, this.messages);

    } catch (error) {
      console.error('Error al enviar imagen:', error);
      // En caso de error, actualizar el estado del mensaje
      runInAction(() => {
        const messageIndex = this.messages.findIndex(m => m.id === id_temp);
        if (messageIndex !== -1) {
          const updatedMessages = [...this.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            status: 'error'
          };
          this.messages = updatedMessages;
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