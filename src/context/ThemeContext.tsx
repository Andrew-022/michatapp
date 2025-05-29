import React, {createContext, useContext, useEffect, useState} from 'react';
import {useColorScheme} from 'react-native';
import {lightTheme, darkTheme} from '../constants/theme';
import SettingsViewModel from '../viewmodels/SettingsViewModel';

type Theme = 'light' | 'dark' | 'system';

const DEFAULT_PRIMARY_COLOR = '#007AFF';
const DEFAULT_SECONDARY_COLOR = '#007AFF';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  currentTheme: typeof lightTheme;
  secondaryColor: string;
  setSecondaryColor: (color: string) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);
  const [secondaryColor, setSecondaryColorState] = useState(DEFAULT_SECONDARY_COLOR);
  const [primaryColor, setPrimaryColorState] = useState(DEFAULT_PRIMARY_COLOR);
  const settingsViewModel = SettingsViewModel.getInstance();

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await settingsViewModel.loadAllSettings();
      setThemeState(settings.theme as Theme);
      if (settings.theme !== 'system') {
        setIsDark(settings.isDark);
      } else {
        setIsDark(systemColorScheme === 'dark');
      }
      setSecondaryColorState(settings.secondaryColor || DEFAULT_SECONDARY_COLOR);
      setPrimaryColorState(settings.primaryColor || DEFAULT_PRIMARY_COLOR);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (theme === 'system') {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [theme, systemColorScheme]);

  const setTheme = async (newTheme: Theme) => {
    const newIsDark = newTheme === 'system' ? systemColorScheme === 'dark' : newTheme === 'dark';
    await settingsViewModel.saveAllSettings({
      theme: newTheme,
      isDark: newIsDark,
      secondaryColor: secondaryColor || DEFAULT_SECONDARY_COLOR,
      primaryColor: primaryColor || DEFAULT_PRIMARY_COLOR,
    });
    setThemeState(newTheme);
    setIsDark(newIsDark);
  };

  const setSecondaryColor = async (color: string) => {
    const newColor = color || DEFAULT_SECONDARY_COLOR;
    setSecondaryColorState(newColor);
    await settingsViewModel.saveSecondaryColor(newColor);
  };

  const setPrimaryColor = async (color: string) => {
    const newColor = color || DEFAULT_PRIMARY_COLOR;
    setPrimaryColorState(newColor);
    await settingsViewModel.savePrimaryColor(newColor);
  };

  const currentTheme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        setTheme,
        currentTheme,
        secondaryColor: secondaryColor || DEFAULT_SECONDARY_COLOR,
        setSecondaryColor,
        primaryColor: primaryColor || DEFAULT_PRIMARY_COLOR,
        setPrimaryColor,
      }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
}; 