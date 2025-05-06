import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { observer } from 'mobx-react-lite';
import { HomeViewModel } from '../../viewmodels/HomeViewModel';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const ChatItem = ({ item, onPress }: { item: any; onPress: () => void }) => {
  const viewModel = React.useMemo(() => new HomeViewModel(), []);
  const [otherParticipantName, setOtherParticipantName] = useState('');

  useEffect(() => {
    const loadName = async () => {
      const name = await viewModel.getOtherParticipantName(item);
      setOtherParticipantName(name);
    };
    loadName();
  }, [item]);

  return (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={onPress}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {otherParticipantName.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>
          {otherParticipantName || 'Usuario desconocido'}
        </Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage?.text || 'No hay mensajes'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const Home = observer(() => {
  const navigation = useNavigation<HomeNavigationProp>();
  const viewModel = React.useMemo(() => new HomeViewModel(), []);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (!user) {
        navigation.replace('PhoneAuth');
      }
    });

    return () => unsubscribe();
  }, [navigation]);

  const handleSignOut = async () => {
    try {
      await viewModel.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleChatPress = (chat: any) => {
    const otherParticipantId = viewModel.getOtherParticipantId(chat);
    if (otherParticipantId) {
      navigation.navigate('Chat', {
        chatId: chat.id,
        otherParticipantId,
      });
    }
  };

  const renderChatItem = ({item}: {item: any}) => {
    return <ChatItem item={item} onPress={() => handleChatPress(item)} />;
  };

  if (viewModel.loading) {
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
        data={viewModel.chats}
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
});

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