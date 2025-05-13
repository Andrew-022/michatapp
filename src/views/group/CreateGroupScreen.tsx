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
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp 
} from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { globalStyles } from '../../styles/globalStyles';
import { CreateGroupViewModel } from '../../viewmodels/CreateGroupViewModel';

const CreateGroupScreen = observer(() => {
  const navigation = useNavigation();
  const viewModel = React.useMemo(() => new CreateGroupViewModel(), []);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Ordena y filtra los contactos
  const filteredContacts = React.useMemo(() => {
    let contacts = viewModel.contacts;

    // Filtrado
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      contacts = contacts.filter(contact =>
        `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(lower) ||
        (Array.isArray(contact.phoneNumbers) &&
          contact.phoneNumbers.some((p: any) => p.number.includes(lower)))
      );
    }

    // Orden alfabético, dejando al final los sin nombre
    return contacts.slice().sort((a, b) => {
      const aHasName = (a.firstName || a.lastName).trim().length > 0;
      const bHasName = (b.firstName || b.lastName).trim().length > 0;

      if (aHasName && !bHasName) return -1;
      if (!aHasName && bHasName) return 1;
      if (!aHasName && !bHasName) return 0;

      const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '');
      if (lastNameCompare !== 0) return lastNameCompare;

      return (a.firstName || '').localeCompare(b.firstName || '');
    });
  }, [viewModel.contacts, searchText]);

  const handleCreateGroup = async () => {
    if (!viewModel.groupName.trim() || viewModel.selectedUserIds.length === 0) return;

    setLoading(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const db = getFirestore();
      const groupData = {
        name: viewModel.groupName.trim(),
        adminIds: [currentUser.uid],
        participants: [currentUser.uid, ...viewModel.selectedUserIds],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: {
          text: '',
          createdAt: serverTimestamp(),
          senderId: currentUser.uid,
        }
      };

      const groupRef = await addDoc(collection(db, 'groupChats'), groupData);
      navigation.navigate('GroupChat', { groupId: groupRef.id });
    } catch (error) {
      console.error('Error al crear grupo:', error);
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
        <Text style={[styles.title, globalStyles.text]}>Crear Grupo</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <TextInput
          style={[styles.input, globalStyles.text]}
          value={viewModel.groupName}
          onChangeText={viewModel.setGroupName.bind(viewModel)}
          placeholder="Nombre del grupo"
          placeholderTextColor="rgba(54, 54, 54, 0.7)"
        />

        <Text style={[styles.subtitle, globalStyles.text]}>Selecciona participantes:</Text>
        <TextInput
          style={[styles.searchInput, globalStyles.text]}
          placeholder="Buscar contacto o número..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#666"
        />

        <FlatList
          data={filteredContacts}
          keyExtractor={item => item.recordID}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.contactItem,
                item.selected && styles.contactItemSelected
              ]}
              onPress={() => viewModel.toggleContactSelection(item.recordID)}
            >
              <View style={styles.avatarContainer}>
                <Text style={[styles.avatarText, globalStyles.textWhite]}>
                  {(item.firstName?.[0] || '') + (item.lastName?.[0] || '')}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, globalStyles.text]}>
                  {item.firstName} {item.lastName}
                </Text>
                {item.phoneNumbers.map((phone, idx) => (
                  <Text key={idx} style={[styles.contactPhone, globalStyles.textSecondary]}>{phone.number}</Text>
                ))}
              </View>
              {item.selected && <Text style={styles.selectedMark}>✓</Text>}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            viewModel.loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : (
              <Text style={[styles.emptyText, globalStyles.textSecondary]}>No hay contactos</Text>
            )
          }
          style={styles.contactList}
        />

        <TouchableOpacity
          style={[
            styles.createButton,
            (!viewModel.groupName.trim() || viewModel.selectedUserIds.length === 0) && styles.createButtonDisabled
          ]}
          onPress={handleCreateGroup}
          disabled={!viewModel.groupName.trim() || viewModel.selectedUserIds.length === 0 || loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Crear Grupo</Text>
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
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
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
    flexGrow: 0,
    maxHeight: 300,
    marginBottom: 16,
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
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonDisabled: {
    backgroundColor: '#B4B4B4',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default CreateGroupScreen;
