export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;
  type?: 'text' | 'image';
  imageUrl?: string;
  fromName?: string;
  groupId?: string;
  to?: string;
  status?: 'sending' | 'sent' | 'error';
  replyTo?: string;
  replyToText?: string;
  replyToType?: 'text' | 'image';
}

export class MessageModel implements Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;
  type: 'text' | 'image';
  imageUrl?: string;
  fromName?: string;
  groupId?: string;
  to?: string;
  status?: 'sending' | 'sent' | 'error';
  replyTo?: string;
  replyToText?: string;
  replyToType?: 'text' | 'image';

  constructor(data: Partial<Message>) {
    this.id = data.id || '';
    this.text = data.text || '';
    this.senderId = data.senderId || '';
    this.createdAt = data.createdAt || new Date();
    this.type = data.type || 'text';
    this.imageUrl = data.imageUrl;
    this.fromName = data.fromName;
    this.groupId = data.groupId;
    this.to = data.to;
    this.status = data.status;
    this.replyTo = data.replyTo;
    this.replyToText = data.replyToText;
    this.replyToType = data.replyToType;
  }

  toFirestore() {
    return {
      text: this.text,
      senderId: this.senderId,
      createdAt: this.createdAt,
      type: this.type,
      imageUrl: this.imageUrl,
      fromName: this.fromName,
      groupId: this.groupId,
      to: this.to,
      status: this.status,
      replyTo: this.replyTo,
      replyToText: this.replyToText,
      replyToType: this.replyToType
    };
  }

  static fromFirestore(id: string, data: any): MessageModel {
    return new MessageModel({
      id,
      text: data.text || '',
      senderId: data.senderId,
      createdAt: data.createdAt?.toDate() || new Date(),
      type: data.type || 'text',
      imageUrl: data.imageUrl,
      fromName: data.fromName,
      groupId: data.groupId,
      to: data.to,
      status: data.status,
      replyTo: data.replyTo,
      replyToText: data.replyToText,
      replyToType: data.replyToType
    });
  }
} 