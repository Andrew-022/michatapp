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
  sendChatImage
} from '../services/firestore';
import { setCurrentChatId } from '../../App';
import { CacheService } from '../services/cache';
import * as ImagePicker from 'react-native-image-picker';

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

          // Combinar mensajes del caché con los nuevos
          const allMessages = [...cachedMessages, ...processedNewMessages].sort((a, b) => {
            // Convertir timestamps a fechas
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB.getTime() - dateA.getTime();
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

      await sendGroupMessage(
        this.groupId,
        messageToSend,
        currentUser.uid,
        this.participants,
        userName
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
      });

      // Guardar imagen localmente
      const localPath = await CacheService.saveImageLocally(imageUrl, this.groupId);
      
      // Enviar mensaje con la URL de Firebase
      await sendChatImage(
        this.groupId,
        imageUrl,
        currentUser.uid,
        this.participants.map(p => p.id).join(','),
        {
          fromName: userName,
          to: this.groupId
        }
      );

      // Guardar mensaje en caché con la ruta local
      const newMessage = MessageModel.fromFirestore(Date.now().toString(), {
        type: 'image',
        imageUrl: localPath || imageUrl,
        senderId: currentUser.uid,
        createdAt: new Date(),
        fromName: userName,
        groupId: this.groupId,
        text: '' // Campo requerido por Message
      });

      // Actualizar mensajes en caché
      const cachedMessages = await CacheService.getChatMessages(this.groupId) || [];
      const updatedMessages = [...cachedMessages, newMessage];
      
      await CacheService.saveChatMessages(this.groupId, updatedMessages);

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
}