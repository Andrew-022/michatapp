import { makeAutoObservable, runInAction } from 'mobx';
import Contacts from '@s77rt/react-native-contacts';
import { Platform, PermissionsAndroid } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { Contact, ContactModel } from '../models/Contact';
import { startChatWithContact } from '../services/firestore';

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
          // Primero mapeamos los contactos
          const mappedContacts = contacts.map((c: any, idx: number) => new ContactModel({
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

          // Luego ordenamos los contactos alfabéticamente
          this.contacts = mappedContacts.sort((a, b) => {
            // Si alguno de los contactos no tiene nombre ni apellido, lo movemos al final
            const aHasName = (a.firstName || a.lastName).trim().length > 0;
            const bHasName = (b.firstName || b.lastName).trim().length > 0;
            
            if (aHasName && !bHasName) return -1;
            if (!aHasName && bHasName) return 1;
            if (!aHasName && !bHasName) return 0;

            // Si ambos tienen nombre, comparamos normalmente
            const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '');
            if (lastNameCompare !== 0) return lastNameCompare;
            
            return (a.firstName || '').localeCompare(b.firstName || '');
          });

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

    if (!Array.isArray(otherUser.phoneNumbers) || otherUser.phoneNumbers.length === 0) {
      return {
        chatId: '',
        otherParticipantId: null,
      };
    }

    const contactNumbers = otherUser.phoneNumbers.map(p => p.number.replace(/\D/g, ''));
    return startChatWithContact(currentUser.uid, contactNumbers);
  }
} 