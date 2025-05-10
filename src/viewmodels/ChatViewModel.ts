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
  query
} from '@react-native-firebase/firestore';
import { Message, MessageModel } from '../models/Message';

export class ChatViewModel {
  messages: Message[] = [];
  newMessage: string = '';
  loading: boolean = true;
  chatId: string;
  otherParticipantId: string;
  otherParticipantName: string = '';

  constructor(chatId: string, otherParticipantId: string) {
    this.chatId = chatId;
    this.otherParticipantId = otherParticipantId;
    makeAutoObservable(this);
    this.loadMessages();
    this.loadOtherParticipantName();
  }

  private async loadOtherParticipantName() {
    try {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', this.otherParticipantId);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      
      runInAction(() => {
        this.otherParticipantName = userData?.name || 'Usuario';
      });
    } catch (error) {
      console.error('Error al cargar nombre del participante:', error);
      runInAction(() => {
        this.otherParticipantName = 'Usuario';
      });
    }
  }

  setNewMessage = (text: string) => {
    this.newMessage = text;
  }

  private loadMessages() {
    const db = getFirestore();
    const messagesRef = collection(db, 'chats', this.chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        runInAction(() => {
          this.messages = snapshot.docs.map(doc =>
            MessageModel.fromFirestore(doc.id, doc.data()),
          );
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

    return unsubscribe;
  }

  async sendMessage() {
    if (!this.newMessage.trim()) return;

    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const db = getFirestore();
      const messageData = {
        text: this.newMessage.trim(),
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      };

      const messagesRef = collection(db, 'chats', this.chatId, 'messages');
      await addDoc(messagesRef, messageData);

      const chatRef = doc(db, 'chats', this.chatId);
      await updateDoc(chatRef, {
        lastMessage: {
          text: this.newMessage.trim(),
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      runInAction(() => {
        this.newMessage = '';
      });
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  }

  isOwnMessage(message: Message): boolean {
    const auth = getAuth();
    return message.senderId === auth.currentUser?.uid;
  }
} 