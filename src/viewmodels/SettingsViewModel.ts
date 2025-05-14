import {makeAutoObservable} from 'mobx';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'light' | 'dark' | 'system';

class SettingsViewModel {
  private static instance: SettingsViewModel;
  private readonly THEME_KEY = '@theme_preference';

  private constructor() {
    makeAutoObservable(this);
    this.loadThemePreference();
  }

  static getInstance(): SettingsViewModel {
    if (!SettingsViewModel.instance) {
      SettingsViewModel.instance = new SettingsViewModel();
    }
    return SettingsViewModel.instance;
  }

  private async loadThemePreference() {
    try {
      const savedTheme = await AsyncStorage.getItem(this.THEME_KEY);
      if (savedTheme) {
        this.setTheme(savedTheme as ThemeType);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  }

  async getTheme(): Promise<ThemeType | null> {
    try {
      const theme = await AsyncStorage.getItem(this.THEME_KEY);
      return theme as ThemeType;
    } catch (error) {
      console.error('Error getting theme preference:', error);
      return null;
    }
  }

  async setTheme(theme: ThemeType) {
    try {
      await AsyncStorage.setItem(this.THEME_KEY, theme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }
}

export default SettingsViewModel; 