import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList} from 'react-native';
import auth from '@react-native-firebase/auth';
import {createUser, getUser} from '../services/firestore';

const Home = () => {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const loadUserData = async () => {
      const currentUser = auth().currentUser;
      if (currentUser) {
        // Intentar obtener datos del usuario
        const data = await getUser(currentUser.uid);
        if (!data) {
          // Si no existe, crear el usuario
          await createUser(currentUser.uid, {
            phoneNumber: currentUser.phoneNumber,
            lastLogin: new Date(),
          });
        }
        setUserData(data);
      }
    };

    loadUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Bienvenido!</Text>
      <Text style={styles.subtitle}>
        {userData?.phoneNumber || auth().currentUser?.phoneNumber}
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Home; 