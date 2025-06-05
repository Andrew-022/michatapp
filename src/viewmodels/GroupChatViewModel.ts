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
  canDeleteGroupMessage,
  markGroupMessageAsRead
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
    this.unsubscribe = loadGroupMessages(
      this.groupId,
      async (newMessages) => {
        try {
          // Obtener mensajes del caché
          const cachedMessages = await CacheService.getChatMessages(this.groupId) || [];
          
          // Procesar solo los mensajes nuevos
          const processedNewMessages = await Promise.all(newMessages
            .filter(newMsg => !cachedMessages.some(cachedMsg => cachedMsg.id === newMsg.id))
            .map(async doc => {
              const data = doc;
              if (data.type === 'image' && data.imageUrl) {
                // Guardar imagen localmente
                const localPath = await CacheService.saveImageLocally(data.imageUrl, this.groupId);
                if (localPath) {
                  // Actualizar la URL de la imagen a la local
                  return {
                    ...data,
                    imageUrl: localPath
                  };
                }
              }
              const decryptedText = this.decryptMessage(data.text);
              return {
                ...data,
                text: decryptedText
              };
            }));

          // Combinar mensajes del caché con los nuevos y ordenar por fecha (más recientes primero)
          const allMessages = [...cachedMessages, ...processedNewMessages].sort((a, b) => {
            const dateA = a.createdAt?.getTime() || 0;
            const dateB = b.createdAt?.getTime() || 0;
            return dateB - dateA;
          });

          // Guardar todos los mensajes en caché
          await CacheService.saveChatMessages(this.groupId, allMessages);

          // Marcar mensajes como leídos
          const auth = getAuth();
          const currentUserId = auth.currentUser?.uid;
          
          if (currentUserId) {
            // Filtrar mensajes que necesitan ser marcados como leídos
            const messagesToMarkAsRead = newMessages.filter(message => {
              const readBy = message.readBy || {};
              return !readBy[currentUserId];
            });

            // Marcar mensajes como leídos en lotes de 10
            const batchSize = 10;
            for (let i = 0; i < messagesToMarkAsRead.length; i += batchSize) {
              const batch = messagesToMarkAsRead.slice(i, i + batchSize);
              await Promise.all(
                batch.map(message => markGroupMessageAsRead(this.groupId, message.id, currentUserId))
              );
            }

            // Verificar mensajes para eliminar
            for (const message of newMessages) {
              try {
                const canDelete = await canDeleteGroupMessage(this.groupId, message.id);
                if (canDelete) {
                  await processAndDeleteGroupMessage(message, this.groupId, currentUserId);
                }
              } catch (error) {
                console.error('Error al procesar mensaje:', error);
              }
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

  private async resetUnreadCount() {
    await resetGroupUnreadCount(this.groupId);
  }

  setNewMessage = (text: string) => {
    this.newMessage = text;
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
      const userDoc = await getUser(currentUser.uid);
      const userName = userDoc?.name || 'Usuario';

      // Crear objeto readBy con el remitente
      const readBy = { [currentUser.uid]: new Date() };

      // Crear mensaje temporal para actualización inmediata
      const tempMessage: Message = {
        id: Date.now().toString(),
        text: messageToSend,
        senderId: currentUser.uid,
        createdAt: new Date(),
        fromName: userName,
        groupId: this.groupId,
        readBy
      };

      // Actualizar estado inmediatamente
      runInAction(() => {
        this.messages = [tempMessage, ...this.messages];
      });

      // Enviar mensaje a Firestore
      await sendGroupMessage(
        this.groupId,
        messageToSend,
        currentUser.uid,
        this.participants,
        userName,
        readBy
      );
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      // En caso de error, revertir el mensaje temporal
      runInAction(() => {
        this.messages = this.messages.filter(m => m.id !== Date.now().toString());
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
      runInAction(() => {
        this.uploadingImage = true;
      });

      const userDoc = await getUser(currentUser.uid);
      const userName = userDoc?.name || 'Usuario';

      // Subir imagen a Firebase Storage
      const imageUrl = await uploadChatImage(this.groupId, {
        path: imageAsset.uri || imageAsset.path,
        type: imageAsset.type,
        fileName: imageAsset.fileName
      }, true);

      // Guardar imagen localmente
      const localPath = await CacheService.saveImageLocally(imageUrl, this.groupId);
      
      // Crear objeto readBy con el remitente
      const readBy = { [currentUser.uid]: new Date() };

      // Crear mensaje temporal para actualización inmediata
      const tempMessage: Message = {
        id: Date.now().toString(),
        type: 'image',
        imageUrl: localPath || imageUrl,
        senderId: currentUser.uid,
        createdAt: new Date(),
        fromName: userName,
        groupId: this.groupId,
        text: '',
        readBy
      };

      // Actualizar estado inmediatamente
      runInAction(() => {
        this.messages = [tempMessage, ...this.messages];
      });
      
      // Enviar mensaje con la URL de Firebase
      await sendGroupImage(
        this.groupId,
        imageUrl,
        currentUser.uid,
        this.participants,
        {
          fromName: userName,
          to: this.groupId
        },
        readBy
      );

    } catch (error) {
      console.error('Error al enviar imagen:', error);
      // En caso de error, revertir el mensaje temporal
      runInAction(() => {
        this.messages = this.messages.filter(m => m.id !== Date.now().toString());
      });
    } finally {
      runInAction(() => {
        this.uploadingImage = false;
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
      const auth = getAuth();
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return;

      // Verificar si todos han leído el mensaje
      const canDelete = await canDeleteGroupMessage(this.groupId, message.id);
      if (!canDelete) {
        Alert.alert(
          'No se puede eliminar',
          'Espera a que todos los participantes lean el mensaje antes de eliminarlo.'
        );
        return;
      }

      // Actualizar mensajes en caché
      const updatedMessages = this.messages.filter(m => m.id !== message.id);
      await CacheService.saveChatMessages(this.groupId, updatedMessages);
      
      // Eliminar mensaje y su imagen si existe
      await processAndDeleteGroupMessage(message, this.groupId, currentUserId);
      
      runInAction(() => {
        this.messages = updatedMessages;
      });
    } catch (error) {
      console.error('Error al eliminar mensaje:', error);
    }
  }

  // Marcar mensaje como leído cuando se visualiza
  async markMessageAsRead(messageId: string) {
    try {
      const auth = getAuth();
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return;

      await markGroupMessageAsRead(this.groupId, messageId, currentUserId);
    } catch (error) {
      console.error('Error al marcar mensaje como leído:', error);
    }
  }
}