export interface Country {
  name: string;
  code: string;
}

export class CountryModel implements Country {
  name: string;
  code: string;

  constructor(data: Country) {
    this.name = data.name;
    this.code = data.code;
  }

  static getDefaultCountries(): CountryModel[] {
    return [
      { name: 'España', code: '+34' },
      { name: 'México', code: '+52' },
      { name: 'Colombia', code: '+57' },
      { name: 'Argentina', code: '+54' },
      { name: 'Chile', code: '+56' },
      { name: 'Perú', code: '+51' },
      { name: 'Venezuela', code: '+58' },
      { name: 'Ecuador', code: '+593' },
      { name: 'Estados Unidos', code: '+1' },
      { name: 'Reino Unido', code: '+44' },
    ].map(country => new CountryModel(country));
  }
} 