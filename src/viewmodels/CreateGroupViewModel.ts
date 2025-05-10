import { makeAutoObservable, runInAction } from 'mobx';
import Contacts from '@s77rt/react-native-contacts';
import { Platform, PermissionsAndroid } from 'react-native';
import { getFirestore, collection, getDocs } from '@react-native-firebase/firestore';

export interface GroupContact {
  recordID: string;
  firstName: string;
  lastName: string;
  phoneNumbers: { label: string; number: string }[];
  selected: boolean;
  userId?: string;
}

export class CreateGroupViewModel {
  contacts: GroupContact[] = [];
  loading: boolean = true;
  groupName: string = '';

  constructor() {
    makeAutoObservable(this);
    this.requestContactsPermission();
  }

  setGroupName(name: string) {
    this.groupName = name;
  }

  async requestContactsPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Permiso para acceder a los contactos',
            message: 'Esta aplicación necesita acceder a tus contactos para crear grupos.',
            buttonNeutral: 'Preguntar más tarde',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          runInAction(() => {
            this.loading = false;
          });
          return;
        }
      } catch (error) {
        runInAction(() => {
          this.loading = false;
        });
        return;
      }
    }
    this.loadContacts();
  }

  async loadContacts() {
    try {
      const contacts = await Contacts.getAll(["firstName", "lastName", "phoneNumbers"]);
      const db = getFirestore();
      const usersSnapshot = await getDocs(collection(db, 'users'));

      const mappedContacts: GroupContact[] = contacts.map((c: any, idx: number) => {
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

      runInAction(() => {
        this.contacts = mappedContacts.filter(c => c.userId);
        this.loading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  toggleContactSelection(recordID: string) {
    runInAction(() => {
      this.contacts = this.contacts.map(contact =>
        contact.recordID === recordID && contact.userId
          ? { ...contact, selected: !contact.selected }
          : contact
      );
    });
  }

  get selectedContacts(): GroupContact[] {
    return this.contacts.filter(c => c.selected && c.userId);
  }

  get selectedUserIds(): string[] {
    return this.selectedContacts.map(c => c.userId!);
  }
}
