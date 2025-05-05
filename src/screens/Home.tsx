import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {createUser, getUser} from '../services/firestore';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Chat {
  id: string;
  participants: string[];
  updatedAt?: any;
  lastMessage?: {
    text: string;
    createdAt: any;
  };
}

const Home = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const [userData, setUserData] = useState<any>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (!user) {
        navigation.replace('PhoneAuth');
      }
    });

    return () => unsubscribe();
  }, [navigation]);

  useEffect(() => {
    const loadUserData = async () => {
      const currentUser = auth().currentUser;
      if (currentUser) {
        const data = await getUser(currentUser.uid);
        if (!data) {
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

  useEffect(() => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    // Suscribirse a los chats del usuario
    const unsubscribe = firestore()
      .collection('chats')
      .where('participants', 'array-contains', currentUser.uid)
      .onSnapshot(
        snapshot => {
          const chatList = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
            }))
            .sort((a, b) => {
              const dateA = a.updatedAt?.toDate?.() || new Date(0);
              const dateB = b.updatedAt?.toDate?.() || new Date(0);
              return dateB.getTime() - dateA.getTime();
            }) as Chat[];
          setChats(chatList);
          setLoading(false);
        },
        error => {
          console.error('Error al cargar chats:', error);
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleChatPress = (chat: Chat) => {
    const otherParticipantId = chat.participants.find(
      id => id !== auth().currentUser?.uid,
    );
    if (otherParticipantId) {
      navigation.navigate('Chat', {
        chatId: chat.id,
        otherParticipantId,
      });
    }
  };

  const renderChatItem = ({item}: {item: Chat}) => {
    const otherParticipantId = item.participants.find(
      id => id !== auth().currentUser?.uid,
    );

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {otherParticipantId?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>
            {otherParticipantId || 'Usuario desconocido'}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage?.text || 'No hay mensajes'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.title}>Chats</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes chats aún</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.newChatButton}
        onPress={() => navigation.navigate('ContactList')}>
        <Text style={styles.newChatButtonText}>+</Text>
      </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    color: '#007AFF',
    fontSize: 16,
  },
  chatList: {
    flexGrow: 1,
  },
  chatItem: {
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
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lastMessage: {
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
  newChatButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  newChatButtonText: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default Home; 