import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { observer } from 'mobx-react-lite';
import { ContactListViewModel } from '../../viewmodels/ContactListViewModel';
import { globalStyles } from '../../styles/globalStyles';
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';

type ContactListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ContactList'>;

const ContactList = observer(() => {
  const navigation = useNavigation<ContactListNavigationProp>();
  const viewModel = React.useMemo(() => new ContactListViewModel(), []);
  const [searchText, setSearchText] = React.useState('');
  const { isDark, primaryColor } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;

  const filteredContacts = React.useMemo(() => {
    if (!searchText.trim()) return viewModel.contacts;
    const lower = searchText.toLowerCase();
    return viewModel.contacts.filter(contact =>
      contact.getFullName().toLowerCase().includes(lower) ||
      (Array.isArray(contact.phoneNumbers) &&
        contact.phoneNumbers.some((p: any) => p.number.includes(lower)))
    );
  }, [searchText, viewModel.contacts]);

  const handleStartChat = async (contact: any) => {
    try {
      const { chatId, otherParticipantId } = await viewModel.startChat(contact);
      if (!otherParticipantId) {
        Alert.alert(
          'Usuario no registrado',
          'Este contacto no está registrado en la aplicación. Solo puedes chatear con usuarios que tengan cuenta.'
        );
        return;
      }
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
      style={[styles.contactItem, { 
        backgroundColor: currentTheme.card,
        borderBottomColor: currentTheme.border 
      }]}
      onPress={() => handleStartChat(item)}>
      <View style={[styles.avatarContainer, { backgroundColor: primaryColor }]}>
        <Text style={[styles.avatarText, { color: currentTheme.background }]}>
          {item.getInitials()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: currentTheme.text }]}>
          {item.getFullName()}
        </Text>
        {Array.isArray(item.phoneNumbers) && item.phoneNumbers.map((phone: any, index: number) => (
          <Text key={index} style={[styles.contactPhone, { color: currentTheme.secondary }]}>
            {phone.number}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );

  if (viewModel.loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.header, { 
        backgroundColor: currentTheme.card,
        borderBottomColor: currentTheme.border 
      }]}>
        <Text style={[styles.title, { color: currentTheme.text }]}>Contactos</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: currentTheme.card }]}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: currentTheme.background,
            borderColor: currentTheme.border,
            color: currentTheme.text
          }]}
          placeholder="Buscar contacto o número..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={currentTheme.secondary}
        />
      </View>

      <FlatList
        data={filteredContacts}
        renderItem={renderContactItem}
        keyExtractor={item => item.recordID}
        contentContainerStyle={styles.contactList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: currentTheme.secondary }]}>
              No se encontraron contactos
            </Text>
          </View>
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  contactList: {
    flexGrow: 1,
  },
  contactItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
  },
});

export default ContactList; 