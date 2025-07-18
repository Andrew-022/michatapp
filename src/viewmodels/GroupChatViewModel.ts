import { makeAutoObservable, runInAction } from 'mobx';
import { getAuth } from '@react-native-firebase/auth';
import { Message, MessageModel } from '../models/Message';
import CryptoJS from 'crypto-js';
import { 
  loadGroupInfo, 
  loadParticipantsInfo, 
  loadGroupMessages, 
  resetGroupUnreadCount, 
  sendGroupMessage,
  getUser,
  uploadChatImage,
  sendChatImage,
  sendGroupImage,
  processAndDeleteGroupMessage,
  markMessagesAsRead
} from '../services/firestore';
import { setCurrentChatId } from '../../App';
import { CacheService } from '../services/cache';
import * as ImagePicker from 'react-native-image-picker';
import { Alert } from 'react-native';

export class GroupChatViewModel {
  messages: Message[] = [];
  newMessage: string = '';
  loading: boolean = true;
  groupId: string;
  groupName: string = '';
  groupPhotoURL: string | undefined;
  participants: { id: string; name: string }[] = [];
  private readonly encryptionKey: string;
  private unsubscribe: (() => void) | null = null;
  private lastSyncTime: Date | null = null;
  uploadingImage: boolean = false;
  replyingTo: Message | null = null;

  constructor(groupId: string) {
    this.groupId = groupId;
    this.encryptionKey = this.generateGroupKey(groupId);
    makeAutoObservable(this);
    this.initialize();
  }

  private generateGroupKey(groupId: string): string {
    return groupId;
  }

  private decryptMessage(encryptedText: string): string {
    try {
      const key = this.encryptionKey;
      const decrypted = CryptoJS.AES.decrypt(encryptedText, key);
      const text = decrypted.toString(CryptoJS.enc.Utf8);
      return text || 'Mensaje cifrado';
    } catch (error) {
      console.error('Error al descifrar mensaje:', error);
      return 'Mensaje cifrado';
    }
  }

  private async initialize() {
    try {
      // Cargar mensajes desde caché primero
      const cachedMessages = await CacheService.getChatMessages(this.groupId);
      if (cachedMessages) {
        runInAction(() => {
          this.messages = cachedMessages;
          this.loading = false;
        });
      }

      const groupInfo = await loadGroupInfo(this.groupId);
      const participantsInfo = await loadParticipantsInfo(groupInfo.participants);
      
      runInAction(() => {
        this.groupName = groupInfo.name;
        this.groupPhotoURL = groupInfo.photoURL;
        this.participants = participantsInfo;
      });

      this.loadMessages();
      await this.resetUnreadCount();
      setCurrentChatId(this.groupId);
    } catch (error) {
      console.error('Error al inicializar el chat grupal:', error);
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  private loadMessages() {
    let isProcessing = false;

    this.unsubscribe = loadGroupMessages(
      this.groupId,
      async (newMessages) => {
        // Evitar procesamiento simultáneo
        if (isProcessing) {
          console.log('Ya hay un proceso en curso, ignorando nuevos mensajes');
          return;
        }

        try {
          isProcessing = true;
          console.log('Empezando a cargar mensajes del grupo', newMessages.length);
          
          // Obtener mensajes del caché
          const cachedMessages = await CacheService.getChatMessages(this.groupId) || [];
          
          // Si no hay mensajes nuevos ni en caché, actualizar el estado de carga
          if (newMessages.length === 0 && cachedMessages.length === 0) {
            runInAction(() => {
              this.loading = false;
            });
            return;
          }

          // Filtrar mensajes propios de los nuevos mensajes
          const auth = getAuth();
          const currentUserId = auth.currentUser?.uid;
          const filteredNewMessages = newMessages.filter(msg => msg.senderId !== currentUserId);

          // Crear un Set para mantener IDs únicos
          const messageIds = new Set<string>();
          this.messages.forEach(msg => messageIds.add(msg.id));

          // Filtrar solo mensajes nuevos que no están en caché ni en mensajes actuales
          const uniqueNewMessages = filteredNewMessages.filter(
            newMsg => !cachedMessages.some(cachedMsg => cachedMsg.id === newMsg.id) && 
                     !messageIds.has(newMsg.id)
          );

          if (uniqueNewMessages.length === 0) {
            runInAction(() => {
              this.messages = [...this.messages, ...cachedMessages.filter(msg => !messageIds.has(msg.id))];
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

              const messageData = {
                ...data,
                createdAt: data.createdAt instanceof Date ? data.createdAt : new Date()
              };

              if (data.type === 'image' && data.imageUrl) {
                // Guardar imagen localmente
                const localPath = await CacheService.saveImageLocally(data.imageUrl, this.groupId);
                if (localPath) {
                  // Actualizar la URL de la imagen a la local
                  let processedMessage = {
                    ...messageData,
                    imageUrl: localPath
                  };

                  // Si hay texto, intentar descifrarlo
                  if (data.text) {
                    try {
                      const decryptedText = this.decryptMessage(data.text);
                      processedMessage = {
                        ...processedMessage,
                        text: decryptedText
                      };
                    } catch (error) {
                      console.error('Error al descifrar mensaje de imagen:', error);
                    }
                  }

                  return processedMessage;
                }
              }

              // Solo intentar descifrar si hay texto
              if (data.text) {
                try {
                  const decryptedText = this.decryptMessage(data.text);
                  return {
                    ...messageData,
                    text: decryptedText
                  };
                } catch (error) {
                  console.error('Error al descifrar mensaje:', error);
                  // Si falla el descifrado, devolver el mensaje sin descifrar
                  return messageData;
                }
              }

              // Si no hay texto ni imagen, devolver el mensaje tal cual
              return messageData;
            } catch (error) {
              console.error('Error al procesar mensaje:', error);
              return null;
            }
          }));

          // Filtrar mensajes nulos
          const validNewMessages = processedNewMessages.filter((msg): msg is Message => msg !== null);
          
          // Filtrar mensajes en caché que no estén en los mensajes actuales
          const otherCachedMessages = cachedMessages.filter(msg => !messageIds.has(msg.id));
          
          // Combinar todos los mensajes
          const allMessages = [...this.messages, ...otherCachedMessages, ...validNewMessages];

          // Ordenar mensajes por fecha de creación (más recientes primero)
          allMessages.sort((a, b) => {
            const dateA = a.createdAt?.getTime() || 0;
            const dateB = b.createdAt?.getTime() || 0;
            return dateB - dateA;
          });

          // Guardar todos los mensajes en caché
          await CacheService.saveChatMessages(this.groupId, allMessages);

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

  private async resetUnreadCount() {
    await resetGroupUnreadCount(this.groupId);
  }

  setNewMessage = (text: string) => {
    this.newMessage = text;
  }

  setReplyingTo = (message: Message | null) => {
    this.replyingTo = message;
  }

  cancelReply = () => {
    this.replyingTo = null;
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
        to: this.groupId,
        status: 'sending',
        replyTo: this.replyingTo?.id,
        replyToText: this.replyingTo?.text,
        replyToType: this.replyingTo?.type
      };

      // Actualizar estado inmediatamente
      runInAction(() => {
        this.messages = [tempMessage, ...this.messages];
      });

      // Guardar una referencia al mensaje al que estamos respondiendo
      const replyingToMessage = this.replyingTo;

      // Enviar mensaje a Firestore
      const firestoreMessageId = await sendGroupMessage(
        this.groupId,
        messageToSend,
        currentUser.uid,
        this.participants,
        userName,
        replyingToMessage ? {
          replyTo: replyingToMessage.id,
          replyToText: replyingToMessage.text,
          replyToType: replyingToMessage.type
        } : undefined
      );

      // Limpiar el mensaje al que se está respondiendo después de enviar
      runInAction(() => {
        this.replyingTo = null;
      });

      // Actualizar el estado del mensaje a enviado y actualizar el ID
      runInAction(() => {
        const messageIndex = this.messages.findIndex(m => m.id === tempMessage.id);
        if (messageIndex !== -1) {
          const updatedMessages = [...this.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            id: firestoreMessageId,
            status: 'sent'
          };
          this.messages = updatedMessages;
        }
      });

      // Guardar mensajes actualizados en caché
      await CacheService.saveChatMessages(this.groupId, this.messages);

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

  async sendImage(imageAsset: any, message: string = '') {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const id_temp = Date.now().toString();
    if (!currentUser) return;

    try {
      const userDoc = await getUser(currentUser.uid);
      const userName = userDoc?.name || 'Usuario';

      // Cifrar el mensaje si existe
      let encryptedText = '';
      if (message && message.trim()) {
        try {
          encryptedText = CryptoJS.AES.encrypt(message.trim(), this.encryptionKey).toString();
        } catch (error) {
          console.error('Error al cifrar mensaje:', error);
        }
      }

      // Crear mensaje temporal para actualización inmediata con la imagen local
      const tempMessage: Message = {
        id: id_temp,
        type: 'image',
        imageUrl: imageAsset.uri || imageAsset.path,
        senderId: currentUser.uid,
        createdAt: new Date(),
        fromName: userName,
        groupId: this.groupId,
        text: message.trim(), // Guardamos el texto sin cifrar en el mensaje temporal
        status: 'sending',
        replyTo: this.replyingTo?.id,
        replyToText: this.replyingTo?.text,
        replyToType: this.replyingTo?.type
      };

      // Actualizar estado inmediatamente
      runInAction(() => {
        this.messages = [tempMessage, ...this.messages];
      });

      // Guardar una referencia al mensaje al que estamos respondiendo
      const replyingToMessage = this.replyingTo;

      // Continuar con el proceso de envío en segundo plano
      (async () => {
        try {
          // Subir imagen a Firebase Storage
          const imageUrl = await uploadChatImage(this.groupId, {
            path: imageAsset.uri || imageAsset.path,
            type: imageAsset.type,
            fileName: imageAsset.fileName
          }, true);

          // Guardar imagen localmente
          const localPath = await CacheService.saveImageLocally(imageUrl, this.groupId);
          
          // Enviar mensaje con la URL de Firebase
          const firestoreMessageId = await sendGroupImage(
            this.groupId,
            imageUrl,
            currentUser.uid,
            this.participants,
            {
              fromName: userName,
              to: this.groupId,
              text: encryptedText, // Enviamos el texto cifrado
              ...(replyingToMessage ? {
                replyTo: replyingToMessage.id,
                replyToText: replyingToMessage.text,
                replyToType: replyingToMessage.type
              } : {})
            }
          );

          // Limpiar el mensaje al que se está respondiendo después de enviar
          runInAction(() => {
            this.replyingTo = null;
          });

          // Actualizar el estado del mensaje a enviado y actualizar el ID
          runInAction(() => {
            const messageIndex = this.messages.findIndex(m => m.id === tempMessage.id);
            if (messageIndex !== -1) {
              const updatedMessages = [...this.messages];
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                id: firestoreMessageId,
                status: 'sent'
              };
              this.messages = updatedMessages;
            }
          });

          // Guardar mensajes actualizados en caché
          await CacheService.saveChatMessages(this.groupId, this.messages);

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
      })();
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

  isOwnMessage(message: Message): boolean {
    const auth = getAuth();
    return message.senderId === auth.currentUser?.uid;
  }

  getParticipantName(senderId: string): string {
    const participant = this.participants.find(p => p.id === senderId);
    return participant?.name || 'Usuario';
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.resetUnreadCount();
    setCurrentChatId(null);
  }

  async deleteMessage(message: Message) {
    try {
      // Actualizar mensajes en caché
      const updatedMessages = this.messages.filter(m => m.id !== message.id);
      await CacheService.saveChatMessages(this.groupId, updatedMessages);
      
      runInAction(() => {
        this.messages = updatedMessages;
      });
    } catch (error) {
      console.error('Error al eliminar mensaje:', error);
      Alert.alert(
        'Error',
        'No se pudo eliminar el mensaje. Por favor, inténtalo de nuevo.'
      );
    }
  }

  // Marcar mensaje como leído cuando se visualiza
  async markMessageAsRead(messageId: string) {
    try {
      const auth = getAuth();
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return;

      await markMessagesAsRead(this.groupId, true);
    } catch (error) {
      console.error('Error al marcar mensaje como leído:', error);
    }
  }
}