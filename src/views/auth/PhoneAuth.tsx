import React, { useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { observer } from 'mobx-react-lite';
import { AuthViewModel } from '../../viewmodels/AuthViewModel';
import { globalStyles } from '../../styles/globalStyles';
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';

type PhoneAuthNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PhoneAuth'>;

const PhoneAuth = observer(() => {
  const navigation = useNavigation<PhoneAuthNavigationProp>();
  const viewModel = React.useMemo(() => new AuthViewModel(), []);
  const { isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user?.uid);
      // Solo redirigimos si hay usuario y no estamos en proceso de confirmación
      if (user && !viewModel.confirmation) {
        navigation.replace('Home');
      }
    });

    return () => unsubscribe();
  }, [navigation, viewModel.confirmation]);

  const handleSignIn = async () => {
    const result = await viewModel.signInWithPhoneNumber();
    Alert.alert(result.success ? 'Éxito' : 'Error', result.message);
  };

  const handleConfirmCode = async () => {
    try {
      const result = await viewModel.confirmCode();
      if (result.success) {
        // Esperamos un momento para asegurarnos de que se complete la creación del usuario
        await new Promise(resolve => setTimeout(resolve, 2000));
        Alert.alert('Éxito', result.message);
        navigation.replace('Home');
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error en confirmación:', error);
      Alert.alert('Error', 'Ocurrió un error durante la confirmación');
    }
  };

  const handleDebugLogin = async () => {
    const result = await viewModel.handleDebugLogin();
    if (result.success) {
      Alert.alert('Debug', result.message);
      navigation.replace('Home');
    } else {
      Alert.alert('Error Debug', result.message);
    }
  };

  if (viewModel.loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: currentTheme.text }]}>
          {viewModel.confirmation ? 'Verificar Código' : 'Iniciar Sesión'}
        </Text>
        <Text style={[styles.subtitle, { color: currentTheme.secondary }]}>
          {viewModel.confirmation
            ? 'Ingresa el código de verificación enviado a tu teléfono'
            : 'Ingresa tu número de teléfono para continuar'}
        </Text>
      </View>

      {!viewModel.confirmation ? (
        <>
          <View style={[styles.inputContainer, { 
            backgroundColor: currentTheme.card,
            borderColor: currentTheme.border 
          }]}>
            <TouchableOpacity
              style={[styles.countryButton, { backgroundColor: currentTheme.background }]}
              onPress={() => viewModel.setShowCountryList(true)}>
              <Text style={[styles.countryButtonText, { color: currentTheme.text }]}>
                {viewModel.selectedCountry.code}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { 
                color: currentTheme.text,
                borderColor: currentTheme.border
              }]}
              placeholder="Número de teléfono"
              placeholderTextColor={currentTheme.secondary}
              keyboardType="phone-pad"
              value={viewModel.phoneNumber}
              onChangeText={viewModel.setPhoneNumber}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: currentTheme.primary },
              viewModel.loading && { backgroundColor: currentTheme.border }
            ]}
            onPress={handleSignIn}
            disabled={viewModel.loading}>
            <Text style={[styles.buttonText, { color: currentTheme.background }]}>
              {viewModel.loading ? 'Enviando...' : 'Enviar código'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={[styles.inputContainer, { 
            backgroundColor: currentTheme.card,
            borderColor: currentTheme.border 
          }]}>
            <TextInput
              style={[styles.input, { 
                color: currentTheme.text,
                borderColor: currentTheme.border
              }]}
              placeholder="Código de verificación"
              placeholderTextColor={currentTheme.secondary}
              keyboardType="number-pad"
              value={viewModel.verificationCode}
              onChangeText={viewModel.setVerificationCode}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: currentTheme.primary },
              viewModel.loading && { backgroundColor: currentTheme.border }
            ]}
            onPress={handleConfirmCode}
            disabled={viewModel.loading}>
            <Text style={[styles.buttonText, { color: currentTheme.background }]}>
              {viewModel.loading ? 'Verificando...' : 'Verificar código'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: currentTheme.secondary }]}
        onPress={handleDebugLogin}
        disabled={viewModel.loading}>
        <Text style={[styles.debugButtonText, { color: currentTheme.background }]}>
          Debug Login
        </Text>
      </TouchableOpacity>

      <Modal
        visible={viewModel.showCountryList}
        transparent
        animationType="slide"
        onRequestClose={() => viewModel.setShowCountryList(false)}>
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { 
            backgroundColor: currentTheme.card,
            borderColor: currentTheme.border
          }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
              Selecciona tu país
            </Text>
            <ScrollView style={styles.countryList}>
              {viewModel.countries.map((country, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.countryItem, { 
                    borderBottomColor: currentTheme.border,
                    backgroundColor: currentTheme.background
                  }]}
                  onPress={() => {
                    viewModel.setSelectedCountry(country);
                    viewModel.setShowCountryList(false);
                  }}>
                  <Text style={[styles.countryItemText, { color: currentTheme.text }]}>
                    {country.name} ({country.code})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: currentTheme.primary }]}
              onPress={() => viewModel.setShowCountryList(false)}>
              <Text style={[styles.closeButtonText, { color: currentTheme.background }]}>
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  headerContainer: {
    marginTop: 40,
    marginBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  countryButton: {
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  countryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  debugButton: {
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  debugButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  countryList: {
    maxHeight: '70%',
  },
  countryItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  countryItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default PhoneAuth; 