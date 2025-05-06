import { makeAutoObservable } from 'mobx';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Chat, ChatModel } from '../models/Chat';
import { User, UserModel } from '../models/User';

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
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (!userDoc.exists) {
        const newUser = new UserModel({
          id: currentUser.uid,
          phoneNumber: currentUser.phoneNumber,
          lastLogin: new Date(),
        });

        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .set(newUser.toFirestore());

        this.userData = newUser;
      } else {
        this.userData = UserModel.fromFirestore(userDoc.id, userDoc.data());
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }
  }

  private loadChats() {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    const unsubscribe = firestore()
      .collection('chats')
      .where('participants', 'array-contains', currentUser.uid)
      .onSnapshot(
        snapshot => {
          this.chats = snapshot.docs
            .map(doc => ChatModel.fromFirestore(doc.id, doc.data()))
            .sort((a, b) => {
              const dateA = a.updatedAt || new Date(0);
              const dateB = b.updatedAt || new Date(0);
              return dateB.getTime() - dateA.getTime();
            });
          this.loading = false;
        },
        error => {
          console.error('Error al cargar chats:', error);
          this.loading = false;
        },
      );

    return unsubscribe;
  }

  async signOut(): Promise<void> {
    try {
      await auth().signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  }

  getOtherParticipantId(chat: Chat): string | undefined {
    const currentUserId = auth().currentUser?.uid;
    if (!currentUserId) return undefined;
    return chat.participants.find(id => id !== currentUserId);
  }

  async getOtherParticipantName(chat: Chat): Promise<string> {
    const otherParticipantId = this.getOtherParticipantId(chat);
    if (!otherParticipantId) return '';

    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(otherParticipantId)
        .get();

      if (!userDoc.exists) {
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
  
} 