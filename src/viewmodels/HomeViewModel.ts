import { makeAutoObservable, runInAction, action } from 'mobx';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { Chat, ChatModel } from '../models/Chat';
import { User, UserModel } from '../models/User';
import { GroupChatModel } from '../models/GroupChat';
import {
  createUser,
  getUser,
  subscribeToUserChats,
  subscribeToGroupChats,
  decryptMessage,
  markMessagesAsRead,
  incrementUnreadCount,
  saveUserFCMToken
} from '../services/firestore';
import { Platform, PermissionsAndroid } from 'react-native';
import { getMessaging, getToken } from '@react-native-firebase/messaging';

export class HomeViewModel {
  userData: User | null = null;
  chats: (Chat | GroupChatModel)[] = [];
  loading: boolean = true;
  searchQuery: string = '';
  private _unsubscribes: (() => void)[] = [];
  private _allChats: (Chat | GroupChatModel)[] = [];

  constructor() {
    makeAutoObservable(this, {
      filterChats: action,
      setSearchQuery: action
    });
    this.loadUserData();
    this.loadAllChats();
    this.requestNotificationPermission();
    this.setupFCMTokenListener();
  }

  private async loadUserData() {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const userData = await getUser(currentUser.uid);
      if (!userData) {
        const newUser = new UserModel({
          id: currentUser.uid,
          phoneNumber: currentUser.phoneNumber,
          lastLogin: new Date(),
        });

        await createUser(currentUser.uid, newUser.toFirestore());
        runInAction(() => {
          this.userData = newUser;
        });
      } else {
        runInAction(() => {
          this.userData = UserModel.fromFirestore(currentUser.uid, userData);
        });
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }
  }

  private async getSenderName(senderId: string): Promise<string> {
    try {
      const userData = await getUser(senderId);
      if (!userData) {
        return 'Usuario';
      }
      return userData.name || userData.phoneNumber || 'Usuario';
    } catch (error) {
      console.error('Error al obtener nombre del remitente:', error);
      return 'Usuario';
    }
  }

  private loadAllChats() {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const unsubscribeChats = subscribeToUserChats(currentUser.uid, async (chats) => {
      const processedChats = await Promise.all(chats.map(async chat => {
        const chatModel = ChatModel.fromFirestore(chat.id, chat);
        const otherParticipantId = this.getOtherParticipantId(chatModel);
        let otherParticipantName = 'Usuario desconocido';
        let otherParticipantPhoto: string | undefined;
        
        if (otherParticipantId) {
          const userData = await getUser(otherParticipantId);
          if (userData) {
            otherParticipantName = userData.name || userData.phoneNumber || 'Usuario';
            otherParticipantPhoto = userData.photoURL;
          }
        }

        let lastMessage = chatModel.lastMessage;
        if (lastMessage && lastMessage.text && lastMessage.type !== 'image') {
          lastMessage = {
            ...lastMessage,
            text: decryptMessage(lastMessage.text, chat.id)
          };
        }
        
        return { 
          ...chatModel, 
          otherParticipantName, 
          otherParticipantPhoto, 
          lastMessage,
          lastMessageTime: lastMessage?.createdAt,
          unreadCount: chat.unreadCount?.[currentUser.uid] || 0
        };
      }));
      this.updateCombinedChats(processedChats, null);
    });

    const unsubscribeGroups = subscribeToGroupChats(currentUser.uid, async (groups) => {
      const processedGroups = await Promise.all(groups.map(async group => {
        const groupModel = GroupChatModel.fromFirestore(group.id, group);
        let lastMessage = groupModel.lastMessage;
        let senderName = '';
        
        if (lastMessage) {
          if (lastMessage.text && lastMessage.type !== 'image') {
            lastMessage = {
              ...lastMessage,
              text: decryptMessage(lastMessage.text, group.id),
            };
          }
          
          // Obtener el nombre del remitente del último mensaje
          if (lastMessage.senderId) {
            senderName = await this.getSenderName(lastMessage.senderId);
          }
        }
        
        return { 
          ...groupModel, 
          lastMessage,
          lastMessageTime: lastMessage?.createdAt,
          photoURL: groupModel.photoURL,
          unreadCount: group.unreadCount?.[currentUser.uid] || 0,
          lastMessageSenderName: senderName
        };
      }));
      
      this.updateCombinedChats(null, processedGroups);
    });

    this._unsubscribes = [unsubscribeChats, unsubscribeGroups];
  }

  // Combina y ordena los chats y grupos
  private _chats: Chat[] = [];
  private _groups: GroupChatModel[] = [];

  private updateCombinedChats(chats: Chat[] | null, groups: GroupChatModel[] | null) {
    if (chats !== null) this._chats = chats;
    if (groups !== null) this._groups = groups;

    runInAction(() => {
      this._allChats = [...this._chats, ...this._groups].sort((a, b) => {
        const dateA = a.updatedAt || new Date(0);
        const dateB = b.updatedAt || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      this.filterChats();
      this.loading = false;
    });
  }

  setSearchQuery = (query: string) => {
    this.searchQuery = query;
    this.filterChats();
  }

  filterChats = () => {
    if (!this.searchQuery.trim()) {
      this.chats = this._allChats;
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.chats = this._allChats.filter(chat => {
      if ('adminIds' in chat) {
        return chat.name.toLowerCase().includes(query);
      } else {
        const chatModel = chat as Chat;
        return (chatModel.otherParticipantName || '').toLowerCase().includes(query);
      }
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
      const userData = await getUser(otherParticipantId);
      if (!userData) {
        return 'Usuario';
      }

      const user = UserModel.fromFirestore(otherParticipantId, userData);
      return user.name || user.phoneNumber || 'Usuario';
    } catch (error) {
      console.error('Error al obtener nombre del participante:', error);
      return 'Usuario';
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

  async requestNotificationPermission(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        // Verificar si estamos en Android 13 o superior
        const androidVersion = Platform.Version;
        if (androidVersion >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Permiso de Notificaciones',
              message: 'La aplicación necesita acceso a las notificaciones para mantenerte informado de nuevos mensajes.',
              buttonNeutral: 'Preguntar más tarde',
              buttonNegative: 'Cancelar',
              buttonPositive: 'Aceptar',
            }
          );
          
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Permiso de notificaciones denegado');
            return;
          }
          
          console.log('Permiso de notificaciones concedido');
        }
        // En versiones anteriores de Android, no es necesario solicitar el permiso
        await this.saveFCMToken();
      } catch (error) {
        console.error('Error al solicitar permiso de notificaciones:', error);
        return;
      }
    } else {
      const messaging = getMessaging();
      const authStatus = await messaging.requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        await this.saveFCMToken();
      }
    }
  }

  private async saveFCMToken(): Promise<void> {
    try {
      const messaging = getMessaging();
      const token = await getToken(messaging);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        await saveUserFCMToken(currentUser.uid, token);
      }
    } catch (error) {
      console.error('Error al guardar token FCM:', error);
    }
  }

  private setupFCMTokenListener() {
    const messaging = getMessaging();
    messaging.onTokenRefresh(async (token) => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          await saveUserFCMToken(currentUser.uid, token);
          console.log('Token FCM actualizado exitosamente');
        } catch (error) {
          console.error('Error al actualizar token FCM:', error);
        }
      }
    });
  }
} 