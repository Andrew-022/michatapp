import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  SafeAreaView,
} from 'react-native';
import {useTheme} from '../../context/ThemeContext';
import {lightTheme, darkTheme} from '../../constants/theme';

const SettingsScreen: React.FC = () => {
  const {theme, isDark, setTheme} = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;

  const handleSystemThemeChange = (value: boolean) => {
    setTheme(value ? 'system' : (isDark ? 'dark' : 'light'));
  };

  const handleDarkModeChange = (value: boolean) => {
    setTheme(value ? 'dark' : 'light');
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: currentTheme.background}]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: currentTheme.text}]}>
          Apariencia
        </Text>
        
        <View style={styles.option}>
          <Text style={[styles.optionText, {color: currentTheme.text}]}>
            Tema del sistema
          </Text>
          <Switch
            value={theme === 'system'}
            onValueChange={handleSystemThemeChange}
            trackColor={{false: currentTheme.border, true: currentTheme.primary}}
          />
        </View>

        <View style={styles.option}>
          <Text style={[styles.optionText, {color: currentTheme.text}]}>
            Modo oscuro
          </Text>
          <Switch
            value={isDark}
            onValueChange={handleDarkModeChange}
            trackColor={{false: currentTheme.border, true: currentTheme.primary}}
            disabled={theme === 'system'}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  optionText: {
    fontSize: 16,
  },
});

export default SettingsScreen; 