import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { globalStyles } from '../../styles/globalStyles';
import { GroupDetailsViewModel } from '../../viewmodels/GroupDetailsViewModel';

const AddMembersScreen = observer(() => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params as { groupId: string };
  const viewModel = React.useMemo(() => new GroupDetailsViewModel(groupId), [groupId]);
  const [searchText, setSearchText] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setIsLoading(true);
    const availableContacts = await viewModel.loadContacts();
    setContacts(availableContacts);
    setIsLoading(false);
  };

  const filteredContacts = React.useMemo(() => {
    if (!searchText.trim()) return contacts;
    
    const lower = searchText.toLowerCase();
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(lower) ||
      contact.phoneNumber.includes(lower)
    );
  }, [contacts, searchText]);

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleAddMembers = async () => {
    if (selectedContacts.size === 0) return;

    setLoading(true);
    try {
      for (const contactId of selectedContacts) {
        await viewModel.addMember(contactId);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error al añadir miembros:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={[styles.title, globalStyles.text]}>Añadir Miembros</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <TextInput
          style={[styles.searchInput, globalStyles.text]}
          placeholder="Buscar contacto o número..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#666"
        />

        <FlatList
          data={filteredContacts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.contactItem,
                selectedContacts.has(item.id) && styles.contactItemSelected
              ]}
              onPress={() => toggleContactSelection(item.id)}
            >
              <View style={styles.avatarContainer}>
                <Text style={[styles.avatarText, globalStyles.textWhite]}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, globalStyles.text]}>
                  {item.name}
                </Text>
                <Text style={[styles.contactPhone, globalStyles.textSecondary]}>
                  {item.phoneNumber}
                </Text>
              </View>
              {selectedContacts.has(item.id) && (
                <Text style={styles.selectedMark}>✓</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : (
              <Text style={[styles.emptyText, globalStyles.textSecondary]}>
                No hay contactos disponibles
              </Text>
            )
          }
          style={styles.contactList}
        />

        <TouchableOpacity
          style={[
            styles.addButton,
            selectedContacts.size === 0 && styles.addButtonDisabled
          ]}
          onPress={handleAddMembers}
          disabled={selectedContacts.size === 0 || loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>
              Añadir ({selectedContacts.size})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    flex: 1,
  },
  searchInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 8,
  },
  contactList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  contactItemSelected: {
    backgroundColor: '#D0E8FF',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  contactPhone: {
    fontSize: 13,
  },
  selectedMark: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 20,
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonDisabled: {
    backgroundColor: '#B4B4B4',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default AddMembersScreen; 