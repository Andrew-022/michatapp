import {makeAutoObservable, action} from 'mobx';
import {getFirestore, doc, getDoc} from '@react-native-firebase/firestore';

export interface UserData {
  name: string;
  phoneNumber: string;
  photoURL?: string;
}

export class UserProfileViewModel {
  loading = true;
  userData: UserData | null = null;
  error: string | null = null;

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

  private setUserData = action((data: UserData | null) => {
    this.userData = data;
  });

  async loadUserData() {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', this.userId));
      
      if (userDoc.exists()) {
        this.setUserData(userDoc.data() as UserData);
      } else {
        this.setError('Usuario no encontrado');
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
      this.setError('Error al cargar los datos del usuario');
    } finally {
      this.setLoading(false);
    }
  }
} 