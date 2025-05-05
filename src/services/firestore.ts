import firestore from '@react-native-firebase/firestore';

// Inicializar Firestore con configuración específica
const db = firestore();

// Colecciones
export const COLLECTIONS = {
  USERS: 'users',
  MESSAGES: 'messages',
  CHATS: 'chats',
};

// Funciones de usuario
export const createUser = async (userId: string, userData: any) => {
  try {
    await db.collection(COLLECTIONS.USERS).doc(userId).set({
      ...userData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
};

export const getUser = async (userId: string) => {
  try {
    const doc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
};

// Funciones de chat
export const createChat = async (participants: string[]) => {
  try {
    const chatRef = await db.collection(COLLECTIONS.CHATS).add({
      participants,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return chatRef.id;
  } catch (error) {
    console.error('Error al crear chat:', error);
    throw error;
  }
};

export const sendMessage = async (chatId: string, message: any) => {
  try {
    await db.collection(COLLECTIONS.CHATS)
      .doc(chatId)
      .collection(COLLECTIONS.MESSAGES)
      .add({
        ...message,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    return true;
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    throw error;
  }
};

// Función para escuchar cambios en tiempo real
export const subscribeToMessages = (chatId: string, callback: (messages: any[]) => void) => {
  return db.collection(COLLECTIONS.CHATS)
    .doc(chatId)
    .collection(COLLECTIONS.MESSAGES)
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(messages);
    });
};

export default db;