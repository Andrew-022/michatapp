import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, increment, getDocs } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { User, UserModel } from '../models/User';
import { Chat, ChatModel } from '../models/Chat';
import { GroupChatModel } from '../models/GroupChat';
import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';

// Inicializar Firestore con configuración específica
const db = getFirestore();

// Colecciones
export const COLLECTIONS = {
  USERS: 'users',
  MESSAGES: 'messages',
  CHATS: 'chats',
  GROUP_CHATS: 'groupChats',
};

// Funciones de usuario
export const createUser = async (userId: string, userData: any) => {
  try {
    await setDoc(doc(db, COLLECTIONS.USERS, userId), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
};

export const getUser = async (userId: string) => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, userData: Partial<User>) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      ...userData,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    throw error;
  }
};

// Funciones de chat
export const createChat = async (participants: string[]) => {
  try {
    const chatRef = await addDoc(collection(db, COLLECTIONS.CHATS), {
      participants,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return chatRef.id;
  } catch (error) {
    console.error('Error al crear chat:', error);
    throw error;
  }
};

export const sendMessage = async (chatId: string, message: any) => {
  try {
    await addDoc(collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES), {
      ...message,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    throw error;
  }
};

// Funciones de grupo
export const createGroupChat = async (groupData: any) => {
  try {
    const groupRef = await addDoc(collection(db, COLLECTIONS.GROUP_CHATS), {
      ...groupData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return groupRef.id;
  } catch (error) {
    console.error('Error al crear grupo:', error);
    throw error;
  }
};

export const updateGroupChat = async (groupId: string, groupData: any) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.GROUP_CHATS, groupId), {
      ...groupData,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error al actualizar grupo:', error);
    throw error;
  }
};

// Funciones de mensajes no leídos
export const markMessagesAsRead = async (chatId: string, isGroup: boolean = false) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const collectionName = isGroup ? COLLECTIONS.GROUP_CHATS : COLLECTIONS.CHATS;
    await updateDoc(doc(db, collectionName, chatId), {
      [`unreadCount.${currentUser.uid}`]: 0
    });
    return true;
  } catch (error) {
    console.error('Error al marcar mensajes como leídos:', error);
    throw error;
  }
};

export const incrementUnreadCount = async (chatId: string, isGroup: boolean = false) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const collectionName = isGroup ? COLLECTIONS.GROUP_CHATS : COLLECTIONS.CHATS;
    const chatRef = doc(db, collectionName, chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (chatDoc.exists()) {
      const data = chatDoc.data();
      const currentCount = data?.unreadCount?.[currentUser.uid] || 0;
      
      await updateDoc(chatRef, {
        [`unreadCount.${currentUser.uid}`]: currentCount + 1
      });
    }
    return true;
  } catch (error) {
    console.error('Error al incrementar contador de mensajes no leídos:', error);
    throw error;
  }
};

// Funciones de suscripción
export const subscribeToMessages = (chatId: string, callback: (messages: any[]) => void) => {
  const messagesQuery = query(
    collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(messagesQuery, snapshot => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(messages);
  });
};

export const subscribeToUserChats = (userId: string, callback: (chats: any[]) => void) => {
  const chatsQuery = query(
    collection(db, COLLECTIONS.CHATS),
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(chatsQuery, snapshot => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(chats);
  });
};

export const subscribeToGroupChats = (userId: string, callback: (groups: any[]) => void) => {
  const groupsQuery = query(
    collection(db, COLLECTIONS.GROUP_CHATS),
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(groupsQuery, snapshot => {
    const groups = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(groups);
  });
};

// Función de utilidad para descifrar mensajes
export const decryptMessage = (encryptedText: string, key: string): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key);
    const text = decrypted.toString(CryptoJS.enc.Utf8);
    return text || 'Mensaje cifrado';
  } catch (error) {
    console.error('Error al descifrar mensaje:', error);
    return 'Mensaje cifrado';
  }
};

// Funciones específicas de ChatViewModel
export const loadOtherParticipantInfo = async (otherParticipantId: string) => {
  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, otherParticipantId);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    
    return {
      name: userData?.name || 'Usuario',
      photoURL: userData?.photoURL,
    };
  } catch (error) {
    console.error('Error al cargar información del participante:', error);
    return {
      name: 'Usuario',
      photoURL: undefined,
    };
  }
};

export const resetChatUnreadCount = async (chatId: string) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    await updateDoc(chatRef, {
      [`unreadCount.${currentUser.uid}`]: 0
    });
  } catch (error) {
    console.error('Error al reiniciar contador de mensajes no leídos:', error);
  }
};

export const subscribeToChatMessages = (
  chatId: string, 
  onMessagesUpdate: (messages: any[]) => void,
  onError: (error: any) => void
) => {
  const messagesRef = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
  const q = query(messagesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    snapshot => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      onMessagesUpdate(messages);
    },
    error => {
      console.error('Error al cargar mensajes:', error);
      onError(error);
    }
  );
};

export const sendChatMessage = async (
  chatId: string, 
  messageText: string, 
  senderId: string, 
  otherParticipantId: string
) => {
  try {
    const db = getFirestore();
    const encryptedText = CryptoJS.AES.encrypt(messageText, chatId).toString();
    
    const messageData = {
      text: encryptedText,
      senderId: senderId,
      createdAt: serverTimestamp(),
    };

    const messagesRef = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
    await addDoc(messagesRef, messageData);

    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: encryptedText,
        createdAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
      [`unreadCount.${otherParticipantId}`]: increment(1)
    });

    return true;
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    throw error;
  }
};

// Funciones específicas de ContactListViewModel
export const findUserByPhoneNumber = async (phoneNumbers: string[]): Promise<string | null> => {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const usersSnapshot = await getDocs(usersRef);
    
    for (const contactNumber of phoneNumbers) {
      const matchingUser = usersSnapshot.docs.find(doc => {
        const dbNumber = doc.data().phoneNumber;
        return dbNumber.endsWith(contactNumber);
      });

      if (matchingUser) {
        return matchingUser.id;
      }
    }
    return null;
  } catch (error) {
    console.error('Error al buscar usuario por número:', error);
    return null;
  }
};

export const findExistingChat = async (currentUserId: string, otherUserId: string): Promise<string | null> => {
  try {
    const chatsRef = collection(db, COLLECTIONS.CHATS);
    const chatsQuery = query(
      chatsRef,
      where('participants', 'array-contains', currentUserId)
    );
    const existingChat = await getDocs(chatsQuery);

    const chat = existingChat.docs.find(doc => {
      const data = doc.data();
      return data.participants.includes(otherUserId);
    });

    return chat ? chat.id : null;
  } catch (error) {
    console.error('Error al buscar chat existente:', error);
    return null;
  }
};

export const createNewChat = async (currentUserId: string, otherUserId: string): Promise<string> => {
  try {
    const newChatRef = await addDoc(collection(db, COLLECTIONS.CHATS), {
      participants: [currentUserId, otherUserId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: {
        text: '',
        createdAt: serverTimestamp(),
      },
      unreadCount: {
        [currentUserId]: 0,
        [otherUserId]: 0
      }
    });

    return newChatRef.id;
  } catch (error) {
    console.error('Error al crear nuevo chat:', error);
    throw error;
  }
};

export const startChatWithContact = async (
  currentUserId: string,
  contactPhoneNumbers: string[]
): Promise<{ chatId: string; otherParticipantId: string | null }> => {
  try {
    // Buscar usuario por número de teléfono
    const matchingUserId = await findUserByPhoneNumber(contactPhoneNumbers);
    
    if (!matchingUserId) {
      return {
        chatId: '',
        otherParticipantId: null,
      };
    }

    // Buscar chat existente
    const existingChatId = await findExistingChat(currentUserId, matchingUserId);
    
    if (existingChatId) {
      return {
        chatId: existingChatId,
        otherParticipantId: matchingUserId,
      };
    }

    // Crear nuevo chat
    const newChatId = await createNewChat(currentUserId, matchingUserId);
    
    return {
      chatId: newChatId,
      otherParticipantId: matchingUserId,
    };
  } catch (error) {
    console.error('Error al iniciar chat con contacto:', error);
    throw error;
  }
};

export const createGroup = async (groupData: {
  name: string;
  adminIds: string[];
  participants: string[];
  isPublic: boolean;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
}): Promise<{ success: boolean; groupId?: string; error?: string }> => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, error: 'No hay usuario autenticado' };
    }

    const db = getFirestore();
    const groupDataWithTimestamps = {
      ...groupData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: {
        text: '',
        createdAt: serverTimestamp(),
        senderId: currentUser.uid,
      },
      unreadCount: {
        [currentUser.uid]: 0,
        ...groupData.participants
          .filter(id => id !== currentUser.uid)
          .reduce((acc, userId) => ({
            ...acc,
            [userId]: 1
          }), {})
      }
    };

    const groupRef = await addDoc(collection(db, COLLECTIONS.GROUP_CHATS), groupDataWithTimestamps);
    return { success: true, groupId: groupRef.id };
  } catch (error) {
    console.error('Error al crear grupo:', error);
    return { success: false, error: 'No se pudo crear el grupo. Por favor intenta de nuevo.' };
  }
};

export default db;