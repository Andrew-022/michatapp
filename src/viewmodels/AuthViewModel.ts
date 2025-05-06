import { makeAutoObservable, runInAction, action } from 'mobx';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { CountryModel } from '../models/Country';

export class AuthViewModel {
  phoneNumber: string = '';
  confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;
  verificationCode: string = '';
  loading: boolean = false;
  showCountryList: boolean = false;
  selectedCountry: CountryModel;
  countries: CountryModel[];

  constructor() {
    this.countries = CountryModel.getDefaultCountries();
    this.selectedCountry = this.countries[0];
    makeAutoObservable(this, {
      setPhoneNumber: action,
      setVerificationCode: action,
      setShowCountryList: action,
      setSelectedCountry: action,
    });
  }

  setPhoneNumber = (number: string) => {
    runInAction(() => {
      this.phoneNumber = number;
    });
  };

  setVerificationCode = (code: string) => {
    runInAction(() => {
      this.verificationCode = code;
    });
  };

  setShowCountryList = (show: boolean) => {
    runInAction(() => {
      this.showCountryList = show;
    });
  };

  setSelectedCountry = (country: CountryModel) => {
    runInAction(() => {
      this.selectedCountry = country;
    });
  };

  async signInWithPhoneNumber(): Promise<{ success: boolean; message: string }> {
    if (!this.phoneNumber) {
      return { success: false, message: 'Por favor ingresa un número de teléfono' };
    }

    try {
      runInAction(() => {
        this.loading = true;
      });
      const fullNumber = `${this.selectedCountry.code}${this.phoneNumber}`;
      this.confirmation = await auth().signInWithPhoneNumber(fullNumber);
      return { success: true, message: 'Código de verificación enviado' };
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        return {
          success: false,
          message: 'Demasiados intentos. Por favor, espera aproximadamente 1 hora antes de intentar nuevamente o usa el botón de Debug para iniciar sesión.',
        };
      } else if (error.code === 'auth/app-not-authorized') {
        return {
          success: false,
          message: 'La aplicación no está autorizada para usar Firebase Authentication. Por favor, asegúrate de que el SHA-1 del emulador esté registrado en la consola de Firebase.',
        };
      }
      return { success: false, message: error.message || 'Error al enviar el código' };
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  async confirmCode(): Promise<{ success: boolean; message: string }> {
    if (!this.verificationCode) {
      return { success: false, message: 'Por favor ingresa el código de verificación' };
    }

    if (!this.confirmation) {
      return { success: false, message: 'No hay una confirmación pendiente' };
    }

    try {
      runInAction(() => {
        this.loading = true;
      });
      await this.confirmation.confirm(this.verificationCode);
      return { success: true, message: '¡Inicio de sesión exitoso!' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Código inválido' };
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  async handleDebugLogin(): Promise<{ success: boolean; message: string }> {
    try {
      runInAction(() => {
        this.loading = true;
      });
      const db = firestore();
      const docRef = db.collection('debug_tokens').doc('gmaTRZUdXYW3fPE9ZP28vyx621A3');
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('El documento de debug no existe en Firestore');
      }

      const data = doc.data();
      if (!data?.token) {
        throw new Error('No se encontró el token en el documento');
      }

      await auth().signInWithCustomToken(data.token);
      return { success: true, message: 'Inicio de sesión exitoso' };
    } catch (error: any) {
      return {
        success: false,
        message: `Error al iniciar sesión: ${error.message}\n\nCódigo: ${error.code || 'N/A'}`,
      };
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }
} 