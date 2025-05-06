import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {observer} from 'mobx-react-lite';
import {ProfileViewModel} from '../../viewmodels/ProfileViewModel';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ProfileScreen = observer(() => {
  const viewModel = React.useMemo(() => new ProfileViewModel(), []);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSave = async () => {
    if (newName.trim()) {
      await viewModel.updateName(newName.trim());
      setIsEditing(false);
      setNewName('');
    }
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
        <Text style={styles.title}>Perfil</Text>
      </View>

      <View style={styles.profileContainer}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {viewModel.userData?.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>

        <View style={styles.infoContainer}>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Tu nombre"
                placeholderTextColor="rgba(54, 54, 54, 0.7)"
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={() => {
                    setIsEditing(false);
                    setNewName('');
                  }}>
                  <Text style={styles.editButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, styles.saveButton]}
                  onPress={handleSave}>
                  <Text style={[styles.editButtonText, styles.saveButtonText]}>
                    Guardar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{viewModel.userData?.name || 'Sin nombre'}</Text>
              <TouchableOpacity
                style={styles.editIcon}
                onPress={() => {
                  setNewName(viewModel.userData?.name || '');
                  setIsEditing(true);
                }}>
                <Icon name="edit" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.phoneNumber}>
            {viewModel.userData?.phoneNumber || 'Sin número'}
          </Text>
        </View>
      </View>
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
  profileContainer: {
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  infoContainer: {
    width: '100%',
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  editIcon: {
    padding: 4,
  },
  phoneNumber: {
    fontSize: 16,
    color: '#666',
  },
  editContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  editButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  saveButtonText: {
    color: '#fff',
  },
});

export default ProfileScreen; 