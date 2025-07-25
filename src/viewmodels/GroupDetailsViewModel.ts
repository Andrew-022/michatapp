import {makeAutoObservable, action} from 'mobx';
import {getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, arrayUnion, arrayRemove} from '@react-native-firebase/firestore';
import {getAuth} from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import ImagePicker, { Image } from 'react-native-image-crop-picker';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import Contacts from '@s77rt/react-native-contacts';
import Geolocation from '@react-native-community/geolocation';
import { GOOGLE_MAPS_API_KEY } from '../config/keys';
import {
  loadGroupDetails,
  loadGroupMembers,
  updateGroupDescription,
  updateGroupName,
  deleteGroupChat,
  addGroupMember,
  removeGroupMember,
  loadGroupContacts,
  leaveGroupChat,
  makeGroupAdmin,
  removeGroupAdmin,
  toggleGroupVisibility,
  updateGroupLocation,
  uploadGroupPhoto,
  getUser,
  updateGroupChat
} from '../services/firestore';

export interface GroupLocation {
  latitude: number;
  longitude: number;
  address?: string;
  radius?: number;
}

export interface GroupMember {
  id: string;
  name: string;
  photoURL?: string;
  phoneNumber: string;
  isAdmin: boolean;
}

export interface GroupData {
  name: string;
  photoURL?: string;
  adminIds: string[];
  participants: string[];
  description?: string;
  createdAt: Date;
  isPublic: boolean;
  location?: GroupLocation;
  max_distance?: number;
}

export class GroupDetailsViewModel {
  loading = true;
  groupData: GroupData | null = null;
  members: GroupMember[] = [];
  error: string | null = null;
  isAdmin: boolean = false;
  uploadingPhoto: boolean = false;

  constructor(private groupId: string) {
    makeAutoObservable(this);
    this.loadGroupData();
  }

  private setLoading = action((loading: boolean) => {
    this.loading = loading;
  });

  private setError = action((error: string | null) => {
    this.error = error;
  });

  private setGroupData = action((data: GroupData | null) => {
    this.groupData = data;
    if (data) {
      const auth = getAuth();
      this.isAdmin = data.adminIds.includes(auth.currentUser?.uid || '');
    }
  });

  private setMembers = action((members: GroupMember[]) => {
    this.members = members;
  });

  private setUploadingPhoto = action((uploading: boolean) => {
    this.uploadingPhoto = uploading;
  });

  async pickAndUploadPhoto() {
    if (!this.isAdmin) {
      Alert.alert(
        'Acceso denegado',
        'Solo el administrador puede cambiar la foto del grupo',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const image = await ImagePicker.openPicker({
        width: 300,
        height: 300,
        cropping: true,
        cropperCircleOverlay: false,
        mediaType: 'photo',
        compressImageMaxWidth: 500,
        compressImageMaxHeight: 500,
        compressImageQuality: 0.8,
      });

      if (image) {
        await this.uploadPhoto(image);
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error('Error al seleccionar foto:', error);
        Alert.alert(
          'Error',
          'Error al seleccionar la foto',
          [{ text: 'OK' }]
        );
      }
    }
  }

  private async uploadPhoto(image: Image) {
    try {
      this.setUploadingPhoto(true);
      const reference = storage().ref(`group_photos/${this.groupId}`);
      
      // Convertir la URI a Blob
      const response = await fetch(image.path);
      const blob = await response.blob();

      // Subir el archivo
      await reference.put(blob);
      
      // Obtener la URL de descarga
      const downloadURL = await reference.getDownloadURL();

      // Actualizar Firestore
      const db = getFirestore();
      const groupRef = doc(db, 'groupChats', this.groupId);
      await updateDoc(groupRef, {
        photoURL: downloadURL,
      });

      if (this.groupData) {
        this.setGroupData({
          ...this.groupData,
          photoURL: downloadURL
        });
      }
    } catch (error) {
      console.error('Error al subir la foto:', error);
      this.setError('Error al subir la foto');
    } finally {
      this.setUploadingPhoto(false);
    }
  }

  async loadGroupData() {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const data = await loadGroupDetails(this.groupId);
      this.setGroupData(data);
      await this.loadMembers(data.participants);
    } catch (error) {
      console.error('Error al cargar datos del grupo:', error);
      this.setError('Error al cargar los datos del grupo');
    } finally {
      this.setLoading(false);
    }
  }

  private async loadMembers(participantIds: string[]) {
    try {
      const members = await loadGroupMembers(participantIds, this.groupData?.adminIds || []);
      this.setMembers(members);
    } catch (error) {
      console.error('Error al cargar miembros del grupo:', error);
      this.setError('Error al cargar los miembros del grupo');
    }
  }

  async updateDescription(newDescription: string) {
    if (!this.isAdmin) {
      Alert.alert(
        'Acceso denegado',
        'Solo el administrador puede modificar la descripción',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      this.setLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      let userName = '';
      if (currentUser) {
        const userData = await getUser(currentUser.uid);
        userName = userData?.name || 'Usuario';
      }
      await updateGroupDescription(this.groupId, newDescription, currentUser?.uid || '', userName);
      
      if (this.groupData) {
        this.setGroupData({
          ...this.groupData,
          description: newDescription
        });
      }
    } catch (error) {
      console.error('Error al actualizar la descripción:', error);
      Alert.alert(
        'Error',
        'No se pudo actualizar la descripción',
        [{ text: 'OK' }]
      );
    } finally {
      this.setLoading(false);
    }
  }

  async updateName(newName: string) {
    if (!this.isAdmin) {
      Alert.alert(
        'Acceso denegado',
        'Solo el administrador puede modificar el nombre del grupo',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      this.setLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      let userName = '';
      if (currentUser) {
        const userData = await getUser(currentUser.uid);
        userName = userData?.name || 'Usuario';
      }
      await updateGroupName(this.groupId, newName, currentUser?.uid || '', userName);
      
      if (this.groupData) {
        this.setGroupData({
          ...this.groupData,
          name: newName
        });
      }
    } catch (error) {
      console.error('Error al actualizar el nombre:', error);
      Alert.alert(
        'Error',
        'No se pudo actualizar el nombre del grupo',
        [{ text: 'OK' }]
      );
    } finally {
      this.setLoading(false);
    }
  }

  async deleteGroup() {
    if (!this.isAdmin) {
      Alert.alert(
        'Acceso denegado',
        'Solo el administrador puede eliminar el grupo',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      this.setLoading(true);
      await deleteGroupChat(this.groupId, this.groupData?.photoURL);
      return true;
    } catch (error) {
      console.error('Error al eliminar el grupo:', error);
      Alert.alert(
        'Error',
        'No se pudo eliminar el grupo',
        [{ text: 'OK' }]
      );
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async addMember(userId: string) {
    if (!this.isAdmin) {
      Alert.alert(
        'Acceso denegado',
        'Solo el administrador puede añadir miembros',
        [{ text: 'OK' }]
      );
      return;
    }

    if (this.groupData?.participants.includes(userId)) {
      Alert.alert(
        'Error',
        'Este usuario ya es miembro del grupo',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      this.setLoading(true);
      await addGroupMember(this.groupId, userId);
      await this.loadGroupData();
    } catch (error) {
      console.error('Error al añadir miembro:', error);
      Alert.alert(
        'Error',
        'No se pudo añadir el miembro al grupo',
        [{ text: 'OK' }]
      );
    } finally {
      this.setLoading(false);
    }
  }

  async removeMember(userId: string) {
    if (!this.isAdmin) {
      Alert.alert(
        'Acceso denegado',
        'Solo el administrador puede eliminar miembros',
        [{ text: 'OK' }]
      );
      return;
    }

    if (userId === this.groupData?.adminIds[0]) {
      Alert.alert(
        'Error',
        'No puedes eliminar al administrador del grupo',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      this.setLoading(true);
      await removeGroupMember(this.groupId, userId);
      await this.loadGroupData();
    } catch (error) {
      console.error('Error al eliminar miembro:', error);
      Alert.alert(
        'Error',
        'No se pudo eliminar el miembro del grupo',
        [{ text: 'OK' }]
      );
    } finally {
      this.setLoading(false);
    }
  }

  async loadContacts() {
    try {
      return await loadGroupContacts(this.groupData?.participants || []);
    } catch (error) {
      console.error('Error al cargar contactos:', error);
      return [];
    }
  }

  async leaveGroup() {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    if (this.groupData?.adminIds.includes(currentUser.uid)) {
      Alert.alert(
        'Error',
        'El administrador no puede salir del grupo. Debe transferir la administración o eliminar el grupo.',
        [{ text: 'OK' }]
      );
      return false;
    }

    try {
      this.setLoading(true);
      await leaveGroupChat(this.groupId, currentUser.uid);
      return true;
    } catch (error) {
      console.error('Error al salir del grupo:', error);
      Alert.alert(
        'Error',
        'No se pudo salir del grupo',
        [{ text: 'OK' }]
      );
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async makeAdmin(userId: string) {
    if (!this.isAdmin) {
      Alert.alert(
        'Acceso denegado',
        'Solo los administradores pueden asignar nuevos administradores',
        [{ text: 'OK' }]
      );
      return;
    }

    if (this.groupData?.adminIds.includes(userId)) {
      Alert.alert(
        'Error',
        'Este usuario ya es administrador',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      this.setLoading(true);
      await makeGroupAdmin(this.groupId, userId);
      await this.loadGroupData();
    } catch (error) {
      console.error('Error al hacer administrador:', error);
      Alert.alert(
        'Error',
        'No se pudo hacer administrador al miembro',
        [{ text: 'OK' }]
      );
    } finally {
      this.setLoading(false);
    }
  }

  async removeAdmin(userId: string) {
    if (!this.isAdmin) {
      Alert.alert(
        'Acceso denegado',
        'Solo los administradores pueden quitar administradores',
        [{ text: 'OK' }]
      );
      return;
    }

    if (this.groupData?.adminIds.length === 1) {
      Alert.alert(
        'Error',
        'No se puede quitar el último administrador del grupo',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      this.setLoading(true);
      await removeGroupAdmin(this.groupId, userId);
      await this.loadGroupData();
    } catch (error) {
      console.error('Error al quitar administrador:', error);
      Alert.alert(
        'Error',
        'No se pudo quitar al administrador',
        [{ text: 'OK' }]
      );
    } finally {
      this.setLoading(false);
    }
  }

  async toggleVisibility() {
    if (!this.isAdmin) {
      Alert.alert(
        'Acceso denegado',
        'Solo el administrador puede modificar la visibilidad del grupo',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      this.setLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      let userName = '';
      if (currentUser) {
        const userData = await getUser(currentUser.uid);
        userName = userData?.name || 'Usuario';
      }
      await toggleGroupVisibility(this.groupId, this.groupData?.isPublic || false, currentUser?.uid || '', userName);
      
      if (this.groupData) {
        this.setGroupData({
          ...this.groupData,
          isPublic: !this.groupData.isPublic
        });
      }
    } catch (error) {
      console.error('Error al cambiar la visibilidad:', error);
      Alert.alert(
        'Error',
        'No se pudo cambiar la visibilidad del grupo',
        [{ text: 'OK' }]
      );
    } finally {
      this.setLoading(false);
    }
  }

  async updateMaxDistance(newDistance: number) {
    if (!this.isAdmin || !this.groupData?.isPublic) {
      Alert.alert(
        'Acceso denegado',
        'Solo el administrador de un grupo público puede modificar la distancia máxima',
        [{ text: 'OK' }]
      );
      return;
    }
    try {
      this.setLoading(true);
      await updateGroupChat(this.groupId, { max_distance: newDistance });
      if (this.groupData) {
        this.setGroupData({
          ...this.groupData,
          max_distance: newDistance
        });
      }
    } catch (error) {
      console.error('Error al actualizar la distancia máxima:', error);
      Alert.alert('Error', 'No se pudo actualizar la distancia máxima', [{ text: 'OK' }]);
    } finally {
      this.setLoading(false);
    }
  }

  private async requestLocationPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de ubicación',
            message: 'Esta aplicación necesita acceder a tu ubicación para actualizar la ubicación del grupo.',
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

  private async getCurrentLocation(): Promise<GroupLocation | null> {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Se requiere permiso de ubicación');
      }

      const options = {
        enableHighAccuracy: false,
        timeout: 10000,
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

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Obtener la dirección a partir de las coordenadas
      const address = await this.getAddressFromCoordinates(location.latitude, location.longitude);

      return {
        ...location,
        address
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
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

  async updateLocation() {
    if (!this.isAdmin) {
      Alert.alert(
        'Acceso denegado',
        'Solo el administrador puede modificar la ubicación del grupo',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!this.groupData?.isPublic) {
      Alert.alert(
        'Ubicación no disponible',
        'Los grupos privados no pueden tener ubicación',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      this.setLoading(true);
      const location = await this.getCurrentLocation();
      
      if (!location) {
        throw new Error('No se pudo obtener la ubicación actual');
      }

      const address = await this.getAddressFromCoordinates(location.latitude, location.longitude);
      const locationWithAddress = { ...location, address };
      const auth = getAuth();
      const currentUser = auth.currentUser;
      let userName = '';
      if (currentUser) {
        const userData = await getUser(currentUser.uid);
        userName = userData?.name || 'Usuario';
      }
      await updateGroupLocation(this.groupId, locationWithAddress, currentUser?.uid || '', userName);

      if (this.groupData) {
        this.setGroupData({
          ...this.groupData,
          location: locationWithAddress
        });
      }
    } catch (error) {
      console.error('Error al actualizar la ubicación:', error);
      Alert.alert(
        'Error',
        'No se pudo actualizar la ubicación del grupo',
        [{ text: 'OK' }]
      );
    } finally {
      this.setLoading(false);
    }
  }
} 