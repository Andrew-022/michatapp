import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import {observer} from 'mobx-react-lite';
import {ProfileViewModel} from '../../viewmodels/ProfileViewModel';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

const ProfileScreen = observer(() => {
  const navigation = useNavigation<ProfileNavigationProp>();
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Perfil</Text>
      </View>

      <View style={styles.profileContainer}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={() => viewModel.pickAndUploadPhoto()}
        >
          {viewModel.userData?.photoURL ? (
            <Image 
              source={{ uri: viewModel.userData.photoURL }} 
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>
              {viewModel.userData?.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          )}
          <View style={styles.editPhotoButton}>
            <Icon name="camera-alt" size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        {viewModel.uploadingPhoto && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 3,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 20,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#000',
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