import { makeAutoObservable } from 'mobx';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Message, MessageModel } from '../models/Message';

export class ChatViewModel {
  messages: Message[] = [];
  newMessage: string = '';
  loading: boolean = true;
  chatId: string;
  otherParticipantId: string;

  constructor(chatId: string, otherParticipantId: string) {
    this.chatId = chatId;
    this.otherParticipantId = otherParticipantId;
    makeAutoObservable(this);
    this.loadMessages();
  }

  setNewMessage = (text: string) => {
    this.newMessage = text;
  }

  private loadMessages() {
    const unsubscribe = firestore()
      .collection('chats')
      .doc(this.chatId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          this.messages = snapshot.docs.map(doc =>
            MessageModel.fromFirestore(doc.id, doc.data()),
          );
          this.loading = false;
        },
        error => {
          console.error('Error al cargar mensajes:', error);
          this.loading = false;
        },
      );

    return unsubscribe;
  }

  async sendMessage() {
    if (!this.newMessage.trim()) return;

    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      const messageData = {
        text: this.newMessage.trim(),
        senderId: currentUser.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore()
        .collection('chats')
        .doc(this.chatId)
        .collection('messages')
        .add(messageData);

      await firestore().collection('chats').doc(this.chatId).update({
        lastMessage: {
          text: this.newMessage.trim(),
          createdAt: firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      this.newMessage = '';
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  }

  isOwnMessage(message: Message): boolean {
    return message.senderId === auth().currentUser?.uid;
  }
} 