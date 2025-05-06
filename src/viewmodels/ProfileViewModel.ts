import {makeAutoObservable} from 'mobx';
import {User} from '../models/User';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export class ProfileViewModel {
  userData: User | null = null;
  loading: boolean = true;

  constructor() {
    makeAutoObservable(this);
    this.loadUserData();
  }

  async loadUserData() {
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        this.userData = {
          id: currentUser.uid,
          phoneNumber: currentUser.phoneNumber || '',
          name: userData?.name || 'Usuario',
          lastLogin: new Date(),
        };
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.loading = false;
    }
  }

  async updateName(newName: string) {
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        const userRef = firestore().collection('users').doc(currentUser.uid);
        await userRef.update({
          name: newName,
        });
        
        if (this.userData) {
          this.userData.name = newName;
        }
      }
    } catch (error) {
      console.error('Error updating name:', error);
      throw error;
    }
  }
} 