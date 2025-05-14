import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAutoObservable } from 'mobx';

class SettingsViewModel {
  private static instance: SettingsViewModel;
  private readonly THEME_KEY = '@theme';
  private readonly SECONDARY_COLOR_KEY = '@secondary_color';
  private readonly DARK_MODE_KEY = '@dark_mode';

  private constructor() {
    makeAutoObservable(this);
  }

  static getInstance(): SettingsViewModel {
    if (!SettingsViewModel.instance) {
      SettingsViewModel.instance = new SettingsViewModel();
    }
    return SettingsViewModel.instance;
  }

  async saveTheme(theme: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.THEME_KEY, theme);
    } catch (error) {
      console.error('Error al guardar el tema:', error);
    }
  }

  async loadTheme(): Promise<string> {
    try {
      const theme = await AsyncStorage.getItem(this.THEME_KEY);
      return theme || 'system';
    } catch (error) {
      console.error('Error al cargar el tema:', error);
      return 'system';
    }
  }

  async saveDarkMode(isDark: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.DARK_MODE_KEY, JSON.stringify(isDark));
    } catch (error) {
      console.error('Error al guardar el modo oscuro:', error);
    }
  }

  async loadDarkMode(): Promise<boolean> {
    try {
      const darkMode = await AsyncStorage.getItem(this.DARK_MODE_KEY);
      return darkMode ? JSON.parse(darkMode) : false;
    } catch (error) {
      console.error('Error al cargar el modo oscuro:', error);
      return false;
    }
  }

  async saveSecondaryColor(color: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SECONDARY_COLOR_KEY, color);
    } catch (error) {
      console.error('Error al guardar el color secundario:', error);
    }
  }

  async loadSecondaryColor(): Promise<string> {
    try {
      const color = await AsyncStorage.getItem(this.SECONDARY_COLOR_KEY);
      return color || '#007AFF';
    } catch (error) {
      console.error('Error al cargar el color secundario:', error);
      return '#007AFF';
    }
  }

  async loadAllSettings(): Promise<{
    theme: string;
    isDark: boolean;
    secondaryColor: string;
  }> {
    const [theme, isDark, secondaryColor] = await Promise.all([
      this.loadTheme(),
      this.loadDarkMode(),
      this.loadSecondaryColor(),
    ]);

    return {
      theme,
      isDark,
      secondaryColor,
    };
  }

  async saveAllSettings(settings: {
    theme: string;
    isDark: boolean;
    secondaryColor: string;
  }): Promise<void> {
    await Promise.all([
      this.saveTheme(settings.theme),
      this.saveDarkMode(settings.isDark),
      this.saveSecondaryColor(settings.secondaryColor),
    ]);
  }
}

export default SettingsViewModel; 