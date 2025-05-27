import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { globalStyles } from '../../styles/globalStyles';
import { CreateGroupViewModel } from '../../viewmodels/CreateGroupViewModel';
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';

const SelectParticipantsScreen = observer(() => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { viewModel } = route.params as { viewModel: CreateGroupViewModel };
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;

  const handleCreateGroup = async () => {
    const validation = viewModel.validateStep2();
    if (!validation.isValid) {
      Alert.alert('Error', validation.error);
      return;
    }

    setLoading(true);
    try {
      const result = await viewModel.createGroup();
      if (result.success && result.groupId) {
        navigation.reset({
          index: 0,
          routes: [
            { name: 'Home' },
            { name: 'GroupChat', params: { groupId: result.groupId } }
          ],
        });
      } else {
        Alert.alert('Error', result.error || 'No se pudo crear el grupo');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el grupo. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = React.useMemo(() => {
    let contacts = viewModel.contacts;

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      contacts = contacts.filter(contact =>
        `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(lower) ||
        (Array.isArray(contact.phoneNumbers) &&
          contact.phoneNumbers.some((p: any) => p.number.includes(lower)))
      );
    }

    return contacts.slice().sort((a, b) => {
      const aHasName = (a.firstName || a.lastName).trim().length > 0;
      const bHasName = (b.firstName || b.lastName).trim().length > 0;

      if (aHasName && !bHasName) return -1;
      if (!aHasName && bHasName) return 1;
      if (!aHasName && !bHasName) return 0;

      const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '');
      if (lastNameCompare !== 0) return lastNameCompare;

      return (a.firstName || '').localeCompare(a.firstName || '');
    });
  }, [viewModel.contacts, searchText]);

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.header, { 
        backgroundColor: currentTheme.card,
        borderBottomColor: currentTheme.border 
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={currentTheme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>Seleccionar Participantes</Text>
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
            loading && { backgroundColor: currentTheme.border }
          ]}
          onPress={handleCreateGroup}
          disabled={loading}>
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
});

export default SelectParticipantsScreen; 