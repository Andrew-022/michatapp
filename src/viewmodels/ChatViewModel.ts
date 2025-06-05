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
  sendChatImage
} from '../services/firestore';
import { setCurrentChatId } from '../../App';
import * as ImagePicker from 'react-native-image-picker';

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

  constructor(chatId: string, otherParticipantId: string) {
    this.chatId = chatId;
    this.otherParticipantId = otherParticipantId;
    this.encryptionKey = this.generateChatKey(chatId);
    makeAutoObservable(this);
    this.loadMessages();
    this.loadOtherParticipantInfo();
    this.resetUnreadCount();
    setCurrentChatId(chatId);
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

  private loadMessages() {
    this.unsubscribe = subscribeToChatMessages(
      this.chatId,
      (messages) => {
        runInAction(() => {
          this.messages = messages.map(doc => {
            const data = doc;
            // Solo descifrar si es un mensaje de texto
            if (data.type === 'image') {
              return MessageModel.fromFirestore(doc.id, data);
            }
            const decryptedText = decryptMessage(data.text, this.encryptionKey);
            return MessageModel.fromFirestore(doc.id, {
              ...data,
              text: decryptedText
            });
          });
          this.loading = false;
        });
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

      // Obtener el nombre del usuario desde Firestore
      const userDoc = await getUser(currentUser.uid);
      const userName = userDoc?.name || 'Usuario';

      // Subir la imagen y obtener la URL
      const imageUrl = await uploadChatImage(this.chatId, {
        path: imageAsset.uri || imageAsset.path,
        type: imageAsset.type,
        fileName: imageAsset.fileName
      });

      // Enviar el mensaje con la imagen
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
    } catch (error) {
      console.error('Error al enviar imagen:', error);
    } finally {
      runInAction(() => {
        this.uploadingImage = false;
      });
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