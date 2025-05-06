import { makeAutoObservable } from 'mobx';
import Contacts from 'react-native-contacts';
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
    Contacts.getAll()
      .then(contacts => {
        this.contacts = contacts.map(contact => new ContactModel(contact));
        this.loading = false;
      })
      .catch(error => {
        console.error('Error al cargar contactos:', error);
        this.loading = false;
      });
  }

  async startChat(otherUser: Contact): Promise<{ chatId: string; otherParticipantId: string }> {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar si ya existe un chat entre estos usuarios
    const existingChat = await firestore()
      .collection('chats')
      .where('participants', 'array-contains', currentUser.uid)
      .get();

    const chat = existingChat.docs.find(doc => {
      const data = doc.data();
      return data.participants.includes(otherUser.recordID);
    });

    if (chat) {
      return {
        chatId: chat.id,
        otherParticipantId: otherUser.recordID,
      };
    }

    // Si no existe, crear uno nuevo
    const newChatRef = await firestore().collection('chats').add({
      participants: [currentUser.uid, otherUser.recordID],
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return {
      chatId: newChatRef.id,
      otherParticipantId: otherUser.recordID,
    };
  }
} 