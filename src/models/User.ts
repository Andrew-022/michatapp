export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  photoURL?: string;
  lastLogin: Date;
  status?: string;
  isPhoneNumberPublic: boolean;
}

export class UserModel implements User {
  id: string;
  phoneNumber: string;
  name: string;
  photoURL?: string;
  lastLogin: Date;
  status?: string;
  isPhoneNumberPublic: boolean;

  constructor(data: Partial<User>) {
    this.id = data.id || '';
    this.phoneNumber = data.phoneNumber || '';
    this.name = data.name || 'Usuario';
    this.photoURL = data.photoURL;
    this.lastLogin = data.lastLogin || new Date();
    this.status = data.status || '¡Hola! Estoy usando MichatApp';
    this.isPhoneNumberPublic = data.isPhoneNumberPublic ?? true;
  }

  toFirestore() {
    return {
      phoneNumber: this.phoneNumber,
      name: this.name,
      photoURL: this.photoURL,
      lastLogin: this.lastLogin,
      status: this.status,
      isPhoneNumberPublic: this.isPhoneNumberPublic,
    };
  }

  static fromFirestore(id: string, data: any): UserModel {
    return new UserModel({
      id,
      phoneNumber: data.phoneNumber,
      name: data.name,
      photoURL: data.photoURL,
      lastLogin: data.lastLogin?.toDate(),
      status: data.status,
      isPhoneNumberPublic: data.isPhoneNumberPublic ?? true,
    });
  }
} 