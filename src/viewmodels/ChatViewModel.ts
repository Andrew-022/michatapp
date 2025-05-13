import 'react-native-get-random-values';  // Importar primero
import { makeAutoObservable, runInAction } from 'mobx';
import { getAuth } from '@react-native-firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  increment
} from '@react-native-firebase/firestore';
import { Message, MessageModel } from '../models/Message';
import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';

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
    // Usamos solo el chatId como clave, así ambos usuarios tendrán la misma
    return chatId;
  }

  private encryptMessage(text: string): string {
    try {
      const key = this.encryptionKey;
      const encrypted = CryptoJS.AES.encrypt(text, key).toString();
      return encrypted;
    } catch (error) {
      console.error('Error al cifrar mensaje:', error);
      return text;
    }
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

  private async loadOtherParticipantInfo() {
    try {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', this.otherParticipantId);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      
      runInAction(() => {
        if (Platform.OS === 'ios') {
          // Configuraciones específicas de iOS
        }
        this.otherParticipantName = userData?.name || 'Usuario';
        this.otherParticipantPhoto = userData?.photoURL;
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
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const db = getFirestore();
      const chatRef = doc(db, 'chats', this.chatId);
      await updateDoc(chatRef, {
        [`unreadCount.${currentUser.uid}`]: 0
      });
    } catch (error) {
      console.error('Error al reiniciar contador de mensajes no leídos:', error);
    }
  }

  private loadMessages() {
    const db = getFirestore();
    const messagesRef = collection(db, 'chats', this.chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    this.unsubscribe = onSnapshot(
      q,
      snapshot => {
        runInAction(() => {
          this.messages = snapshot.docs.map(doc => {
            const data = doc.data();
            const decryptedText = this.decryptMessage(data.text);
            return MessageModel.fromFirestore(doc.id, {
              ...data,
              text: decryptedText
            });
          });
          this.loading = false;
        });
      },
      error => {
        console.error('Error al cargar mensajes:', error);
        runInAction(() => {
          this.loading = false;
        });
      },
    );

    return this.unsubscribe;
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
      const db = getFirestore();
      const encryptedText = this.encryptMessage(messageToSend);
      
      const messageData = {
        text: encryptedText,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      };

      const messagesRef = collection(db, 'chats', this.chatId, 'messages');
      await addDoc(messagesRef, messageData);

      const chatRef = doc(db, 'chats', this.chatId);
      await updateDoc(chatRef, {
        lastMessage: {
          text: encryptedText,
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
        [`unreadCount.${this.otherParticipantId}`]: increment(1)
      });
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