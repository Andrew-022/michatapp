import { makeAutoObservable, runInAction } from 'mobx';
import Contacts from '@s77rt/react-native-contacts';
import { Platform, PermissionsAndroid } from 'react-native';
import { getFirestore, collection, getDocs, addDoc } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { serverTimestamp } from '@react-native-firebase/firestore';
import Geolocation from '@react-native-community/geolocation';

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
  currentUserId: string;
  isPublic: boolean = false;
  location: { latitude: number; longitude: number } | null = null;
  isLoading: boolean = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
    this.currentUserId = getAuth().currentUser?.uid || '';
    this.requestContactsPermission();
  }

  setGroupName(name: string) {
    this.groupName = name;
  }

  setPublic(isPublic: boolean) {
    this.isPublic = isPublic;
  }

  setLocation(location: { latitude: number; longitude: number } | null) {
    this.location = location;
  }

  private async requestLocationPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de ubicación',
            message: 'Esta aplicación necesita acceder a tu ubicación para crear grupos con ubicación.',
            buttonNeutral: 'Preguntar más tarde',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Error requesting location permission:', error);
        return false;
      }
    }
    return true;
  }

  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Se requiere permiso de ubicación');
      }

      // Configuración simplificada y más eficiente
      const options = {
        enableHighAccuracy: false, // Usar el proveedor más eficiente en batería
        timeout: 10000, // 10 segundos de timeout
      };

      const position = await new Promise<Geolocation.GeoPosition>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => {
            console.error('Error de geolocalización:', error);
            reject(error);
          },
          options
        );
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error: any) {
      console.error('Error getting location:', error);
      
      // Mensajes de error más descriptivos
      if (error.code === 1) {
        throw new Error('Permiso de ubicación denegado');
      } else if (error.code === 2) {
        throw new Error('Ubicación no disponible');
      } else if (error.code === 3) {
        throw new Error('Tiempo de espera agotado al obtener la ubicación');
      } else if (error.code === 4) {
        throw new Error('Error al acceder al servicio de ubicación');
      } else {
        throw new Error('Error al obtener la ubicación: ' + (error.message || 'Error desconocido'));
      }
    }
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
        contact.recordID === recordID && contact.userId && contact.userId !== this.currentUserId
          ? { ...contact, selected: !contact.selected }
          : contact
      );
    });
  }

  get selectedContacts(): GroupContact[] {
    const uniqueContacts = new Map<string, GroupContact>();
    this.contacts
      .filter(c => c.selected && c.userId && c.userId !== this.currentUserId)
      .forEach(contact => {
        if (contact.userId && !uniqueContacts.has(contact.userId)) {
          uniqueContacts.set(contact.userId, contact);
        }
      });
    return Array.from(uniqueContacts.values());
  }

  get selectedUserIds(): string[] {
    return this.selectedContacts.map(c => c.userId!);
  }

  async createGroup(): Promise<string | null> {
    if (!this.groupName.trim()) {
      return null;
    }

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return null;

      const db = getFirestore();
      const groupData = {
        name: this.groupName.trim(),
        adminIds: [currentUser.uid],
        participants: [currentUser.uid, ...this.selectedUserIds],
        isPublic: this.isPublic,
        location: this.location,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: {
          text: '',
          createdAt: serverTimestamp(),
          senderId: currentUser.uid,
        },
        unreadCount: {
          [currentUser.uid]: 0,
          ...this.selectedUserIds.reduce((acc, userId) => ({
            ...acc,
            [userId]: 1
          }), {})
        }
      };

      const groupRef = await addDoc(collection(db, 'groupChats'), groupData);
      return groupRef.id;
    } catch (error) {
      console.error('Error al crear grupo:', error);
      return null;
    }
  }
}
