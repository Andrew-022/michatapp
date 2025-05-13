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
import { GroupChat, GroupChatModel } from '../models/GroupChat';
import CryptoJS from 'crypto-js';

export class GroupChatViewModel {
  messages: Message[] = [];
  newMessage: string = '';
  loading: boolean = true;
  groupId: string;
  groupName: string = '';
  groupPhotoURL: string | undefined;
  participants: { id: string; name: string }[] = [];
  private readonly encryptionKey: string;

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

  private async initialize() {
    try {
      await this.loadGroupInfo();
      this.loadMessages();
    } catch (error) {
      console.error('Error al inicializar el chat grupal:', error);
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  private async loadGroupInfo() {
    try {
      const db = getFirestore();
      const groupDocRef = doc(db, 'groupChats', this.groupId);
      const groupDoc = await getDoc(groupDocRef);
      const groupData = groupDoc.data() as GroupChat;
      
      if (!groupData) {
        throw new Error('No se encontró información del grupo');
      }

      await this.loadParticipantsInfo(groupData.participants || []);
      
      runInAction(() => {
        this.groupName = groupData.name || 'Grupo';
        this.groupPhotoURL = groupData.photoURL;
      });
    } catch (error) {
      console.error('Error al cargar información del grupo:', error);
      throw error;
    }
  }

  private async loadParticipantsInfo(participantIds: string[]) {
    const db = getFirestore();
    const participantsInfo: { id: string; name: string }[] = [];

    for (const participantId of participantIds) {
      try {
        const userDoc = await getDoc(doc(db, 'users', participantId));
        const userData = userDoc.data();
        participantsInfo.push({
          id: participantId,
          name: userData?.name || 'Usuario'
        });
      } catch (error) {
        console.error('Error al cargar información del participante:', error);
      }
    }

    runInAction(() => {
      this.participants = participantsInfo;
    });
  }

  setNewMessage = (text: string) => {
    this.newMessage = text;
  }

  private loadMessages() {
    const db = getFirestore();
    const messagesRef = collection(db, 'groupChats', this.groupId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
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

    return unsubscribe;
  }

  private async resetUnreadCount() {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const db = getFirestore();
      const groupRef = doc(db, 'groupChats', this.groupId);
      await updateDoc(groupRef, {
        [`unreadCount.${currentUser.uid}`]: 0
      });
    } catch (error) {
      console.error('Error al reiniciar contador de mensajes no leídos:', error);
    }
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

      const messagesRef = collection(db, 'groupChats', this.groupId, 'messages');
      await addDoc(messagesRef, messageData);

      const groupRef = doc(db, 'groupChats', this.groupId);
      
      // Incrementar el contador para todos los participantes excepto el remitente
      const updates: any = {
        lastMessage: {
          text: encryptedText,
          createdAt: serverTimestamp(),
          senderId: currentUser.uid,
        },
        updatedAt: serverTimestamp(),
      };

      // Incrementar el contador para cada participante excepto el remitente
      this.participants.forEach(participant => {
        if (participant.id !== currentUser.uid) {
          updates[`unreadCount.${participant.id}`] = increment(1);
        }
      });

      await updateDoc(groupRef, updates);
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
    // Reiniciar el contador al salir del chat grupal
    this.resetUnreadCount();
  }
}