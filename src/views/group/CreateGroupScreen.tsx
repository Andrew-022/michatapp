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
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';

const CreateGroupScreen = observer(() => {
  const navigation = useNavigation();
  const viewModel = React.useMemo(() => new CreateGroupViewModel(), []);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;

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
    if (!viewModel.groupName.trim()) return;

    setLoading(true);
    try {
      const groupId = await viewModel.createGroup();
      if (groupId) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error al crear grupo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const location = await viewModel.getCurrentLocation();
      if (location) {
        viewModel.setLocation(location);
      }
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Error al obtener la ubicación');
      console.error('Error al obtener la ubicación:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.header, { 
        backgroundColor: currentTheme.card,
        borderBottomColor: currentTheme.border 
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={currentTheme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>Crear Grupo</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <TextInput
          style={[styles.input, { 
            backgroundColor: currentTheme.card,
            color: currentTheme.text,
            borderColor: currentTheme.border
          }]}
          value={viewModel.groupName}
          onChangeText={viewModel.setGroupName.bind(viewModel)}
          placeholder="Nombre del grupo"
          placeholderTextColor={currentTheme.secondary}
        />

        <View style={[styles.switchContainer, { borderColor: currentTheme.border }]}>
          <Text style={[styles.switchLabel, { color: currentTheme.text }]}>
            Grupo público
          </Text>
          <TouchableOpacity
            style={[styles.switch, viewModel.isPublic && styles.switchActive]}
            onPress={() => viewModel.setPublic(!viewModel.isPublic)}
          >
            <Text style={[styles.switchText, { color: currentTheme.text }]}>
              {viewModel.isPublic ? 'Sí' : 'No'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.locationButton, 
            { backgroundColor: currentTheme.primary },
            locationLoading && styles.locationButtonDisabled
          ]}
          onPress={handleSelectLocation}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator color={currentTheme.background} />
          ) : (
            <Text style={[styles.locationButtonText, { color: currentTheme.background }]}>
              {viewModel.location ? 'Cambiar ubicación' : 'Seleccionar ubicación actual'}
            </Text>
          )}
        </TouchableOpacity>

        {locationError && (
          <Text style={[styles.errorText, { color: currentTheme.error }]}>
            {locationError}
          </Text>
        )}

        {viewModel.location && (
          <Text style={[styles.locationText, { color: currentTheme.secondary }]}>
            Lat: {viewModel.location.latitude.toFixed(6)}, Long: {viewModel.location.longitude.toFixed(6)}
          </Text>
        )}

        <Text style={[styles.subtitle, { color: currentTheme.text }]}>
          Selecciona participantes (opcional):
        </Text>
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
          keyExtractor={item => item.recordID}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.contactItem,
                { 
                  backgroundColor: currentTheme.card,
                  borderBottomColor: currentTheme.border 
                },
                item.selected && { backgroundColor: currentTheme.primary + '20' }
              ]}
              onPress={() => viewModel.toggleContactSelection(item.recordID)}
            >
              <View style={[styles.avatarContainer, { backgroundColor: currentTheme.primary }]}>
                <Text style={[styles.avatarText, { color: currentTheme.background }]}>
                  {(item.firstName?.[0] || '') + (item.lastName?.[0] || '')}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: currentTheme.text }]}>
                  {item.firstName} {item.lastName}
                </Text>
                {item.phoneNumbers.map((phone, idx) => (
                  <Text key={idx} style={[styles.contactPhone, { color: currentTheme.secondary }]}>
                    {phone.number}
                  </Text>
                ))}
              </View>
              {item.selected && (
                <Text style={[styles.selectedMark, { color: currentTheme.primary }]}>✓</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            viewModel.loading ? (
              <ActivityIndicator size="large" color={currentTheme.primary} />
            ) : (
              <Text style={[styles.emptyText, { color: currentTheme.secondary }]}>
                No hay contactos
              </Text>
            )
          }
          style={styles.contactList}
        />

        <TouchableOpacity
          style={[
            styles.createButton,
            { backgroundColor: currentTheme.primary },
            (!viewModel.groupName.trim() || loading) && 
              { backgroundColor: currentTheme.border }
          ]}
          onPress={handleCreateGroup}
          disabled={!viewModel.groupName.trim() || loading}>
          {loading ? (
            <ActivityIndicator color={currentTheme.background} />
          ) : (
            <Text style={[styles.createButtonText, { color: currentTheme.background }]}>
              Crear Grupo
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
  input: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  searchInput: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
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
  createButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  switch: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ddd',
  },
  switchActive: {
    backgroundColor: '#007AFF',
  },
  switchText: {
    color: '#fff',
    fontWeight: '600',
  },
  locationButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
});

export default CreateGroupScreen;
