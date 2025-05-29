/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {SafeAreaView, StatusBar, StyleSheet, Platform} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import {ThemeProvider, useTheme} from './src/context/ThemeContext';
import {lightTheme, darkTheme} from './src/constants/theme';
import messaging from '@react-native-firebase/messaging';

// Configurar el manejador de mensajes en segundo plano
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Mensaje recibido en segundo plano:', remoteMessage);
  // Aquí puedes manejar la lógica para los mensajes en segundo plano
  // Por ejemplo, mostrar notificaciones locales
});

function AppContent(): React.JSX.Element {
  const {isDark} = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  async function requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  
    if (enabled) {
      console.log('Authorization status:', authStatus);
    }
  }

  const getToken = async () => {
    const token = await messaging().getToken();
    console.log('Token:', token);
  }

  useEffect(() => {
    requestUserPermission();
    getToken();

    // Configurar el manejador de mensajes en primer plano
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Mensaje recibido en primer plano:', remoteMessage);
      // Aquí puedes manejar la lógica para los mensajes en primer plano
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
        translucent={true}
      />
      <AppNavigator />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
