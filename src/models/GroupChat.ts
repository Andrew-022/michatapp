export interface GroupChat {
  id: string;
  name: string;
  adminId: string;
  participants: string[];
  updatedAt?: Date;
  lastMessage?: {
    text: string;
    createdAt: Date;
    senderId: string;
  };
}

export class GroupChatModel implements GroupChat {
  id: string;
  name: string;
  adminId: string;
  participants: string[];
  updatedAt?: Date;
  lastMessage?: {
    text: string;
    createdAt: Date;
    senderId: string;
  };

  constructor(data: Partial<GroupChat>) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.adminId = data.adminId || '';
    this.participants = data.participants || [];
    this.updatedAt = data.updatedAt;
    this.lastMessage = data.lastMessage;
  }

  toFirestore() {
    return {
      name: this.name,
      adminId: this.adminId,
      participants: this.participants,
      updatedAt: this.updatedAt,
      lastMessage: this.lastMessage,
    };
  }

  static fromFirestore(id: string, data: any): GroupChatModel {
    return new GroupChatModel({
      id,
      name: data.name,
      adminId: data.adminId,
      participants: data.participants,
      updatedAt: data.updatedAt?.toDate(),
      lastMessage: data.lastMessage
        ? {
            text: data.lastMessage.text,
            createdAt: data.lastMessage.createdAt?.toDate(),
            senderId: data.lastMessage.senderId,
          }
        : undefined,
    });
  }

  isAdmin(userId: string): boolean {
    return this.adminId === userId;
  }

  isParticipant(userId: string): boolean {
    return this.participants.includes(userId);
  }
}
