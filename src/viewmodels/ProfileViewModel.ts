import { makeAutoObservable, runInAction } from 'mobx';
import { User } from '../models/User';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from '@react-native-firebase/firestore';

export class ProfileViewModel {
  userData: User | null = null;
  loading: boolean = true;

  constructor() {
    makeAutoObservable(this);
    this.loadUserData();
  }

  async loadUserData() {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        const db = getFirestore();
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        
        runInAction(() => {
          this.userData = {
            id: currentUser.uid,
            phoneNumber: currentUser.phoneNumber || '',
            name: userData?.name || 'Usuario',
            lastLogin: new Date(),
          };
          this.loading = false;
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  async updateName(newName: string) {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        const db = getFirestore();
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          name: newName,
        });
        
        runInAction(() => {
          if (this.userData) {
            this.userData.name = newName;
          }
        });
      }
    } catch (error) {
      console.error('Error updating name:', error);
      throw error;
    }
  }
} 