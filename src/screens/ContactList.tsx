import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Contacts from 'react-native-contacts';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';

type ContactListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ContactList'>;

interface User {
  recordID: string;
  givenName: string;
  familyName: string;
  phoneNumbers: {
    label: string;
    number: string;
  }[];
}

const ContactList = () => {
  const navigation = useNavigation<ContactListNavigationProp>();
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requestContactsPermission = async () => {
      if (Platform.OS === 'android') {
        console.log('Solicitando permiso para acceder a los contactos');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Permiso para acceder a los contactos',
            message: 'Esta aplicación necesita acceder a tus contactos para mostrar la lista de contactos.',
            buttonNeutral: 'Preguntar más tarde',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Permiso de contactos denegado');
          setLoading(false);
          return;
        }
      }
      loadContacts();
    };

    const loadContacts = () => {
      Contacts.getAll()
        .then(contacts => {
          setContacts(contacts);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error al cargar contactos:', error);
          setLoading(false);
        });
    };

    requestContactsPermission();
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
        return data.participants.includes(otherUser.recordID);
      });

      if (chat) {
        // Si el chat existe, navegar a él
        navigation.replace('Chat', {
          chatId: chat.id,
          otherParticipantId: otherUser.recordID,
        });
      } else {
        // Si no existe, crear uno nuevo
        const newChatRef = await firestore().collection('chats').add({
          participants: [currentUser.uid, otherUser.recordID],
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        navigation.replace('Chat', {
          chatId: newChatRef.id,
          otherParticipantId: otherUser.recordID,
        });
      }
    } catch (error) {
      console.error('Error al iniciar chat:', error);
    }
  };

  const renderContactItem = ({item}: {item: User}) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleStartChat(item)}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {item.givenName?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.phoneNumber}>{item.givenName} {item.familyName}</Text>
        {item.phoneNumbers.map((phone, index) => (
          <Text key={index} style={styles.phoneNumber}>{phone.number}</Text>
        ))}
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
        data={contacts}
        renderItem={renderContactItem}
        keyExtractor={item => item.recordID}
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