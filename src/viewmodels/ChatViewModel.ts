import 'react-native-get-random-values';  // Importar primero
import { makeAutoObservable, runInAction } from 'mobx';
import { getAuth } from '@react-native-firebase/auth';
import { Message, MessageModel } from '../models/Message';
import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';
import {
  loadOtherParticipantInfo,
  resetChatUnreadCount,
  subscribeToChatMessages,
  sendChatMessage,
  decryptMessage,
  getUser
} from '../services/firestore';

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
    this.loadMessages();
    this.loadOtherParticipantInfo();
    this.resetUnreadCount();
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

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.resetUnreadCount();
  }

  isOwnMessage(message: Message): boolean {
    const auth = getAuth();
    return message.senderId === auth.currentUser?.uid;
  }
} 