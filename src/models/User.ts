export interface User {
  id: string;
  phoneNumber: string | null;
  lastLogin: Date;
  name: string;
}

export class UserModel implements User {
  id: string;
  phoneNumber: string | null;
  lastLogin: Date;
  name: string;

  constructor(data: Partial<User>) {
    this.id = data.id || '';
    this.phoneNumber = data.phoneNumber || null;
    this.lastLogin = data.lastLogin || new Date();
    this.name = data.name || '';
  }

  toFirestore() {
    return {
      phoneNumber: this.phoneNumber,
      lastLogin: this.lastLogin,
      name: this.name,
    };
  }

  static fromFirestore(id: string, data: any): UserModel {
    return new UserModel({
      id,
      phoneNumber: data.phoneNumber,
      lastLogin: data.lastLogin?.toDate() || new Date(),
      name: data.name || '',
    });
  }
} 