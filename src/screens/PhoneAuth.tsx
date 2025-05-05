import React, { useEffect, useState } from 'react';
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


const db = firestore();
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryList, setShowCountryList] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);

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
    } catch (error) {
      Alert.alert('Error', error.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  }

  const handleDebugLogin = async () => {
    try {
      setLoading(true);
      console.log('Iniciando proceso de debug login...');
      
      
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
    } catch (error) {
      console.error('Error completo:', error);
      Alert.alert(
        'Error Debug',
        `Error al iniciar sesión: ${error.message}\n\nCódigo: ${error.code || 'N/A'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const CountrySelector = () => (
    <Modal
      visible={showCountryList}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCountryList(false)}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Selecciona tu país</Text>
          <ScrollView style={styles.countryList}>
            {countries.map((country, index) => (
              <TouchableOpacity
                key={index}
                style={styles.countryButton}
                onPress={() => {
                  setSelectedCountry(country);
                  setShowCountryList(false);
                }}>
                <Text style={styles.countryName}>{country.name}</Text>
                <Text style={styles.countryCode}>{country.code}</Text>
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
  );

  return (
    <View style={styles.container}>
      {!confirm ? (
        <>
          <Text style={styles.title}>Ingresa tu número de teléfono</Text>
          <View style={styles.phoneInputContainer}>
            <TouchableOpacity
              style={styles.countrySelector}
              onPress={() => setShowCountryList(true)}>
              <Text style={styles.countrySelectorText}>
                {selectedCountry.code}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={styles.phoneInput}
              placeholder="1234567890"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={signInWithPhoneNumber}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Enviar código</Text>
            )}
          </TouchableOpacity>
          
          {/* Botón de Debug */}
          <TouchableOpacity
            style={[styles.debugButton, loading && styles.buttonDisabled]}
            onPress={handleDebugLogin}
            disabled={loading}>
            <Text style={styles.debugButtonText}>Debug Login</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.title}>Ingresa el código de verificación</Text>
          <Text style={styles.subtitle}>
            Te hemos enviado un código por SMS
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Código de verificación"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={confirmCode}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Verificar código</Text>
            )}
          </TouchableOpacity>
        </>
      )}
      <CountrySelector />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    fontSize: 18,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  countrySelector: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    backgroundColor: '#f9f9f9',
    minWidth: 80,
    alignItems: 'center',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    fontSize: 18,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#f9f9f9',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  countryList: {
    maxHeight: 400,
  },
  countryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  countryName: {
    fontSize: 18,
    color: '#333',
  },
  countryCode: {
    fontSize: 18,
    color: '#666',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  countrySelectorText: {
    fontSize: 18,
    color: '#333',
  },
  debugButton: {
    backgroundColor: '#FF9500',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PhoneAuth; 