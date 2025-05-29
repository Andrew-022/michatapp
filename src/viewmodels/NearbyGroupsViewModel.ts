import { makeAutoObservable, runInAction } from 'mobx';
import { Platform, PermissionsAndroid } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import Geolocation from '@react-native-community/geolocation';
import { loadNearbyGroups, joinNearbyGroup } from '../services/firestore';

interface GroupLocation {
  latitude: number;
  longitude: number;
  radius?: number;
}

interface NearbyGroup {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  location: GroupLocation;
  distance: number;
  participants: string[];
  adminIds: string[];
}

export class NearbyGroupsViewModel {
  groups: NearbyGroup[] = [];
  loading: boolean = true;
  error: string | null = null;
  currentLocation: GroupLocation | null = null;

  constructor() {
    makeAutoObservable(this);
    this.loadNearbyGroups();
  }

  private async requestLocationPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de ubicación',
            message: 'Esta aplicación necesita acceder a tu ubicación para encontrar grupos cercanos.',
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

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  async loadNearbyGroups(maxDistance: number = 10) {
    try {
      this.loading = true;
      this.error = null;

      const location = await this.getCurrentLocation();
      if (!location) {
        throw new Error('No se pudo obtener la ubicación actual');
      }

      runInAction(() => {
        this.currentLocation = location;
      });

      const groups = await loadNearbyGroups(maxDistance, location);

      runInAction(() => {
        this.groups = groups;
        this.loading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Error al cargar grupos cercanos';
        this.loading = false;
      });
    }
  }

  async joinGroup(groupId: string): Promise<boolean> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      const group = this.groups.find(g => g.id === groupId);
      if (!group) return false;

      const success = await joinNearbyGroup(groupId, currentUser.uid, group.participants);
      
      if (success) {
        // Actualizar la lista de grupos
        await this.loadNearbyGroups();
      }
      
      return success;
    } catch (error) {
      console.error('Error al unirse al grupo:', error);
      return false;
    }
  }

  isUserInGroup(groupId: string): boolean {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    const group = this.groups.find(g => g.id === groupId);
    return group?.participants.includes(currentUser.uid) || false;
  }
} 