import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../views/home/Home';
import ChatScreen from '../views/chat/ChatScreen';
import PhoneAuth from '../views/auth/PhoneAuth';
import ContactList from '../views/contacts/ContactList';
import ProfileScreen from '../views/profile/ProfileScreen';
import CreateGroupScreen from '../views/group/CreateGroupScreen';
import GroupChatScreen from '../views/group/GroupChatScreen';
import UserProfileScreen from '../views/profile/UserProfileScreen';

export type RootStackParamList = {
  Home: undefined;
  Chat: {
    chatId: string;
    otherParticipantId: string;
  };
  PhoneAuth: undefined;
  ContactList: undefined;
  Profile: undefined;
  CreateGroup: undefined;
  GroupChat: {
    groupId: string;
  };
  UserProfile: {
    userId: string;
  };
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
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
        <Stack.Screen name="GroupChat" component={GroupChatScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 