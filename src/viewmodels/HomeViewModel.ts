import { makeAutoObservable, runInAction } from 'mobx';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { Chat, ChatModel } from '../models/Chat';
import { User, UserModel } from '../models/User';
import { createUser } from '../services/firestore';

export class HomeViewModel {
  userData: User | null = null;
  chats: Chat[] = [];
  loading: boolean = true;

  constructor() {
    makeAutoObservable(this);
    this.loadUserData();
    this.loadChats();
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

  private loadChats() {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const db = getFirestore();
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      snapshot => {
        runInAction(() => {
          this.chats = snapshot.docs
            .map(doc => ChatModel.fromFirestore(doc.id, doc.data()))
            .sort((a, b) => {
              const dateA = a.updatedAt || new Date(0);
              const dateB = b.updatedAt || new Date(0);
              return dateB.getTime() - dateA.getTime();
            });
          this.loading = false;
        });
      },
      error => {
        console.error('Error al cargar chats:', error);
        runInAction(() => {
          this.loading = false;
        });
      }
    );

    return unsubscribe;
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
} 