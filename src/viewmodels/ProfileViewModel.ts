import { makeAutoObservable, runInAction } from 'mobx';
import { User } from '../models/User';
import { getAuth } from '@react-native-firebase/auth';
import { Platform } from 'react-native';
import ImagePicker, { Image } from 'react-native-image-crop-picker';
import { loadUserProfile, updateUserName, updateUserStatus, uploadUserPhoto } from '../services/firestore';

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
        const userData = await loadUserProfile(currentUser.uid);
        
        runInAction(() => {
          this.userData = userData;
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
        await updateUserName(currentUser.uid, newName);
        
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
        await updateUserStatus(currentUser.uid, newStatus);
        
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

      const downloadURL = await uploadUserPhoto(currentUser.uid, image);

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