export interface Chat {
  id: string;
  participants: string[];
  updatedAt?: Date;
  lastMessage?: {
    text: string;
    createdAt: Date;
    type: string;
  };
  unreadCount?: { [userId: string]: number };
}

export class ChatModel implements Chat {
  id: string;
  participants: string[];
  updatedAt?: Date;
  lastMessage?: {
    text: string;
    createdAt: Date;
    type: string;
  };
  unreadCount?: { [userId: string]: number };

  constructor(data: Partial<Chat>) {
    this.id = data.id || '';
    this.participants = data.participants || [];
    this.updatedAt = data.updatedAt;
    this.lastMessage = data.lastMessage;
    this.unreadCount = data.unreadCount || {};
  }

  toFirestore() {
    return {
      participants: this.participants,
      updatedAt: this.updatedAt,
      lastMessage: this.lastMessage,
      unreadCount: this.unreadCount,
    };
  }

  static fromFirestore(id: string, data: any): ChatModel {
    return new ChatModel({
      id,
      participants: data.participants,
      updatedAt: data.updatedAt?.toDate(),
      lastMessage: data.lastMessage
        ? {
            text: data.lastMessage.text,
            type: data.lastMessage.type,
            createdAt: data.lastMessage.createdAt?.toDate(),
          }
        : undefined,
      unreadCount: data.unreadCount || {},
    });
  }

  getOtherParticipantId(currentUserId: string): string | undefined {
    return this.participants.find(id => id !== currentUserId);
  }

  getUnreadCount(userId: string): number {
    return this.unreadCount?.[userId] || 0;
  }
} 