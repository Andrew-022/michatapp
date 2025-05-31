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
  getUser
} from '../services/firestore';

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

  constructor(groupId: string) {
    this.groupId = groupId;
    this.encryptionKey = this.generateGroupKey(groupId);
    makeAutoObservable(this);
    this.initialize();
    this.resetUnreadCount();
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
      const groupInfo = await loadGroupInfo(this.groupId);
      const participantsInfo = await loadParticipantsInfo(groupInfo.participants);
      
      runInAction(() => {
        this.groupName = groupInfo.name;
        this.groupPhotoURL = groupInfo.photoURL;
        this.participants = participantsInfo;
      });

      this.loadMessages();
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
      (messages) => {
        runInAction(() => {
          this.messages = messages.map(msg => ({
            ...msg,
            text: this.decryptMessage(msg.text)
          }));
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
  }
}