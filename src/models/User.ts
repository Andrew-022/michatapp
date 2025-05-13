export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  photoURL?: string;
  lastLogin: Date;
}

export class UserModel implements User {
  id: string;
  phoneNumber: string;
  name: string;
  photoURL?: string;
  lastLogin: Date;

  constructor(data: Partial<User>) {
    this.id = data.id || '';
    this.phoneNumber = data.phoneNumber || '';
    this.name = data.name || 'Usuario';
    this.photoURL = data.photoURL;
    this.lastLogin = data.lastLogin || new Date();
  }

  toFirestore() {
    return {
      phoneNumber: this.phoneNumber,
      name: this.name,
      photoURL: this.photoURL,
      lastLogin: this.lastLogin,
    };
  }

  static fromFirestore(id: string, data: any): UserModel {
    return new UserModel({
      id,
      phoneNumber: data.phoneNumber,
      name: data.name,
      photoURL: data.photoURL,
      lastLogin: data.lastLogin?.toDate(),
    });
  }
} 