import { makeAutoObservable } from 'mobx';
import Contacts from '@s77rt/react-native-contacts';
import { Platform, PermissionsAndroid } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
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
          this.loading = false;
          return;
        }
      } catch (error) {
        console.error('Error al solicitar permiso:', error);
        this.loading = false;
        return;
      }
    }
    this.loadContacts();
  }

  private loadContacts() {
    Contacts.getAll(["firstName", "lastName", "phoneNumbers"])
      .then(contacts => {
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
      })
      .catch(error => {
        console.error('Error al cargar contactos:', error);
        this.loading = false;
      });
  }

  async startChat(otherUser: Contact): Promise<{ chatId: string; otherParticipantId: string | null }> {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    // Buscar si el contacto está registrado en la app (por número de teléfono)
    let registeredUserId: string | null = null;

    if (Array.isArray(otherUser.phoneNumbers) && otherUser.phoneNumbers.length > 0) {
      // Normalizar los números para comparar (puedes ajustar la lógica según formato)
      const phoneNumbers = otherUser.phoneNumbers.map(p => p.number.replace(/\D/g, ''));
      const usersSnapshot = await firestore()
        .collection('users')
        .where('phoneNumber', 'in', phoneNumbers)
        .get();

      if (!usersSnapshot.empty) {
        // Tomamos el primer usuario encontrado
        const userDoc = usersSnapshot.docs[0];
        registeredUserId = userDoc.id;
      }
    }

    if (!registeredUserId) {
      // No se encontró usuario registrado con ese número
      return {
        chatId: '',
        otherParticipantId: null,
      };
    }

    // Verificar si ya existe un chat entre estos usuarios
    const existingChat = await firestore()
      .collection('chats')
      .where('participants', 'array-contains', currentUser.uid)
      .get();

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
    const newChatRef = await firestore().collection('chats').add({
      participants: [currentUser.uid, registeredUserId],
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return {
      chatId: newChatRef.id,
      otherParticipantId: registeredUserId,
    };
  }
} 