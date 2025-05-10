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

type PhoneAuthNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PhoneAuth'>;

const PhoneAuth = observer(() => {
  const navigation = useNavigation<PhoneAuthNavigationProp>();
  const viewModel = React.useMemo(() => new AuthViewModel(), []);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {viewModel.confirmation ? 'Verificar Código' : 'Iniciar Sesión'}
      </Text>
      <Text style={styles.subtitle}>
        {viewModel.confirmation
          ? 'Ingresa el código de verificación enviado a tu teléfono'
          : 'Ingresa tu número de teléfono para continuar'}
      </Text>

      {!viewModel.confirmation ? (
        <>
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.countryButton}
              onPress={() => viewModel.setShowCountryList(true)}>
              <Text style={styles.countryButtonText}>{viewModel.selectedCountry.code}</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Número de teléfono"
              keyboardType="phone-pad"
              value={viewModel.phoneNumber}
              onChangeText={viewModel.setPhoneNumber}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, viewModel.loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={viewModel.loading}>
            <Text style={styles.buttonText}>
              {viewModel.loading ? 'Enviando...' : 'Enviar código'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
        <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Código de verificación"
              keyboardType="number-pad"
              value={viewModel.verificationCode}
              onChangeText={viewModel.setVerificationCode}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, viewModel.loading && styles.buttonDisabled]}
            onPress={handleConfirmCode}
            disabled={viewModel.loading}>
            <Text style={styles.buttonText}>
              {viewModel.loading ? 'Verificando...' : 'Verificar código'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.debugButton}
        onPress={handleDebugLogin}
        disabled={viewModel.loading}>
        <Text style={styles.debugButtonText}>Debug Login</Text>
      </TouchableOpacity>

      <Modal
        visible={viewModel.showCountryList}
        transparent
        animationType="slide"
        onRequestClose={() => viewModel.setShowCountryList(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona tu país</Text>
            <ScrollView>
              {viewModel.countries.map((country, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.countryItem}
                  onPress={() => {
                    viewModel.setSelectedCountry(country);
                    viewModel.setShowCountryList(false);
                  }}>
                  <Text style={styles.countryItemText}>
                    {country.name} ({country.code})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => viewModel.setShowCountryList(false)}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
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
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  countryButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
  },
  countryButtonText: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  verificationInput: {
    marginBottom: 20,
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    height: 50,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugButton: {
    backgroundColor: '#FF9500',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  debugButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  countryItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  countryItemText: {
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  closeButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PhoneAuth; 