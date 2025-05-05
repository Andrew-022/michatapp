import React, { useState, useEffect } from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import Home from '../screens/Home';
import ChatScreen from '../screens/ChatScreen';
import PhoneAuth from '../screens/PhoneAuth';
import ContactList from '../screens/ContactList';

export type RootStackParamList = {
  PhoneAuth: undefined;
  Home: undefined;
  Chat: {
    chatId: string;
    otherParticipantId: string;
  };
  ContactList: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setUser(user);
      if (initializing) {
        setInitializing(false);
      }
    });

    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? "Home" : "PhoneAuth"}
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name="PhoneAuth" component={PhoneAuth} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            headerShown: true,
            title: 'Chat',
            headerBackTitle: 'Atrás',
          }}
        />
        <Stack.Screen
          name="ContactList"
          component={ContactList}
          options={{
            headerShown: true,
            title: 'Nuevo Chat',
            headerBackTitle: 'Atrás',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 