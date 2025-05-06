export interface Contact {
  recordID: string;
  givenName: string;
  familyName: string;
  phoneNumbers: {
    label: string;
    number: string;
  }[];
}

export class ContactModel implements Contact {
  recordID: string;
  givenName: string;
  familyName: string;
  phoneNumbers: {
    label: string;
    number: string;
  }[];

  constructor(data: Contact) {
    this.recordID = data.recordID;
    this.givenName = data.givenName;
    this.familyName = data.familyName;
    this.phoneNumbers = data.phoneNumbers;
  }

  getFullName(): string {
    return `${this.givenName} ${this.familyName}`.trim();
  }

  getInitials(): string {
    const firstInitial = this.givenName?.charAt(0) || '';
    const lastInitial = this.familyName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase() || '?';
  }
} 