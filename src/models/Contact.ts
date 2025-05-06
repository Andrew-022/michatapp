export interface Contact {
  recordID: string;
  firstName: string;
  lastName: string;
  phoneNumbers: {
    label: string;
    number: string;
  }[];
}

export class ContactModel implements Contact {
  recordID: string;
  firstName: string;
  lastName: string;
  phoneNumbers: {
    label: string;
    number: string;
  }[];

  constructor(data: Contact) {
    this.recordID = data.recordID;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phoneNumbers = data.phoneNumbers;
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  getInitials(): string {
    const firstInitial = this.firstName?.charAt(0) || '';
    const lastInitial = this.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase() || '?';
  }
} 