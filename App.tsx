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
import { getMessaging } from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';
import { getAuth } from '@react-native-firebase/auth';

// Variable global para rastrear el chat actual
let currentChatId: string | null = null;

// Función para actualizar el chat actual
export const setCurrentChatId = (chatId: string | null) => {
  currentChatId = chatId;
};

// Configurar el manejador de mensajes en segundo plano
getMessaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Mensaje recibido en segundo plano:', remoteMessage);
  
  // Aquí puedes manejar la notificación como necesites
  if (remoteMessage.notification) {
    // Mostrar la notificación
    const { title, body } = remoteMessage.notification;
    console.log('Notificación recibida:', { title, body });
  }
});

// Configurar el manejador de mensajes en primer plano
getMessaging().onMessage(async remoteMessage => {
  console.log('Mensaje recibido en primer plano:', remoteMessage);
  
  if (remoteMessage.notification) {
    // Mostrar la notificación como un pop-up
    const { title, body } = remoteMessage.notification;
    // Verificar si el mensaje es para el chat actual
    const data = remoteMessage.data;
    if (data && data.chatId && data.chatId === currentChatId) {
      // Si estamos en el chat correspondiente, no mostramos la notificación
      console.log('Mensaje recibido en el chat actual, no se muestra notificación');
      return;
    }
    // Si no estamos en el chat correspondiente, mostramos la notificación
    Toast.show({
      type: 'info',
      text1: title,
      text2: body,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: Platform.OS === 'ios' ? 50 : 30,
    });
  }
});

function AppContent(): React.JSX.Element {
  const {isDark} = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
        translucent={true}
      />
      <AppNavigator />
      <Toast />
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
