import { makeAutoObservable, runInAction } from 'mobx';
import Contacts from '@s77rt/react-native-contacts';
import { Platform, PermissionsAndroid } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from '@react-native-firebase/firestore';
import { Contact, ContactModel } from '../models/Contact';

export class ContactListViewModel {
  contacts: Contact[] = [];
  loading: boolean = true;

  constructor() {
    makeAutoObservable(this);
    this.requestContactsPermission();
  }

  private async requestContactsPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Permiso para acceder a los contactos',
            message:
              'Esta aplicación necesita acceder a tus contactos para mostrar la lista de contactos.',
            buttonNeutral: 'Preguntar más tarde',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Permiso de contactos denegado');
          runInAction(() => {
            this.loading = false;
          });
          return;
        }
      } catch (error) {
        console.error('Error al solicitar permiso:', error);
        runInAction(() => {
          this.loading = false;
        });
        return;
      }
    }
    this.loadContacts();
  }

  private loadContacts() {
    Contacts.getAll(["firstName", "lastName", "phoneNumbers"])
      .then(contacts => {
        runInAction(() => {
          this.contacts = contacts.map((c: any, idx: number) => new ContactModel({
            recordID: c.recordID || `${c.firstName || ''}_${c.lastName || ''}_${c.phoneNumbers?.[0]?.value || idx}`,
            firstName: c.firstName || '',
            lastName: c.lastName || '',
            phoneNumbers: Array.isArray(c.phoneNumbers)
              ? c.phoneNumbers.map((p: any) => ({
                  label: p.label,
                  number: p.value,
                }))
              : [],
          }));
          this.loading = false;
        });
      })
      .catch(error => {
        console.error('Error al cargar contactos:', error);
        runInAction(() => {
          this.loading = false;
        });
      });
  }

  async startChat(otherUser: Contact): Promise<{ chatId: string; otherParticipantId: string | null }> {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    const db = getFirestore();
    let registeredUserId: string | null = null;

    if (Array.isArray(otherUser.phoneNumbers) && otherUser.phoneNumbers.length > 0) {
      const phoneNumbers = otherUser.phoneNumbers.map(p => p.number.replace(/\D/g, ''));
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phoneNumber', 'in', phoneNumbers));
      const usersSnapshot = await getDocs(q);

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        registeredUserId = userDoc.id;
      }
    }

    if (!registeredUserId) {
      return {
        chatId: '',
        otherParticipantId: null,
      };
    }

    // Verificar si ya existe un chat entre estos usuarios
    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid)
    );
    const existingChat = await getDocs(chatsQuery);

    const chat = existingChat.docs.find(doc => {
      const data = doc.data();
      return data.participants.includes(registeredUserId);
    });

    if (chat) {
      return {
        chatId: chat.id,
        otherParticipantId: registeredUserId,
      };
    }

    // Si no existe, crear uno nuevo
    const newChatRef = await addDoc(collection(db, 'chats'), {
      participants: [currentUser.uid, registeredUserId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      chatId: newChatRef.id,
      otherParticipantId: registeredUserId,
    };
  }
} 