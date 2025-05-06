export interface Chat {
  id: string;
  participants: string[];
  updatedAt?: Date;
  lastMessage?: {
    text: string;
    createdAt: Date;
  };
}

export class ChatModel implements Chat {
  id: string;
  participants: string[];
  updatedAt?: Date;
  lastMessage?: {
    text: string;
    createdAt: Date;
  };

  constructor(data: Partial<Chat>) {
    this.id = data.id || '';
    this.participants = data.participants || [];
    this.updatedAt = data.updatedAt;
    this.lastMessage = data.lastMessage;
  }

  toFirestore() {
    return {
      participants: this.participants,
      updatedAt: this.updatedAt,
      lastMessage: this.lastMessage,
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
            createdAt: data.lastMessage.createdAt?.toDate(),
          }
        : undefined,
    });
  }

  getOtherParticipantId(currentUserId: string): string | undefined {
    return this.participants.find(id => id !== currentUserId);
  }
} 