import React, {createContext, useContext, useState, useEffect} from 'react';
import {useColorScheme} from 'react-native';
import SettingsViewModel from '../viewmodels/SettingsViewModel';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  isDark: false,
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('system');
  const settingsViewModel = SettingsViewModel.getInstance();

  const isDark =
    theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark';

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    await settingsViewModel.setTheme(newTheme);
  };

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await settingsViewModel.getTheme();
      if (savedTheme) {
        setThemeState(savedTheme);
      }
    };
    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{theme, isDark, setTheme}}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 