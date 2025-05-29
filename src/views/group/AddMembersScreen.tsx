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
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';

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
  const { isDark, primaryColor } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;

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
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.header, { 
        backgroundColor: currentTheme.card,
        borderBottomColor: currentTheme.border 
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={primaryColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>Añadir Miembros</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: currentTheme.card,
            borderColor: currentTheme.border,
            color: currentTheme.text
          }]}
          placeholder="Buscar contacto o número..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={currentTheme.secondary}
        />

        <FlatList
          data={filteredContacts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.contactItem,
                { 
                  backgroundColor: currentTheme.card,
                  borderBottomColor: currentTheme.border 
                },
                selectedContacts.has(item.id) && { 
                  backgroundColor: primaryColor + '20' 
                }
              ]}
              onPress={() => toggleContactSelection(item.id)}
            >
              <View style={[styles.avatarContainer, { backgroundColor: primaryColor }]}>
                <Text style={[styles.avatarText, { color: currentTheme.background }]}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: currentTheme.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.contactPhone, { color: currentTheme.secondary }]}>
                  {item.phoneNumber}
                </Text>
              </View>
              {selectedContacts.has(item.id) && (
                <Text style={[styles.selectedMark, { color: primaryColor }]}>✓</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator size="large" color={primaryColor} />
            ) : (
              <Text style={[styles.emptyText, { color: currentTheme.secondary }]}>
                No hay contactos disponibles
              </Text>
            )
          }
          style={styles.contactList}
        />

        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: primaryColor },
            selectedContacts.size === 0 && { backgroundColor: currentTheme.border }
          ]}
          onPress={handleAddMembers}
          disabled={selectedContacts.size === 0 || loading}>
          {loading ? (
            <ActivityIndicator color={currentTheme.background} />
          ) : (
            <Text style={[styles.addButtonText, { color: currentTheme.background }]}>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
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
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
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
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontWeight: 'bold',
    fontSize: 20,
    marginLeft: 8,
  },
  addButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default AddMembersScreen; 