import { makeAutoObservable, runInAction } from 'mobx';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { Chat, ChatModel } from '../models/Chat';
import { User, UserModel } from '../models/User';
import { createUser } from '../services/firestore';
import { GroupChatModel } from '../models/GroupChat';
import CryptoJS from 'crypto-js';

export class HomeViewModel {
  userData: User | null = null;
  chats: (Chat | GroupChatModel)[] = [];
  loading: boolean = true;

  constructor() {
    makeAutoObservable(this);
    this.loadUserData();
    this.loadAllChats();
  }

  private async loadUserData() {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newUser = new UserModel({
          id: currentUser.uid,
          phoneNumber: currentUser.phoneNumber,
          lastLogin: new Date(),
        });

        await setDoc(userDocRef, newUser.toFirestore());
        runInAction(() => {
          this.userData = newUser;
        });
      } else {
        runInAction(() => {
          this.userData = UserModel.fromFirestore(userDoc.id, userDoc.data());
        });
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }
  }

  private async loadAllChats() {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const db = getFirestore();

    // Cargar chats normales
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );

    // Cargar grupos
    const groupsQuery = query(
      collection(db, 'groupChats'),
      where('participants', 'array-contains', currentUser.uid)
    );

    // Escuchar ambos
    const unsubscribeChats = onSnapshot(
      chatsQuery,
      async snapshot => {
        const chats = await Promise.all(snapshot.docs.map(async docSnap => {
          const data = docSnap.data();
          const chat = ChatModel.fromFirestore(docSnap.id, data);
          const otherParticipantId = this.getOtherParticipantId(chat);
          let otherParticipantName = 'Usuario desconocido';
          let otherParticipantPhoto: string | undefined;
          
          if (otherParticipantId) {
            try {
              const userDocRef = doc(db, 'users', otherParticipantId);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const userData = userDoc.data();
                otherParticipantName = userData?.name || userData?.phoneNumber || 'Usuario';
                otherParticipantPhoto = userData?.photoURL;
              }
            } catch (e) {}
          }
          // Desencriptar el último mensaje si existe
          let lastMessage = chat.lastMessage;
          if (lastMessage && lastMessage.text) {
            lastMessage = {
              ...lastMessage,
              text: this.decryptMessage(lastMessage.text, chat.id)
            };
          }
          
          const chatWithData = { 
            ...chat, 
            otherParticipantName, 
            otherParticipantPhoto, 
            lastMessage,
            lastMessageTime: lastMessage?.createdAt,
            unreadCount: data.unreadCount?.[currentUser.uid] || 0
          };
          return chatWithData;
        }));
        this.updateCombinedChats(chats, null);
      }
    );

    const unsubscribeGroups = onSnapshot(
      groupsQuery,
      snapshot => {
        const groups = snapshot.docs.map(doc => {
          const data = doc.data();
          const group = GroupChatModel.fromFirestore(doc.id, data);
          // Desencriptar el último mensaje si existe
          let lastMessage = group.lastMessage;
          if (lastMessage && lastMessage.text) {
            lastMessage = {
              ...lastMessage,
              text: this.decryptMessage(lastMessage.text, group.id),
            };
          }
          return { 
            ...group, 
            lastMessage,
            lastMessageTime: lastMessage?.createdAt,
            photoURL: group.photoURL,
            unreadCount: data.unreadCount?.[currentUser.uid] || 0
          };
        });
        
        this.updateCombinedChats(null, groups);
      }
    );

    this._unsubscribes = [unsubscribeChats, unsubscribeGroups];
  }

  // Combina y ordena los chats y grupos
  private _chats: Chat[] = [];
  private _groups: GroupChatModel[] = [];
  private _unsubscribes: any[] = [];

  private updateCombinedChats(chats: Chat[] | null, groups: GroupChatModel[] | null) {
    if (chats !== null) this._chats = chats;
    if (groups !== null) this._groups = groups;

    runInAction(() => {
      this.chats = [...this._chats, ...this._groups].sort((a, b) => {
        const dateA = a.updatedAt || new Date(0);
        const dateB = b.updatedAt || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      this.loading = false;
    });
  }

  async signOut(): Promise<void> {
    try {
      const auth = getAuth();
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  }

  getOtherParticipantId(chat: Chat): string | undefined {
    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return undefined;
    return chat.participants.find(id => id !== currentUserId);
  }

  async getOtherParticipantName(chat: Chat): Promise<string> {
    const otherParticipantId = this.getOtherParticipantId(chat);
    if (!otherParticipantId) return '';

    try {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', otherParticipantId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return 'Usuario';
      }

      const userData = userDoc.data();
      if (!userData) {
        return 'Usuario';
      }

      const user = UserModel.fromFirestore(userDoc.id, userData);
      return user.name || user.phoneNumber || 'Usuario';
    } catch (error) {
      console.error('Error al obtener nombre del participante:', error);
      return 'Usuario';
    }
  }

  async createTestUser(): Promise<void> {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      await createUser(currentUser.uid, {
        phoneNumber: currentUser.phoneNumber?.replace('+', '') || '',
        name: "Usuario Nuevo",
        lastLogin: new Date(),
        photoURL: "https://i.pinimg.com/222x/57/70/f0/5770f01a32c3c53e90ecda61483ccb08.jpg"
      });
      
      // Recargar los datos del usuario
      await this.loadUserData();
    } catch (error) {
      console.error('Error al crear usuario de prueba:', error);
      throw error;
    }
  }

  private decryptMessage(encryptedText: string, key: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, key);
      const text = decrypted.toString(CryptoJS.enc.Utf8);
      return text || 'Mensaje cifrado';
    } catch (error) {
      console.error('Error al descifrar mensaje:', error);
      return 'Mensaje cifrado';
    }
  }

  formatLastMessageTime(timestamp: any): string {
    if (!timestamp) return '';
    
    let date: Date;
    try {
      // Si es un Timestamp de Firestore
      if (timestamp.toDate) {
        date = timestamp.toDate();
      } 
      // Si es un objeto Date
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Si es un string o número
      else {
        date = new Date(timestamp);
      }

      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === now.toDateString()) {
        // Hoy: mostrar solo la hora
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (date.toDateString() === yesterday.toDateString()) {
        // Ayer
        return 'Ayer';
      } else {
        // Otros días: mostrar fecha
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
      }
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return '';
    }
  }

  // Método para marcar mensajes como leídos
  async markMessagesAsRead(chatId: string, isGroup: boolean = false): Promise<void> {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const db = getFirestore();
    const collectionName = isGroup ? 'groupChats' : 'chats';
    const chatRef = doc(db, collectionName, chatId);

    try {
      await setDoc(chatRef, {
        unreadCount: {
          [currentUser.uid]: 0
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error al marcar mensajes como leídos:', error);
      throw error;
    }
  }

  // Método para incrementar el contador de mensajes no leídos
  async incrementUnreadCount(chatId: string, isGroup: boolean = false): Promise<void> {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const db = getFirestore();
    const collectionName = isGroup ? 'groupChats' : 'chats';
    const chatRef = doc(db, collectionName, chatId);

    try {
      const chatDoc = await getDoc(chatRef);
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        const currentCount = data.unreadCount?.[currentUser.uid] || 0;
        
        await setDoc(chatRef, {
          unreadCount: {
            [currentUser.uid]: currentCount + 1
          }
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error al incrementar contador de mensajes no leídos:', error);
      throw error;
    }
  }
} 