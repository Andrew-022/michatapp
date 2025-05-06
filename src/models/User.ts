export interface User {
  id: string;
  phoneNumber: string | null;
  lastLogin: Date;
}

export class UserModel implements User {
  id: string;
  phoneNumber: string | null;
  lastLogin: Date;

  constructor(data: Partial<User>) {
    this.id = data.id || '';
    this.phoneNumber = data.phoneNumber || null;
    this.lastLogin = data.lastLogin || new Date();
  }

  toFirestore() {
    return {
      phoneNumber: this.phoneNumber,
      lastLogin: this.lastLogin,
    };
  }

  static fromFirestore(id: string, data: any): UserModel {
    return new UserModel({
      id,
      phoneNumber: data.phoneNumber,
      lastLogin: data.lastLogin?.toDate() || new Date(),
    });
  }
} 