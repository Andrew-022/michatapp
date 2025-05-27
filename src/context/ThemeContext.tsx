import React, {createContext, useContext, useEffect, useState} from 'react';
import {useColorScheme} from 'react-native';
import {lightTheme, darkTheme} from '../constants/theme';
import SettingsViewModel from '../viewmodels/SettingsViewModel';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  currentTheme: typeof lightTheme;
  secondaryColor: string;
  setSecondaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);
  const [secondaryColor, setSecondaryColorState] = useState('#007AFF');
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
      setSecondaryColorState(settings.secondaryColor);
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
      secondaryColor,
    });
    setThemeState(newTheme);
    setIsDark(newIsDark);
  };

  const setSecondaryColor = async (color: string) => {
    setSecondaryColorState(color);
    await settingsViewModel.saveSecondaryColor(color);
  };

  const currentTheme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        setTheme,
        currentTheme,
        secondaryColor,
        setSecondaryColor,
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