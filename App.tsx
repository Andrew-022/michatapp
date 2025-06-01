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
import { getNavigation } from './src/services/navigation';

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
  
  if (remoteMessage.notification) {
    // Mostrar la notificación como un pop-up
    const { title, body } = remoteMessage.notification;
    // Verificar si el mensaje es para el chat actual
    const data = remoteMessage.data;
    
    if (data && (data.chatId === currentChatId || data.groupId === currentChatId)) {
      // Si estamos en el chat correspondiente, no mostramos la notificación
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
      onPress: () => {
        // Cuando se presiona el Toast, navegar al chat
        if (data && (data.chatId || data.groupId)) {
          const navigation = getNavigation();
          if (navigation) {
            if (data.type === 'group_message') {
              navigation.navigate('GroupChat', {
                groupId: String(data.groupId)
              });
            } else if (data.type === 'chat_message') {
              navigation.navigate('Chat', {
                chatId: String(data.chatId),
                otherParticipantId: String(data.otherParticipantId)
              });
            }
          }
        }
      }
    });
  }
});

// Agregar el manejador para cuando se abre la app desde una notificación
getMessaging().onNotificationOpenedApp(remoteMessage => {
  
  if (remoteMessage.data && (remoteMessage.data.chatId || remoteMessage.data.groupId)) {
    const navigation = getNavigation();
    if (navigation) {
      if (remoteMessage.data.type === 'group_message') {
        console.log('Navegando a GroupChat' + remoteMessage.data.groupId);
        navigation.navigate('GroupChat', {
          groupId: String(remoteMessage.data.groupId)
        });
      } else if (remoteMessage.data.type === 'chat_message') {
        navigation.navigate('Chat', {
          chatId: String(remoteMessage.data.chatId),
          otherParticipantId: String(remoteMessage.data.otherParticipantId)
        });
      }
    }
  }
});

// Verificar si la app fue abierta desde una notificación
getMessaging()
  .getInitialNotification()
  .then(remoteMessage => {
    if (remoteMessage) {
      console.log('App abierta desde notificación en estado cerrado:', remoteMessage);
      
      if (remoteMessage.data && (remoteMessage.data.chatId || remoteMessage.data.groupId)) {
        const navigation = getNavigation();
        if (navigation) {
          if (remoteMessage.data.type === 'group_message') {
            navigation.navigate('GroupChat', {
              groupId: String(remoteMessage.data.groupId)
            });
          } else if (remoteMessage.data.type === 'chat_message') {
            navigation.navigate('Chat', {
              chatId: String(remoteMessage.data.chatId),
              otherParticipantId: String(remoteMessage.data.otherParticipantId)
            });
          }
        }
      }
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
