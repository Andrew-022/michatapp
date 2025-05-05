import React, { useState, useEffect } from 'react';
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
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type PhoneAuthNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PhoneAuth'>;

// Lista de países con sus códigos
const countries = [
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
];

const PhoneAuth = () => {
  const navigation = useNavigation<PhoneAuthNavigationProp>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirm, setConfirm] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryList, setShowCountryList] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        navigation.replace('Home');
      }
    });

    return () => unsubscribe();
  }, [navigation]);

  async function signInWithPhoneNumber() {
    if (!phoneNumber) {
      Alert.alert('Error', 'Por favor ingresa un número de teléfono');
      return;
    }

    try {
      setLoading(true);
      const fullNumber = `${selectedCountry.code}${phoneNumber}`;
      const confirmation = await auth().signInWithPhoneNumber(fullNumber);
      setConfirm(confirmation);
      Alert.alert('Éxito', 'Código de verificación enviado');
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        Alert.alert(
          'Demasiados intentos',
          'Por seguridad, hemos bloqueado temporalmente las solicitudes desde este dispositivo. Por favor, espera aproximadamente 1 hora antes de intentar nuevamente o usa el botón de Debug para iniciar sesión.'
        );
      } else if (error.code === 'auth/app-not-authorized') {
        Alert.alert(
          'Error de autorización',
          'La aplicación no está autorizada para usar Firebase Authentication. Por favor, asegúrate de que el SHA-1 del emulador esté registrado en la consola de Firebase.'
        );
      } else {
        Alert.alert('Error', error.message || 'Error al enviar el código');
      }
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode() {
    if (!code) {
      Alert.alert('Error', 'Por favor ingresa el código de verificación');
      return;
    }

    if (!confirm) {
      Alert.alert('Error', 'No hay una confirmación pendiente');
      return;
    }

    try {
      setLoading(true);
      await confirm.confirm(code);
      Alert.alert('Éxito', '¡Inicio de sesión exitoso!');
      navigation.replace('Home');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  }

  const handleDebugLogin = async () => {
    try {
      setLoading(true);
      console.log('Iniciando proceso de debug login...');
      
      // Verificar que Firestore está inicializado
      const db = firestore();
      console.log('Firestore inicializado');
      
      // Intentar obtener el documento
      const docRef = db.collection('debug_tokens').doc('gmaTRZUdXYW3fPE9ZP28vyx621A3');
      console.log('Referencia al documento creada');
      
      const doc = await docRef.get();
      console.log('Documento obtenido:', doc.exists ? 'existe' : 'no existe');
      
      if (!doc.exists) {
        throw new Error('El documento de debug no existe en Firestore');
      }

      const data = doc.data();
      console.log('Datos del documento:', data);
      
      if (!data?.token) {
        throw new Error('No se encontró el token en el documento');
      }

      console.log('Token encontrado, intentando iniciar sesión...');
      await auth().signInWithCustomToken(data.token);
      console.log('Inicio de sesión exitoso');
      Alert.alert('Debug', 'Inicio de sesión exitoso');
      navigation.replace('Home');
    } catch (error: any) {
      console.error('Error completo:', error);
      Alert.alert(
        'Error Debug',
        `Error al iniciar sesión: ${error.message}\n\nCódigo: ${error.code || 'N/A'}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      <Text style={styles.subtitle}>
        Ingresa tu número de teléfono para continuar
      </Text>

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.countryButton}
          onPress={() => setShowCountryList(true)}>
          <Text style={styles.countryButtonText}>{selectedCountry.code}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Número de teléfono"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />
      </View>

      {!confirm ? (
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={signInWithPhoneNumber}
          disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Enviando...' : 'Enviar código'}
          </Text>
        </TouchableOpacity>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Código de verificación"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={confirmCode}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Verificando...' : 'Verificar código'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.debugButton}
        onPress={handleDebugLogin}
        disabled={loading}>
        <Text style={styles.debugButtonText}>Debug Login</Text>
      </TouchableOpacity>

      <Modal
        visible={showCountryList}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryList(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona tu país</Text>
            <ScrollView>
              {countries.map((country, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.countryItem}
                  onPress={() => {
                    setSelectedCountry(country);
                    setShowCountryList(false);
                  }}>
                  <Text style={styles.countryItemText}>
                    {country.name} ({country.code})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCountryList(false)}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

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
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  countryButton: {
    backgroundColor: '#F2F2F7',
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  countryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#B4B4B4',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  debugButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  countryItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  countryItemText: {
    fontSize: 16,
  },
  closeButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PhoneAuth; 