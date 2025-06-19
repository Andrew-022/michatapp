import { makeAutoObservable, runInAction } from 'mobx';
import { Platform, PermissionsAndroid } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import Geolocation from '@react-native-community/geolocation';
import { GOOGLE_MAPS_API_KEY } from '../config/keys';
import { createGroup, loadGroupCreationContacts } from '../services/firestore';

export interface GroupContact {
  recordID: string;
  firstName: string;
  lastName: string;
  phoneNumbers: { label: string; number: string }[];
  selected: boolean;
  userId?: string;
}

export interface GroupLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export class CreateGroupViewModel {
  contacts: GroupContact[] = [];
  loading: boolean = true;
  groupName: string = '';
  currentUserId: string;
  isPublic: boolean = false;
  location: GroupLocation | null = null;
  isLoading: boolean = false;
  error: string | null = null;
  mapRegion: MapRegion = {
    latitude: 40.4168,
    longitude: -3.7038,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Añade estas coordenadas de Madrid
  private readonly MADRID_COORDINATES = {
    latitude: 40.4168,
    longitude: -3.7038,
  };

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

  setLocation(location: GroupLocation | null) {
    this.location = location;
    if (location) {
      this.updateMapRegion(location);
    }
  }

  setMapRegion(region: MapRegion) {
    this.mapRegion = region;
  }

  updateMapRegion(location: GroupLocation) {
    this.mapRegion = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
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

  private async getAddressFromCoordinates(latitude: number, longitude: number): Promise<string> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      return 'Ubicación actual';
    } catch (error) {
      console.error('Error al obtener la dirección:', error);
      return 'Ubicación actual';
    }
  }

  async getCurrentLocation(): Promise<GroupLocation | null> {
    try {
      const hasPermission = await this.requestLocationPermission();

      if (!hasPermission) {
        const address = await this.getAddressFromCoordinates(
          this.MADRID_COORDINATES.latitude,
          this.MADRID_COORDINATES.longitude
        );
        return {
          ...this.MADRID_COORDINATES,
          address
        };
      }

      const options = {
        enableHighAccuracy: false,
        timeout: 10000,
      };

      const position = await new Promise<Geolocation.GeoPosition>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => {
            resolve({
              coords: {
                latitude: this.MADRID_COORDINATES.latitude,
                longitude: this.MADRID_COORDINATES.longitude,
                altitude: null,
                accuracy: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null
              },
              timestamp: Date.now()
            });
          },
          options
        );
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const address = await this.getAddressFromCoordinates(location.latitude, location.longitude);

      return {
        ...location,
        address
      };
    } catch (error: any) {
      const address = await this.getAddressFromCoordinates(
        this.MADRID_COORDINATES.latitude,
        this.MADRID_COORDINATES.longitude
      );
      return {
        ...this.MADRID_COORDINATES,
        address
      };
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
      const contacts = await loadGroupCreationContacts(this.currentUserId);
      runInAction(() => {
        this.contacts = contacts;
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

  validateGroupName(): { isValid: boolean; error?: string } {
    if (!this.groupName.trim()) {
      return { isValid: false, error: 'Por favor ingresa un nombre para el grupo' };
    }
    return { isValid: true };
  }

  validateLocation(): { isValid: boolean; error?: string } {
    if (!this.location) {
      return { isValid: false, error: 'Por favor selecciona una ubicación para el grupo' };
    }
    return { isValid: true };
  }

  validateParticipants(): { isValid: boolean; error?: string } {
    return { isValid: true };
  }

  validateStep1(): { isValid: boolean; error?: string } {
    const nameValidation = this.validateGroupName();
    if (!nameValidation.isValid) return nameValidation;

    // Solo validar ubicación si el grupo es público
    if (this.isPublic) {
      const locationValidation = this.validateLocation();
      if (!locationValidation.isValid) return locationValidation;
    }

    return { isValid: true };
  }

  validateStep2(): { isValid: boolean; error?: string } {
    return { isValid: true };
  }

  async createGroup(): Promise<{ success: boolean; groupId?: string; error?: string }> {
    try {
      const groupData = {
        name: this.groupName.trim(),
        adminIds: [this.currentUserId],
        participants: [this.currentUserId, ...this.selectedUserIds],
        isPublic: this.isPublic,
        // Para grupos privados, location será null. Para grupos públicos, será la ubicación seleccionada o null
        location: this.isPublic ? this.location : null,
      };

      return await createGroup(groupData);
    } catch (error) {
      console.error('Error al crear grupo:', error);
      return { success: false, error: 'No se pudo crear el grupo. Por favor intenta de nuevo.' };
    }
  }
}
