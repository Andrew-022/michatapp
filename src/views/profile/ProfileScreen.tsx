import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import {observer} from 'mobx-react-lite';
import {ProfileViewModel} from '../../viewmodels/ProfileViewModel';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

const ProfileScreen = observer(() => {
  const navigation = useNavigation<ProfileNavigationProp>();
  const viewModel = React.useMemo(() => new ProfileViewModel(), []);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const { isDark, primaryColor } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSave = async () => {
    if (newName.trim()) {
      await viewModel.updateName(newName.trim());
      setIsEditing(false);
      setNewName('');
    }
  };

  const handleSaveStatus = async () => {
    if (newStatus.trim()) {
      await viewModel.updateStatus(newStatus.trim());
      setIsEditingStatus(false);
      setNewStatus('');
    }
  };

  const handleTogglePhoneVisibility = async () => {
    try {
      await viewModel.updatePhoneNumberVisibility(!viewModel.userData?.isPhoneNumberPublic);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la visibilidad del número');
    }
  };

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={primaryColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>Perfil</Text>
      </View>

      <View style={styles.profileContainer}>
        <TouchableOpacity 
          style={[styles.avatarContainer, { backgroundColor: primaryColor }]}
          onPress={() => setIsPhotoExpanded(true)}
        >
          {viewModel.userData?.photoURL ? (
            <Image 
              source={{ uri: viewModel.userData.photoURL }} 
              style={styles.avatarImage}
            />
          ) : (
            <Text style={[styles.avatarText, { color: currentTheme.background }]}>
              {viewModel.userData?.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          )}
        </TouchableOpacity>

        {viewModel.uploadingPhoto && (
          <View style={[styles.uploadingOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <ActivityIndicator size="large" color={currentTheme.background} />
          </View>
        )}

        <View style={styles.infoContainer}>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: currentTheme.card,
                  borderColor: currentTheme.border,
                  color: currentTheme.text
                }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="Tu nombre"
                placeholderTextColor={currentTheme.secondary}
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton, { backgroundColor: currentTheme.border }]}
                  onPress={() => {
                    setIsEditing(false);
                    setNewName('');
                  }}>
                  <Text style={[styles.editButtonText, { color: currentTheme.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, styles.saveButton, { backgroundColor: primaryColor }]}
                  onPress={handleSave}>
                  <Text style={[styles.editButtonText, { color: currentTheme.background }]}>
                    Guardar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.nameContainer}>
              <Text style={[styles.name, { color: currentTheme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {viewModel.userData?.name || 'Sin nombre'}
              </Text>
              <TouchableOpacity
                style={styles.editIcon}
                onPress={() => {
                  setNewName(viewModel.userData?.name || '');
                  setIsEditing(true);
                }}>
                <Icon name="edit" size={20} color={primaryColor} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.phoneContainer}>
            <Text style={[styles.phoneNumber, { color: currentTheme.secondary }]}>
              {viewModel.userData?.phoneNumber || 'Sin número'}
            </Text>
          </View>

          <View style={styles.statusContainer}>
            <Text style={[styles.statusLabel, { color: currentTheme.secondary }]}>
              Estado
            </Text>
            {isEditingStatus ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: currentTheme.card,
                    borderColor: currentTheme.border,
                    color: currentTheme.text
                  }]}
                  value={newStatus}
                  onChangeText={setNewStatus}
                  placeholder="Tu estado"
                  placeholderTextColor={currentTheme.secondary}
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={[styles.editButton, styles.cancelButton, { backgroundColor: currentTheme.border }]}
                    onPress={() => {
                      setIsEditingStatus(false);
                      setNewStatus('');
                    }}>
                    <Text style={[styles.editButtonText, { color: currentTheme.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editButton, styles.saveButton, { backgroundColor: primaryColor }]}
                    onPress={handleSaveStatus}>
                    <Text style={[styles.editButtonText, { color: currentTheme.background }]}>
                      Guardar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.statusBox, { 
                backgroundColor: currentTheme.card,
                borderColor: currentTheme.border
              }]}>
                <View style={styles.statusRow}>
                  <Text style={[styles.status, { color: currentTheme.text }]}>
                    {viewModel.userData?.status || '¡Hola! Estoy usando MichatApp'}
                  </Text>
                  <TouchableOpacity
                    style={styles.editIcon}
                    onPress={() => {
                      setNewStatus(viewModel.userData?.status || '');
                      setIsEditingStatus(true);
                    }}>
                    <Icon name="edit" size={20} color={primaryColor} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          

          <View style={styles.privacySection}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              Privacidad
            </Text>
            <TouchableOpacity
              style={[styles.privacyOption, { 
                backgroundColor: currentTheme.card,
                borderColor: currentTheme.border
              }]}
              onPress={() => setShowPrivacyModal(true)}>
              <View style={styles.privacyOptionContent}>
                <View style={styles.privacyOptionLeft}>
                  <Icon name="phone" size={24} color={primaryColor} style={styles.privacyIcon} />
                  <View>
                    <Text style={[styles.privacyOptionTitle, { color: currentTheme.text }]}>
                      Visibilidad del número
                    </Text>
                    <Text style={[styles.privacyOptionDescription, { color: currentTheme.secondary }]}>
                      {viewModel.userData?.isPhoneNumberPublic 
                        ? 'Tu número es público'
                        : 'Tu número es privado'}
                    </Text>
                  </View>
                </View>
                <Icon 
                  name={viewModel.userData?.isPhoneNumberPublic ? "visibility" : "visibility-off"} 
                  size={24} 
                  color={primaryColor} 
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal
        visible={isPhotoExpanded}
        transparent={true}
        onRequestClose={() => setIsPhotoExpanded(false)}>
        <TouchableOpacity
          style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]}
          activeOpacity={1}
          onPress={() => setIsPhotoExpanded(false)}>
          <View style={styles.expandedPhotoContainer}>
            <TouchableOpacity 
              style={[styles.expandedEditPhotoButton, { 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.7)',
                borderWidth: 1,
                borderColor: isDark ? primaryColor : 'transparent'
              }]}
              onPress={() => {
                setIsPhotoExpanded(false);
                viewModel.pickAndUploadPhoto();
              }}>
              <MaterialIcons name="camera-alt" size={24} color={isDark ? primaryColor : currentTheme.background} />
              <Text style={[styles.expandedEditPhotoText, { 
                color: isDark ? primaryColor : currentTheme.background 
              }]}>
                Cambiar foto de perfil
              </Text>
            </TouchableOpacity>
            {viewModel.userData?.photoURL ? (
              <Image
                source={{uri: viewModel.userData.photoURL}}
                style={styles.expandedPhoto}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.expandedPhotoPlaceholder, { backgroundColor: primaryColor }]}>
                <Text style={[styles.expandedPhotoText, { color: currentTheme.background }]}>
                  {viewModel.userData?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showPrivacyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPrivacyModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { 
            backgroundColor: currentTheme.card,
            borderColor: currentTheme.border
          }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
              Cambiar visibilidad del número
            </Text>
            <Text style={[styles.modalDescription, { color: currentTheme.secondary }]}>
              {viewModel.userData?.isPhoneNumberPublic
                ? '¿Estás seguro de que quieres hacer tu número privado?'
                : '¿Estás seguro de que quieres hacer tu número público?'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { 
                  backgroundColor: currentTheme.border 
                }]}
                onPress={() => setShowPrivacyModal(false)}>
                <Text style={[styles.modalButtonText, { color: currentTheme.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { 
                  backgroundColor: primaryColor 
                }]}
                onPress={async () => {
                  try {
                    await viewModel.updatePhoneNumberVisibility(!viewModel.userData?.isPhoneNumberPublic);
                    setShowPrivacyModal(false);
                  } catch (error) {
                    Alert.alert('Error', 'No se pudo actualizar la visibilidad del número');
                  }
                }}>
                <Text style={[styles.modalButtonText, { color: currentTheme.background }]}>
                  Confirmar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    width: 120,
    height: 120,
    borderRadius: 60,
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
    fontSize: 48,
    fontWeight: 'bold',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 3,
    right: 6,
    padding: 8,
    borderRadius: 20,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  infoContainer: {
    width: '100%',
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  editIcon: {
    padding: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  phoneNumber: {
    fontSize: 16,
    marginRight: 8,
  },
  editContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
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
  editButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedPhotoContainer: {
    width: Dimensions.get('window').width * 0.9,
    alignItems: 'flex-end',
  },
  expandedPhoto: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').width * 0.9,
    borderRadius: 10,
  },
  expandedPhotoPlaceholder: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').width * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  expandedPhotoText: {
    fontSize: 120,
    fontWeight: 'bold',
  },
  expandedEditPhotoButton: {
    padding: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: "center",
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 200,
    justifyContent: 'center',
  },
  expandedEditPhotoText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  statusContainer: {
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  statusLabel: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'left',
  },
  statusBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  status: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  privacySection: {
    width: '100%',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  privacyOption: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  privacyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  privacyOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyIcon: {
    marginRight: 12,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  privacyOptionDescription: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ProfileScreen; 