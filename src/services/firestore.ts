import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, increment, getDocs, deleteDoc, arrayUnion, arrayRemove } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import { User, UserModel } from '../models/User';
import { Chat, ChatModel } from '../models/Chat';
import { GroupChatModel } from '../models/GroupChat';
import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';
import { Message, MessageModel } from '../models/Message';
import Contacts from '@s77rt/react-native-contacts';
import { Image } from 'react-native';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@react-native-firebase/storage';

// Inicializar Firestore con configuración específica
const db = getFirestore();

// Colecciones
export const COLLECTIONS = {
  USERS: 'users',
  MESSAGES: 'messages',
  CHATS: 'chats',
  GROUP_CHATS: 'groupChats',
};

interface ImageAsset {
  path: string;
  type?: string;
  fileName?: string;
}

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
  otherParticipantId: string,
  notificationData: {
    fromName: string;
    to: string;
  }
) => {
  try {
    const db = getFirestore();
    const encryptedText = CryptoJS.AES.encrypt(messageText, chatId).toString();
    
    const messageData = {
      text: encryptedText,
      senderId: senderId,
      createdAt: serverTimestamp(),
      fromName: notificationData.fromName,
      to: notificationData.to
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

export const loadGroupInfo = async (groupId: string): Promise<{
  name: string;
  photoURL?: string;
  participants: string[];
}> => {
  try {
    const db = getFirestore();
    const groupDocRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    const groupDoc = await getDoc(groupDocRef);
    const groupData = groupDoc.data() as GroupChatModel;
    
    if (!groupData) {
      throw new Error('No se encontró información del grupo');
    }

    return {
      name: groupData.name || 'Grupo',
      photoURL: groupData.photoURL,
      participants: groupData.participants || []
    };
  } catch (error) {
    console.error('Error al cargar información del grupo:', error);
    throw error;
  }
};

export const loadParticipantsInfo = async (participantIds: string[]): Promise<{ id: string; name: string }[]> => {
  const db = getFirestore();
  const participantsInfo: { id: string; name: string }[] = [];

  for (const participantId of participantIds) {
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, participantId));
      const userData = userDoc.data();
      participantsInfo.push({
        id: participantId,
        name: userData?.name || 'Usuario'
      });
    } catch (error) {
      console.error('Error al cargar información del participante:', error);
    }
  }

  return participantsInfo;
};

export const loadGroupMessages = (
  groupId: string,
  onMessagesUpdate: (messages: Message[]) => void,
  onError: (error: any) => void
) => {
  const db = getFirestore();
  const messagesRef = collection(db, COLLECTIONS.GROUP_CHATS, groupId, COLLECTIONS.MESSAGES);
  const q = query(messagesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    snapshot => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return MessageModel.fromFirestore(doc.id, data);
      });
      onMessagesUpdate(messages);
    },
    error => {
      console.error('Error al cargar mensajes:', error);
      onError(error);
    }
  );
};

export const resetGroupUnreadCount = async (groupId: string) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const db = getFirestore();
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    await updateDoc(groupRef, {
      [`unreadCount.${currentUser.uid}`]: 0
    });
  } catch (error) {
    console.error('Error al reiniciar contador de mensajes no leídos:', error);
  }
};

export const sendGroupMessage = async (
  groupId: string,
  messageText: string,
  senderId: string,
  participants: { id: string }[],
  senderName: string,
  readBy: { [userId: string]: Date } = {}
) => {
  try {
    const db = getFirestore();
    const encryptedText = CryptoJS.AES.encrypt(messageText, groupId).toString();
    
    const messageData = {
      text: encryptedText,
      senderId: senderId,
      fromName: senderName,
      createdAt: serverTimestamp(),
      isGroup: true,
      groupId: groupId,
      readBy
    };

    const messagesRef = collection(db, COLLECTIONS.GROUP_CHATS, groupId, COLLECTIONS.MESSAGES);
    await addDoc(messagesRef, messageData);

    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    
    const updates: any = {
      lastMessage: {
        text: encryptedText,
        createdAt: serverTimestamp(),
        senderId: senderId,
        isGroup: true,
        groupId: groupId
      },
      updatedAt: serverTimestamp(),
    };

    participants.forEach(participant => {
      if (participant.id !== senderId) {
        updates[`unreadCount.${participant.id}`] = increment(1);
      }
    });

    await updateDoc(groupRef, updates);

    return true;
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    throw error;
  }
};

export const loadGroupDetails = async (groupId: string): Promise<{
  name: string;
  photoURL?: string;
  adminIds: string[];
  participants: string[];
  description?: string;
  createdAt: Date;
  isPublic: boolean;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    radius?: number;
  };
}> => {
  try {
    const db = getFirestore();
    const groupDoc = await getDoc(doc(db, COLLECTIONS.GROUP_CHATS, groupId));
    
    if (groupDoc.exists()) {
      const data = groupDoc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as any;
    }
    throw new Error('Grupo no encontrado');
  } catch (error) {
    console.error('Error al cargar datos del grupo:', error);
    throw error;
  }
};

export const loadGroupMembers = async (participantIds: string[], adminIds: string[]): Promise<{
  id: string;
  name: string;
  photoURL?: string;
  phoneNumber: string;
  isAdmin: boolean;
}[]> => {
  try {
    const db = getFirestore();
    const members = [];

    for (const participantId of participantIds) {
      try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, participantId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData) {
            members.push({
              id: participantId,
              name: userData.name || 'Usuario',
              photoURL: userData.photoURL,
              phoneNumber: userData.phoneNumber || 'Sin número',
              isAdmin: adminIds.includes(participantId)
            });
          }
        }
      } catch (error) {
        console.error(`Error al cargar información del miembro ${participantId}:`, error);
      }
    }

    return members.sort((a, b) => {
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error al cargar miembros del grupo:', error);
    throw error;
  }
};

export const updateGroupDescription = async (groupId: string, newDescription: string) => {
  try {
    const db = getFirestore();
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    await updateDoc(groupRef, { description: newDescription });
    return true;
  } catch (error) {
    console.error('Error al actualizar la descripción:', error);
    throw error;
  }
};

export const updateGroupName = async (groupId: string, newName: string) => {
  try {
    const db = getFirestore();
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    await updateDoc(groupRef, { name: newName });
    return true;
  } catch (error) {
    console.error('Error al actualizar el nombre:', error);
    throw error;
  }
};

export const deleteGroupChat = async (groupId: string, photoURL?: string) => {
  try {
    const db = getFirestore();
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    
    if (photoURL) {
      try {
        const storageRef = storage().ref(photoURL);
        await storageRef.delete();
      } catch (error) {
        console.error('Error al eliminar la foto del grupo:', error);
      }
    }

    await deleteDoc(groupRef);
    return true;
  } catch (error) {
    console.error('Error al eliminar el grupo:', error);
    throw error;
  }
};

export const addGroupMember = async (groupId: string, userId: string) => {
  try {
    const db = getFirestore();
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    await updateDoc(groupRef, {
      participants: arrayUnion(userId)
    });
    return true;
  } catch (error) {
    console.error('Error al añadir miembro:', error);
    throw error;
  }
};

export const removeGroupMember = async (groupId: string, userId: string) => {
  try {
    const db = getFirestore();
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    await updateDoc(groupRef, {
      participants: arrayRemove(userId)
    });
    return true;
  } catch (error) {
    console.error('Error al eliminar miembro:', error);
    throw error;
  }
};

export const loadGroupContacts = async (participantIds: string[]) => {
  try {
    const contacts = await Contacts.getAll(["firstName", "lastName", "phoneNumbers"]);
    const db = getFirestore();
    const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));

    const mappedContacts = contacts.map((c: any) => {
      let userId: string | undefined = undefined;

      if (Array.isArray(c.phoneNumbers) && c.phoneNumbers.length > 0) {
        const contactNumbers = c.phoneNumbers.map((p: any) => p.value.replace(/\D/g, ''));
        for (const contactNumber of contactNumbers) {
          const matchingUser = usersSnapshot.docs.find(doc => {
            const dbNumber = doc.data().phoneNumber;
            return dbNumber && dbNumber.endsWith(contactNumber);
          });
          if (matchingUser) {
            userId = matchingUser.id;
            break;
          }
        }
      }

      return {
        id: userId,
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Sin nombre',
        phoneNumber: c.phoneNumbers?.[0]?.value || 'Sin número',
      };
    });

    return mappedContacts.filter(c => c.id && !participantIds.includes(c.id));
  } catch (error) {
    console.error('Error al cargar contactos:', error);
    throw error;
  }
};

export const leaveGroupChat = async (groupId: string, userId: string) => {
  try {
    const db = getFirestore();
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    await updateDoc(groupRef, {
      participants: arrayRemove(userId)
    });
    return true;
  } catch (error) {
    console.error('Error al salir del grupo:', error);
    throw error;
  }
};

export const makeGroupAdmin = async (groupId: string, userId: string) => {
  try {
    const db = getFirestore();
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    await updateDoc(groupRef, {
      adminIds: arrayUnion(userId)
    });
    return true;
  } catch (error) {
    console.error('Error al hacer administrador:', error);
    throw error;
  }
};

export const removeGroupAdmin = async (groupId: string, userId: string) => {
  try {
    const db = getFirestore();
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    await updateDoc(groupRef, {
      adminIds: arrayRemove(userId)
    });
    return true;
  } catch (error) {
    console.error('Error al quitar administrador:', error);
    throw error;
  }
};

export const toggleGroupVisibility = async (groupId: string, currentVisibility: boolean) => {
  try {
    const db = getFirestore();
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    await updateDoc(groupRef, {
      isPublic: !currentVisibility
    });
    return true;
  } catch (error) {
    console.error('Error al cambiar la visibilidad:', error);
    throw error;
  }
};

export const updateGroupLocation = async (groupId: string, location: {
  latitude: number;
  longitude: number;
  address?: string;
}) => {
  try {
    const db = getFirestore();
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    await updateDoc(groupRef, {
      location
    });
    return true;
  } catch (error) {
    console.error('Error al actualizar la ubicación:', error);
    throw error;
  }
};

export const loadGroupCreationContacts = async (currentUserId: string): Promise<{
  recordID: string;
  firstName: string;
  lastName: string;
  phoneNumbers: { label: string; number: string }[];
  selected: boolean;
  userId?: string;
}[]> => {
  try {
    const contacts = await Contacts.getAll(["firstName", "lastName", "phoneNumbers"]);
    const db = getFirestore();
    const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));

    const mappedContacts = contacts.map((c: any, idx: number) => {
      let userId: string | undefined = undefined;

      if (Array.isArray(c.phoneNumbers) && c.phoneNumbers.length > 0) {
        const contactNumbers = c.phoneNumbers.map((p: any) => p.value.replace(/\D/g, ''));
        for (const contactNumber of contactNumbers) {
          const matchingUser = usersSnapshot.docs.find(doc => {
            const dbNumber = doc.data().phoneNumber;
            return dbNumber && dbNumber.endsWith(contactNumber);
          });
          if (matchingUser) {
            userId = matchingUser.id;
            break;
          }
        }
      }

      return {
        recordID: c.recordID || `${c.firstName || ''}_${c.lastName || ''}_${c.phoneNumbers?.[0]?.value || idx}`,
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        phoneNumbers: Array.isArray(c.phoneNumbers)
          ? c.phoneNumbers.map((p: any) => ({
              label: p.label,
              number: p.value,
            }))
          : [],
        selected: false,
        userId,
      };
    });

    return mappedContacts.filter(c => c.userId && c.userId !== currentUserId);
  } catch (error) {
    console.error('Error al cargar contactos:', error);
    throw error;
  }
};

export const uploadGroupPhoto = async (groupId: string, image: Image): Promise<string> => {
  try {
    const db = getFirestore();
    const storageRef = storage().ref(`groupPhotos/${groupId}/${Date.now()}`);
    
    // Convertir la imagen a Blob
    const response = await fetch(image.uri);
    const blob = await response.blob();
    
    // Subir la imagen
    await storageRef.put(blob);
    
    // Obtener la URL de la imagen
    const photoURL = await storageRef.getDownloadURL();
    
    // Actualizar el documento del grupo con la nueva URL de la foto
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    await updateDoc(groupRef, {
      photoURL,
      updatedAt: serverTimestamp()
    });
    
    return photoURL;
  } catch (error) {
    console.error('Error al subir la foto del grupo:', error);
    throw error;
  }
};

export const loadNearbyGroups = async (maxDistance: number = 10, currentLocation: { latitude: number; longitude: number }) => {
  try {
    const db = getFirestore();
    const groupsRef = collection(db, 'groupChats');
    const q = query(groupsRef, where('isPublic', '==', true));
    const querySnapshot = await getDocs(q);

    const groups = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.location) {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          data.location.latitude,
          data.location.longitude
        );
        
        // Solo incluir grupos dentro del radio máximo
        if (distance <= maxDistance) {
          groups.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            isPublic: data.isPublic,
            location: data.location,
            distance,
            participants: data.participants || [],
            adminIds: data.adminIds || [],
          });
        }
      }
    });

    // Ordenar grupos por distancia
    return groups.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error al cargar grupos cercanos:', error);
    throw error;
  }
};

export const joinNearbyGroup = async (groupId: string, currentUserId: string, currentParticipants: string[]): Promise<boolean> => {
  try {
    const db = getFirestore();
    const groupRef = doc(db, 'groupChats', groupId);
    
    await updateDoc(groupRef, {
      participants: [...currentParticipants, currentUserId],
      [`unreadCount.${currentUserId}`]: 0
    });

    return true;
  } catch (error) {
    console.error('Error al unirse al grupo:', error);
    return false;
  }
};

// Función auxiliar para calcular distancia
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const toRad = (value: number): number => {
  return value * Math.PI / 180;
};

export const loadUserProfile = async (userId: string) => {
  try {
    const db = getFirestore();
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    
    return {
      id: userId,
      phoneNumber: userData?.phoneNumber || '',
      name: userData?.name || 'Usuario',
      photoURL: userData?.photoURL,
      lastLogin: new Date(),
      status: userData?.status || '¡Hola! Estoy usando MichatApp',
    };
  } catch (error) {
    console.error('Error loading user data:', error);
    throw error;
  }
};

export const updateUserName = async (userId: string, newName: string) => {
  try {
    const db = getFirestore();
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      name: newName,
    });
    return true;
  } catch (error) {
    console.error('Error updating name:', error);
    throw error;
  }
};

export const updateUserStatus = async (userId: string, newStatus: string) => {
  try {
    const db = getFirestore();
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: newStatus,
    });
    return true;
  } catch (error) {
    console.error('Error updating status:', error);
    throw error;
  }
};

export const uploadUserPhoto = async (userId: string, image: Image): Promise<string> => {
  try {
    const storageRef = storage().ref(`profile_photos/${userId}`);
    
    // Convertir la URI a Blob
    const response = await fetch(image.path);
    const blob = await response.blob();

    // Subir el archivo usando put
    await storageRef.put(blob);
    
    // Obtener la URL de descarga
    const downloadURL = await storageRef.getDownloadURL();

    // Actualizar Firestore
    const db = getFirestore();
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      photoURL: downloadURL,
    });

    return downloadURL;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

export const subscribeToUserProfile = (
  userId: string,
  onUpdate: (data: {
    name: string;
    phoneNumber: string;
    photoURL?: string;
    status?: string;
  }) => void,
  onError: (error: any) => void
) => {
  try {
    const db = getFirestore();
    const userRef = doc(db, 'users', userId);
    
    return onSnapshot(userRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          onUpdate({
            name: data.name || 'Usuario',
            phoneNumber: data.phoneNumber || '',
            photoURL: data.photoURL,
            status: data.status === undefined ? '¡Hola! Estoy usando MichatApp' : data.status
          });
        } else {
          onError('Usuario no encontrado');
        }
      },
      (error) => {
        console.error('Error al cargar datos del usuario:', error);
        onError('Error al cargar los datos del usuario');
      }
    );
  } catch (error) {
    console.error('Error al cargar datos del usuario:', error);
    onError('Error al cargar los datos del usuario');
    return null;
  }
};

export const getUserFCMToken = async (userId: string): Promise<string | null> => {
  try {
    const db = getFirestore();
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return userDoc.data()?.fcmToken || null;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener token FCM:', error);
    return null;
  }
};

export const saveUserFCMToken = async (userId: string, token: string): Promise<void> => {
  try {
    const db = getFirestore();
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: token,
    });
  } catch (error) {
    console.error('Error al guardar token FCM:', error);
  }
};

export const uploadChatImage = async (chatId: string, imageAsset: ImageAsset, isGroup: boolean = false): Promise<string> => {
  try {
    const path = isGroup ? `group_images/${chatId}/${Date.now()}` : `chat_images/${chatId}/${Date.now()}`;
    const storageRef = storage().ref(path);

    // Convertir la URI a Blob
    const response = await fetch(imageAsset.path);
    const blob = await response.blob();

    // Subir el archivo usando put
    await storageRef.put(blob);

    // Obtener la URL de descarga
    return await storageRef.getDownloadURL();
  } catch (error) {
    console.error('Error al subir imagen del chat:', error);
    throw error;
  }
};

export const sendChatImage = async (
  chatId: string,
  imageUrl: string,
  senderId: string,
  otherParticipantId: string,
  notificationData: {
    fromName: string;
    to: string;
  }
) => {
  try {
    const db = getFirestore();
    
    const messageData = {
      type: 'image',
      imageUrl: imageUrl,
      senderId: senderId,
      createdAt: serverTimestamp(),
      fromName: notificationData.fromName,
      to: notificationData.to
    };

    const messagesRef = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
    await addDoc(messagesRef, messageData);

    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        type: 'image',
        text: '📷 Imagen',
        createdAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
      [`unreadCount.${otherParticipantId}`]: increment(1)
    });

    return true;
  } catch (error) {
    console.error('Error al enviar imagen:', error);
    throw error;
  }
};

export const deleteMessage = async (chatId: string, messageId: string): Promise<void> => {
  try {
    const db = getFirestore();
    const messageRef = doc(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES, messageId);
    await deleteDoc(messageRef);
  } catch (error) {
    console.error('Error al eliminar mensaje:', error);
    throw error;
  }
};

export const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
  try {
    const storageRef = storage().refFromURL(imageUrl);
    await storageRef.delete();
  } catch (error) {
    console.error('Error al eliminar imagen de Firebase Storage:', error);
    throw error;
  }
};

export const processAndDeleteMessage = async (
  message: any,
  chatId: string,
  currentUserId: string
): Promise<void> => {
  try {
    if (message.senderId !== currentUserId) {
      // Si es una imagen, eliminar de Firebase Storage
      if (message.type === 'image') {
        await deleteImageFromStorage(message.imageUrl);
      }
      // Eliminar el mensaje de Firestore
      await deleteMessage(chatId, message.id);
    }
  } catch (error) {
    console.error('Error al procesar y eliminar mensaje:', error);
    throw error;
  }
};

export const sendGroupImage = async (
  groupId: string,
  imageUrl: string,
  senderId: string,
  participants: { id: string }[],
  notificationData: {
    fromName: string;
    to: string;
  },
  readBy: { [userId: string]: Date } = {}
) => {
  try {
    const db = getFirestore();
    
    const messageData = {
      type: 'image',
      imageUrl: imageUrl,
      senderId: senderId,
      createdAt: serverTimestamp(),
      fromName: notificationData.fromName,
      to: notificationData.to,
      groupId: groupId,
      readBy
    };

    const messagesRef = collection(db, COLLECTIONS.GROUP_CHATS, groupId, COLLECTIONS.MESSAGES);
    await addDoc(messagesRef, messageData);

    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    const updates: any = {
      lastMessage: {
        type: 'image',
        text: '📷 Imagen',
        createdAt: serverTimestamp(),
        senderId: senderId
      },
      updatedAt: serverTimestamp()
    };

    // Incrementar contador de mensajes no leídos para todos los participantes excepto el remitente
    participants.forEach(participant => {
      if (participant.id !== senderId) {
        updates[`unreadCount.${participant.id}`] = increment(1);
      }
    });

    await updateDoc(groupRef, updates);

    return true;
  } catch (error) {
    console.error('Error al enviar imagen al grupo:', error);
    throw error;
  }
};

export const deleteGroupMessage = async (groupId: string, messageId: string): Promise<void> => {
  try {
    const db = getFirestore();
    const messageRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId, COLLECTIONS.MESSAGES, messageId);
    await deleteDoc(messageRef);
  } catch (error) {
    console.error('Error al eliminar mensaje del grupo:', error);
    throw error;
  }
};

export const processAndDeleteGroupMessage = async (
  message: any,
  groupId: string,
  currentUserId: string
): Promise<void> => {
  try {
    if (message.senderId !== currentUserId) {
      // Si es una imagen, eliminar de Firebase Storage
      if (message.type === 'image') {
        await deleteImageFromStorage(message.imageUrl);
      }
      // Eliminar el mensaje de Firestore
      await deleteGroupMessage(groupId, message.id);
    }
  } catch (error) {
    console.error('Error al procesar y eliminar mensaje del grupo:', error);
    throw error;
  }
};

export const markGroupMessageAsRead = async (groupId: string, messageId: string, userId: string): Promise<void> => {
  try {
    const db = getFirestore();
    const messageRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
      [`readBy.${userId}`]: serverTimestamp()
    });
  } catch (error) {
    console.error('Error al marcar mensaje como leído:', error);
    throw error;
  }
};

export const canDeleteGroupMessage = async (groupId: string, messageId: string): Promise<boolean> => {
  try {
    const db = getFirestore();
    const messageRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId, COLLECTIONS.MESSAGES, messageId);
    const messageDoc = await getDoc(messageRef);
    const messageData = messageDoc.data();
    
    if (!messageData) return false;

    // Obtener la lista de participantes del grupo
    const groupRef = doc(db, COLLECTIONS.GROUP_CHATS, groupId);
    const groupDoc = await getDoc(groupRef);
    const groupData = groupDoc.data();
    
    if (!groupData || !groupData.participants) return false;

    // Verificar si todos los participantes han leído el mensaje
    const readBy = messageData.readBy || {};
    const allParticipantsHaveRead = groupData.participants.every(
      participantId => readBy[participantId]
    );

    return allParticipantsHaveRead;
  } catch (error) {
    console.error('Error al verificar si se puede eliminar el mensaje:', error);
    return false;
  }
};

export default db;