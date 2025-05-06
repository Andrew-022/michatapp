export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;
}

export class MessageModel implements Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;

  constructor(data: Partial<Message>) {
    this.id = data.id || '';
    this.text = data.text || '';
    this.senderId = data.senderId || '';
    this.createdAt = data.createdAt || new Date();
  }

  toFirestore() {
    return {
      text: this.text,
      senderId: this.senderId,
      createdAt: this.createdAt,
    };
  }

  static fromFirestore(id: string, data: any): MessageModel {
    return new MessageModel({
      id,
      text: data.text,
      senderId: data.senderId,
      createdAt: data.createdAt?.toDate() || new Date(),
    });
  }
} 