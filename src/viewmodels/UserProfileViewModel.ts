import {makeAutoObservable, action} from 'mobx';
import {subscribeToUserProfile} from '../services/firestore';

export interface UserData {
  name: string;
  phoneNumber: string;
  photoURL?: string;
  status?: string;
}

export class UserProfileViewModel {
  loading = true;
  userData: UserData | null = null;
  error: string | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private userId: string) {
    makeAutoObservable(this);
    this.loadUserData();
  }

  private setLoading = action((loading: boolean) => {
    this.loading = loading;
  });

  private setError = action((error: string | null) => {
    this.error = error;
  });

  private setUserData = action((data: UserData) => {
    this.userData = data;
  });

  async loadUserData() {
    try {
      this.setLoading(true);
      this.setError(null);
      
      // Limpiar la suscripción anterior si existe
      if (this.unsubscribe) {
        this.unsubscribe();
      }

      // Suscribirse a los cambios en tiempo real
      this.unsubscribe = subscribeToUserProfile(
        this.userId,
        (data) => {
          this.setUserData(data);
          this.setLoading(false);
        },
        (error) => {
          this.setError(error);
          this.setLoading(false);
        }
      );
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
      this.setError('Error al cargar los datos del usuario');
      this.setLoading(false);
    }
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
} 