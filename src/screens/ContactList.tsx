import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';

type ContactListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ContactList'>;

interface User {
  id: string;
  phoneNumber: string;
  lastLogin: any;
}

const ContactList = () => {
  const navigation = useNavigation<ContactListNavigationProp>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    const unsubscribe = firestore()
      .collection('users')
      .where('id', '!=', currentUser.uid)
      .onSnapshot(
        snapshot => {
          const userList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as User[];
          setUsers(userList);
          setLoading(false);
        },
        error => {
          console.error('Error al cargar usuarios:', error);
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, []);

  const handleStartChat = async (otherUser: User) => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      // Verificar si ya existe un chat entre estos usuarios
      const existingChat = await firestore()
        .collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .get();

      const chat = existingChat.docs.find(doc => {
        const data = doc.data();
        return data.participants.includes(otherUser.id);
      });

      if (chat) {
        // Si el chat existe, navegar a él
        navigation.replace('Chat', {
          chatId: chat.id,
          otherParticipantId: otherUser.id,
        });
      } else {
        // Si no existe, crear uno nuevo
        const newChatRef = await firestore().collection('chats').add({
          participants: [currentUser.uid, otherUser.id],
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        navigation.replace('Chat', {
          chatId: newChatRef.id,
          otherParticipantId: otherUser.id,
        });
      }
    } catch (error) {
      console.error('Error al iniciar chat:', error);
    }
  };

  const renderUserItem = ({item}: {item: User}) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleStartChat(item)}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {item.phoneNumber?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
        <Text style={styles.lastLogin}>
          Último acceso: {item.lastLogin?.toDate().toLocaleDateString() || 'N/A'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contactos</Text>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.userList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay contactos disponibles</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userList: {
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lastLogin: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ContactList; 