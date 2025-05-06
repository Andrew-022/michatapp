import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../views/home/Home';
import ChatScreen from '../views/chat/ChatScreen';
import PhoneAuth from '../views/auth/PhoneAuth';
import ContactList from '../views/contacts/ContactList';

export type RootStackParamList = {
  Home: undefined;
  Chat: {
    chatId: string;
    otherParticipantId: string;
  };
  PhoneAuth: undefined;
  ContactList: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="PhoneAuth"
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name="PhoneAuth" component={PhoneAuth} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="ContactList" component={ContactList} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 