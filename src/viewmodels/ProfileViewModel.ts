import { makeAutoObservable, runInAction } from 'mobx';
import { User } from '../models/User';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { Platform } from 'react-native';
import ImagePicker, { Image } from 'react-native-image-crop-picker';

export class ProfileViewModel {
  userData: User | null = null;
  loading: boolean = true;
  uploadingPhoto: boolean = false;

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
            photoURL: userData?.photoURL,
            lastLogin: new Date(),
            status: userData?.status || '¡Hola! Estoy usando MichatApp',
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

  async updateStatus(newStatus: string) {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        const db = getFirestore();
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          status: newStatus,
        });
        
        runInAction(() => {
          if (this.userData) {
            this.userData.status = newStatus;
          }
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  async pickAndUploadPhoto() {
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
        console.error('Error picking photo:', error);
        throw error;
      }
    }
  }

  private async uploadPhoto(image: Image) {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      runInAction(() => {
        this.uploadingPhoto = true;
      });

      const reference = storage().ref(`profile_photos/${currentUser.uid}`);
      
      // Convertir la URI a Blob
      const response = await fetch(image.path);
      const blob = await response.blob();

      // Subir el archivo
      await reference.put(blob);
      
      // Obtener la URL de descarga
      const downloadURL = await reference.getDownloadURL();

      // Actualizar Firestore
      const db = getFirestore();
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        photoURL: downloadURL,
      });

      runInAction(() => {
        if (this.userData) {
          this.userData.photoURL = downloadURL;
        }
        this.uploadingPhoto = false;
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      runInAction(() => {
        this.uploadingPhoto = false;
      });
      throw error;
    }
  }
} 