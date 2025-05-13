import { makeAutoObservable, runInAction, action } from 'mobx';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { CountryModel } from '../models/Country';
import { createUser, COLLECTIONS } from '../services/firestore';

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

  private async createUserIfNotExists(currentUser: FirebaseAuthTypes.User): Promise<void> {
    console.log('Iniciando createUserIfNotExists para:', currentUser.uid);
    const userDoc = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(currentUser.uid)
      .get();
    
    console.log('Usuario existe en Firestore:', userDoc.exists);
    
    if (!userDoc.exists) {
      console.log('Creando nuevo usuario...');
      // Si el usuario no existe, lo creamos
      await createUser(currentUser.uid, {
        phoneNumber: currentUser.phoneNumber || '',
        name: "Usuario Nuevo",
        createdAt: new Date(),
        lastLogin: new Date(),
        photoURL: "https://i.pinimg.com/222x/57/70/f0/5770f01a32c3c53e90ecda61483ccb08.jpg"
      });
      console.log('Usuario creado exitosamente');
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
      
      console.log('Iniciando confirmación de código...');
      // Confirmar el código
      await this.confirmation.confirm(this.verificationCode);
      console.log('Código confirmado exitosamente');
      
      // Esperar a que el usuario esté disponible
      let currentUser = auth().currentUser;
      let attempts = 0;
      console.log('Esperando usuario...');
      while (!currentUser && attempts < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentUser = auth().currentUser;
        attempts++;
        console.log('Intento', attempts, 'de obtener usuario');
      }

      console.log('Usuario obtenido:', currentUser?.uid);
      if (!currentUser) {
        return { success: false, message: 'Error al obtener el usuario actual' };
      }

      // Crear usuario si no existe
      await this.createUserIfNotExists(currentUser);

      // Limpiar el estado de confirmación
      runInAction(() => {
        this.confirmation = null;
        this.verificationCode = '';
      });

      return { success: true, message: '¡Inicio de sesión exitoso!' };
    } catch (error: any) {
      console.error('Error en confirmCode:', error);
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