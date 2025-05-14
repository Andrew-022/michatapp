import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {useTheme} from '../../context/ThemeContext';
import {lightTheme, darkTheme} from '../../constants/theme';
import SettingsViewModel from '../../viewmodels/SettingsViewModel';

const colorOptions = [
  { name: 'Azul', value: '#007AFF' },
  { name: 'Verde', value: '#34C759' },
  { name: 'Rojo', value: '#FF3B30' },
  { name: 'Naranja', value: '#FF9500' },
  { name: 'Púrpura', value: '#AF52DE' },
  { name: 'Rosa', value: '#FF2D55' },
  { name: 'Amarillo', value: '#FFCC00' },
  { name: 'Turquesa', value: '#5AC8FA' },
];

const SettingsScreen: React.FC = () => {
  const {theme, isDark, setTheme, setSecondaryColor, secondaryColor} = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const settingsViewModel = SettingsViewModel.getInstance();

  const [tempTheme, setTempTheme] = useState(theme);
  const [tempIsDark, setTempIsDark] = useState(isDark);
  const [tempSecondaryColor, setTempSecondaryColor] = useState(secondaryColor);

  const handleSystemThemeChange = (value: boolean) => {
    const newTheme = value ? 'system' : (tempIsDark ? 'dark' : 'light');
    setTempTheme(newTheme);
    setTheme(newTheme);
  };

  const handleDarkModeChange = (value: boolean) => {
    setTempIsDark(value);
    setTheme(value ? 'dark' : 'light');
  };

  const handleColorSelect = (color: string) => {
    setTempSecondaryColor(color);
    setSecondaryColor(color);
  };

  const handleSaveSettings = async () => {
    try {
      await settingsViewModel.saveAllSettings({
        theme: tempTheme,
        isDark: tempIsDark,
        secondaryColor: tempSecondaryColor,
      });
      
      Alert.alert(
        'Configuración guardada',
        'Los cambios se han guardado correctamente',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudieron guardar los cambios',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: currentTheme.background}]}>
      <ScrollView>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: currentTheme.text}]}>
            Apariencia
          </Text>
          
          <View style={styles.option}>
            <Text style={[styles.optionText, {color: currentTheme.text}]}>
              Tema del sistema
            </Text>
            <Switch
              value={tempTheme === 'system'}
              onValueChange={handleSystemThemeChange}
              trackColor={{false: currentTheme.border, true: currentTheme.primary}}
            />
          </View>

          <View style={styles.option}>
            <Text style={[styles.optionText, {color: currentTheme.text}]}>
              Modo oscuro
            </Text>
            <Switch
              value={tempIsDark}
              onValueChange={handleDarkModeChange}
              trackColor={{false: currentTheme.border, true: currentTheme.primary}}
              disabled={tempTheme === 'system'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: currentTheme.text}]}>
            Color de los mensajes
          </Text>
          <Text style={[styles.sectionDescription, {color: currentTheme.secondary}]}>
            Selecciona el color que se usará en los mensajes y elementos secundarios
          </Text>
          
          <View style={styles.colorGrid}>
            {colorOptions.map((color) => (
              <TouchableOpacity
                key={color.value}
                style={[
                  styles.colorOption,
                  { backgroundColor: color.value },
                  tempSecondaryColor === color.value && styles.selectedColor,
                ]}
                onPress={() => handleColorSelect(color.value)}>
                {tempSecondaryColor === color.value && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: currentTheme.primary }]}
          onPress={handleSaveSettings}>
          <Text style={[styles.saveButtonText, { color: currentTheme.background }]}>
            Guardar Cambios
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  sectionDescription: {
    fontSize: 14,
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
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  checkmark: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 30,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  saveButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen; 