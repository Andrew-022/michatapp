import {makeAutoObservable, action} from 'mobx';
import {getFirestore, doc, onSnapshot} from '@react-native-firebase/firestore';

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

  private setUserData = action((data: any) => {
    this.userData = {
      name: data.name || 'Usuario',
      phoneNumber: data.phoneNumber || '',
      photoURL: data.photoURL,
      status: data.status === undefined ? '¡Hola! Estoy usando MichatApp' : data.status
    };
  });

  async loadUserData() {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const db = getFirestore();
      const userRef = doc(db, 'users', this.userId);
      
      // Limpiar la suscripción anterior si existe
      if (this.unsubscribe) {
        this.unsubscribe();
      }

      // Suscribirse a los cambios en tiempo real
      this.unsubscribe = onSnapshot(userRef, 
        (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            this.setUserData(data);
          } else {
            this.setError('Usuario no encontrado');
          }
          this.setLoading(false);
        },
        (error) => {
          console.error('Error al cargar datos del usuario:', error);
          this.setError('Error al cargar los datos del usuario');
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