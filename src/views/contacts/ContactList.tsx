import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { observer } from 'mobx-react-lite';
import { ContactListViewModel } from '../../viewmodels/ContactListViewModel';

type ContactListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ContactList'>;

const ContactList = observer(() => {
  const navigation = useNavigation<ContactListNavigationProp>();
  const viewModel = React.useMemo(() => new ContactListViewModel(), []);

  const handleStartChat = async (contact: any) => {
    try {
      const { chatId, otherParticipantId } = await viewModel.startChat(contact);
      navigation.replace('Chat', {
        chatId,
        otherParticipantId,
      });
    } catch (error) {
      console.error('Error al iniciar chat:', error);
    }
  };

  const renderContactItem = ({item}: {item: any}) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleStartChat(item)}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{item.getInitials()}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.phoneNumber}>{item.getFullName()}</Text>
        {Array.isArray(item.phoneNumbers) && item.phoneNumbers.map((phone: any, index: number) => (
          <Text key={index} style={styles.phoneNumber}>
            {phone.number}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.title}>Contactos</Text>
      </View>

      <FlatList
        data={viewModel.contacts}
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