export interface GroupChat {
  id: string;
  name: string;
  adminIds: string[];
  participants: string[];
  photoURL?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  lastMessage?: {
    text: string;
    createdAt: Date;
    senderId: string;
    type: string;
  };
}

export class GroupChatModel implements GroupChat {
  id: string;
  name: string;
  adminIds: string[];
  participants: string[];
  photoURL?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  lastMessage?: {
    text: string;
    createdAt: Date;
    senderId: string;
    type: string;
  };

  constructor(data: Partial<GroupChat>) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.adminIds = data.adminIds || [];
    this.participants = data.participants || [];
    this.photoURL = data.photoURL || '';
    this.description = data.description || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.location = data.location;
    this.lastMessage = data.lastMessage;
  }

  toFirestore() {
    return {
      name: this.name,
      adminIds: this.adminIds,
      participants: this.participants,
      photoURL: this.photoURL,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      location: this.location,
      lastMessage: this.lastMessage,
    };
  }

  static fromFirestore(id: string, data: any): GroupChatModel {
    return new GroupChatModel({
      id,
      name: data.name,
      adminIds: data.adminIds || [],
      participants: data.participants,
      photoURL: data.photoURL,
      description: data.description,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      location: data.location,
      lastMessage: data.lastMessage
        ? {
            text: data.lastMessage.text,
            createdAt: data.lastMessage.createdAt?.toDate(),
            senderId: data.lastMessage.senderId,
            type: data.lastMessage.type,
          }
        : undefined,
    });
  }

  isAdmin(userId: string): boolean {
    return this.adminIds.includes(userId);
  }

  isParticipant(userId: string): boolean {
    return this.participants.includes(userId);
  }
}
