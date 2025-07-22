import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {observer} from 'mobx-react-lite';
import {GroupDetailsViewModel} from '../../viewmodels/GroupDetailsViewModel';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { globalStyles } from '../../styles/globalStyles';
import MemberOptionsMenu from './MemberOptionsMenu';
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';
import Slider from '@react-native-community/slider';

type GroupDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GroupDetails'>;

interface GroupDetailsScreenProps {
  route: {
    params: {
      groupId: string;
    };
  };
}

const GroupDetailsScreen = observer(({route}: GroupDetailsScreenProps) => {
  const navigation = useNavigation<GroupDetailsNavigationProp>();
  const {groupId} = route.params;
  const viewModel = React.useMemo(() => new GroupDetailsViewModel(groupId), [groupId]);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);
  const { isDark, primaryColor } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const [tempMaxDistance, setTempMaxDistance] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      viewModel.loadGroupData();
    }, [viewModel])
  );

  const handleSaveDescription = async () => {
    if (newDescription.trim()) {
      await viewModel.updateDescription(newDescription.trim());
      setIsEditingDescription(false);
    }
  };

  const handleSaveName = async () => {
    if (newName.trim()) {
      await viewModel.updateName(newName.trim());
      setIsEditingName(false);
    }
  };

  const handleDeleteGroup = async () => {
    Alert.alert(
      'Eliminar Grupo',
      '¿Estás seguro de que quieres eliminar este grupo? Esta acción no se puede deshacer.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const success = await viewModel.deleteGroup();
            if (success) {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }
          },
        },
      ],
    );
  };

  const handleRemoveMember = (userId: string) => {
    Alert.alert(
      'Eliminar Miembro',
      '¿Estás seguro de que quieres eliminar a este miembro del grupo?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => viewModel.removeMember(userId),
        },
      ],
    );
  };

  const handleAddMember = () => {
    navigation.navigate('AddMembers', { groupId });
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Salir del Grupo',
      '¿Estás seguro de que quieres salir de este grupo?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            const success = await viewModel.leaveGroup();
            if (success) {
              navigation.goBack();
            }
          },
        },
      ],
    );
  };

  const handleMemberOptions = (member: any) => {
    if (!viewModel.isAdmin) return;
    setSelectedMember(member);
    setShowOptionsMenu(true);
  };

  const handleMakeAdmin = async (userId: string) => {
    Alert.alert(
      'Hacer administrador',
      '¿Estás seguro de que quieres hacer administrador a este miembro? Ya no podrás eliminarlo del grupo.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await viewModel.makeAdmin(userId);
            } catch (error) {
              console.error('Error al hacer administrador:', error);
            }
          },
        },
      ],
    );
  };

  const handleRemoveAdmin = async (userId: string) => {
    Alert.alert(
      'Quitar administrador',
      '¿Estás seguro de que quieres quitar los privilegios de administrador a este miembro?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await viewModel.removeAdmin(userId);
            } catch (error) {
              console.error('Error al quitar administrador:', error);
            }
          },
        },
      ],
    );
  };

  const renderMember = ({item}: {item: any}) => (
    <TouchableOpacity
      style={[styles.memberItem, { borderBottomColor: currentTheme.border }]}
      onPress={() => navigation.navigate('UserProfile', {userId: item.id})}>
      {item.photoURL ? (
        <Image source={{uri: item.photoURL}} style={styles.memberPhoto} />
      ) : (
        <View style={[styles.memberPhotoPlaceholder, { backgroundColor: primaryColor }]}>
          <Text style={[styles.memberPhotoText, { color: currentTheme.background }]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.memberInfo}>
        <View style={styles.memberNameContainer}>
          <Text style={[styles.memberName, { color: currentTheme.text }]}>{item.name}</Text>
          {item.isAdmin && (
            <View style={[styles.adminBadge, { backgroundColor: primaryColor }]}>
              <Text style={[styles.adminText, { color: currentTheme.background }]}>Admin</Text>
            </View>
          )}
        </View>
        {item.isPhoneNumberPublic && (
          <Text style={[styles.memberPhone, { color: currentTheme.secondary }]}>{item.phoneNumber}</Text>
        )}
      </View>
      {viewModel.isAdmin && (
        <TouchableOpacity
          style={styles.memberOptionsButton}
          onPress={() => handleMemberOptions(item)}>
          <MaterialIcons name="more-vert" size={24} color={currentTheme.secondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (viewModel.loading) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (viewModel.error || !viewModel.groupData) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <Text style={[styles.errorText, { color: currentTheme.error }]}>
          {viewModel.error || 'Grupo no encontrado'}
        </Text>
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
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>Detalles del Grupo</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.groupInfo, { borderBottomColor: currentTheme.border }]}>
          <TouchableOpacity 
            style={styles.groupPhotoContainer}
            onPress={() => setIsPhotoExpanded(true)}
          >
            {viewModel.groupData.photoURL ? (
              <Image
                source={{uri: viewModel.groupData.photoURL}}
                style={styles.groupPhoto}
              />
            ) : (
              <View style={[styles.groupPhotoPlaceholder, { backgroundColor: primaryColor }]}>
                <Text style={[styles.groupPhotoText, { color: currentTheme.background }]}>
                  {viewModel.groupData.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {viewModel.uploadingPhoto && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color={currentTheme.background} />
            </View>
          )}

          {isEditingName ? (
            <View style={styles.editNameContainer}>
              <TextInput
                style={[styles.nameInput, { 
                  backgroundColor: currentTheme.card,
                  borderColor: currentTheme.border,
                  color: currentTheme.text
                }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="Nombre del grupo"
                placeholderTextColor={currentTheme.secondary}
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton, { backgroundColor: currentTheme.border }]}
                  onPress={() => setIsEditingName(false)}>
                  <Text style={[styles.editButtonText, { color: currentTheme.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, styles.saveButton, { backgroundColor: primaryColor }]}
                  onPress={handleSaveName}>
                  <Text style={[styles.editButtonText, { color: currentTheme.background }]}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.groupNameContainer}
              onPress={() => {
                if (viewModel.isAdmin) {
                  setNewName(viewModel.groupData?.name || '');
                  setIsEditingName(true);
                }
              }}>
              <Text style={[styles.groupName, { color: currentTheme.text }]}>{viewModel.groupData.name}</Text>
              {viewModel.isAdmin && (
                <MaterialIcons name="edit" size={16} color={primaryColor} style={styles.editIcon} />
              )}
            </TouchableOpacity>
          )}
          
          <View style={[styles.infoBox, { 
            backgroundColor: currentTheme.card,
            borderColor: currentTheme.border 
          }]}>
            <View style={styles.descriptionContainer}>
              {isEditingDescription ? (
                <View style={styles.editDescriptionContainer}>
                  <TextInput
                    style={[styles.descriptionInput, { 
                      backgroundColor: currentTheme.background,
                      borderColor: currentTheme.border,
                      color: currentTheme.text
                    }]}
                    value={newDescription}
                    onChangeText={setNewDescription}
                    placeholder="Escribe una descripción..."
                    placeholderTextColor={currentTheme.secondary}
                    multiline
                    maxLength={200}
                  />
                  <View style={styles.editButtons}>
                    <TouchableOpacity
                      style={[styles.editButton, styles.cancelButton, { backgroundColor: currentTheme.border }]}
                      onPress={() => setIsEditingDescription(false)}>
                      <Text style={[styles.editButtonText, { color: currentTheme.text }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editButton, styles.saveButton, { backgroundColor: primaryColor }]}
                      onPress={handleSaveDescription}>
                      <Text style={[styles.editButtonText, { color: currentTheme.background }]}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.descriptionTextContainer}
                  onPress={() => {
                    if (viewModel.isAdmin) {
                      setNewDescription(viewModel.groupData?.description || '');
                      setIsEditingDescription(true);
                    }
                  }}>
                  <Text style={[styles.descriptionText, { color: currentTheme.text }]}>
                    {viewModel.groupData.description || 'Sin descripción'}
                  </Text>
                  {viewModel.isAdmin && (
                    <MaterialIcons name="edit" size={16} color={primaryColor} style={styles.editIcon} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.visibilityContainer, { borderTopColor: currentTheme.border }]}>
              <View style={styles.visibilityHeader}>
                <MaterialIcons name="visibility" size={16} color={currentTheme.secondary} style={styles.visibilityIcon} />
                <Text style={[styles.visibilityTitle, { color: currentTheme.text }]}>Visibilidad</Text>
              </View>
              {viewModel.isAdmin ? (
                <TouchableOpacity
                  style={[styles.visibilityToggle, { backgroundColor: currentTheme.background }]}
                  onPress={() => viewModel.toggleVisibility()}>
                  <Text style={[styles.visibilityText, { color: currentTheme.text }]}>
                    {viewModel.groupData.isPublic ? 'Público' : 'Privado'}
                  </Text>
                  <MaterialIcons 
                    name={viewModel.groupData.isPublic ? "public" : "lock"} 
                    size={20} 
                    color={primaryColor} 
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.visibilityInfo}>
                  <Text style={[styles.visibilityText, { color: currentTheme.text }]}>
                    {viewModel.groupData.isPublic ? 'Público' : 'Privado'}
                  </Text>
                  <MaterialIcons 
                    name={viewModel.groupData.isPublic ? "public" : "lock"} 
                    size={20} 
                    color={currentTheme.secondary} 
                  />
                </View>
              )}
            </View>

            {/* Slider editable para max_distance solo si es admin y grupo público */}
            {viewModel.groupData.isPublic && (
              <View style={{ marginVertical: 16 }}>
                <Text style={{ color: currentTheme.text, fontWeight: 'bold', marginBottom: 8 }}>
                  Distancia máxima para unirse al grupo: {viewModel.isAdmin ? (tempMaxDistance ?? viewModel.groupData.max_distance ?? 10) : (viewModel.groupData.max_distance ?? 10)} km
                </Text>
                {viewModel.isAdmin ? (
                  <Slider
                    minimumValue={1}
                    maximumValue={30}
                    step={1}
                    value={tempMaxDistance ?? viewModel.groupData.max_distance ?? 10}
                    onValueChange={setTempMaxDistance}
                    onSlidingComplete={(value) => {
                      viewModel.updateMaxDistance(value);
                      setTempMaxDistance(null);
                    }}
                    minimumTrackTintColor={primaryColor}
                    maximumTrackTintColor={currentTheme.border}
                    thumbTintColor={primaryColor}
                  />
                ) : null}
              </View>
            )}

            <View style={[styles.locationContainer, { borderTopColor: currentTheme.border }]}>
              <View style={styles.locationHeader}>
                <MaterialIcons name="location-on" size={16} color={currentTheme.secondary} style={styles.locationIcon} />
                <Text style={[styles.locationTitle, { color: currentTheme.text }]}>Ubicación</Text>
              </View>
              {viewModel.isAdmin && viewModel.groupData.isPublic ? (
                <TouchableOpacity
                  style={[styles.locationButton, { backgroundColor: currentTheme.background }]}
                  onPress={() => viewModel.updateLocation()}>
                  {viewModel.groupData.location ? (
                    <Text style={[styles.locationText, { color: currentTheme.text }]}>
                      {viewModel.groupData.location.address || 'Ubicación actual'}
                    </Text>
                  ) : (
                    <Text style={[styles.locationText, { color: currentTheme.secondary }]}>
                      Añadir ubicación
                    </Text>
                  )}
                  <MaterialIcons name="edit-location" size={20} color={primaryColor} />
                </TouchableOpacity>
              ) : (
                <View style={styles.locationInfo}>
                  {!viewModel.groupData.isPublic ? (
                    <Text style={[styles.locationText, { color: currentTheme.secondary }]}>
                      No disponible para grupos privados
                    </Text>
                  ) : viewModel.groupData.location ? (
                    <Text style={[styles.locationText, { color: currentTheme.text }]}>
                      {viewModel.groupData.location.address || 'Ubicación actual'}
                    </Text>
                  ) : (
                    <Text style={[styles.locationText, { color: currentTheme.secondary }]}>
                      Sin ubicación
                    </Text>
                  )}
                  {!viewModel.groupData.isPublic && (
                    <MaterialIcons name="lock" size={20} color={currentTheme.secondary} />
                  )}
                </View>
              )}
            </View>

            <View style={[styles.creationDateContainer, { borderTopColor: currentTheme.border }]}>
              <MaterialIcons name="event" size={16} color={currentTheme.secondary} style={styles.dateIcon} />
              <Text style={[styles.creationDate, { color: currentTheme.secondary }]}>
                Creado el {viewModel.groupData.createdAt.toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              Miembros ({viewModel.members.length})
            </Text>
            {viewModel.isAdmin && (
              <TouchableOpacity
                style={styles.addMemberButton}
                onPress={handleAddMember}>
                <MaterialIcons name="person-add" size={24} color={primaryColor} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={viewModel.members}
            renderItem={renderMember}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.membersList}
          />
        </View>

        {viewModel.isAdmin ? (
          <TouchableOpacity
            style={[styles.deleteButton, { 
              backgroundColor: currentTheme.error + '20',
              borderColor: currentTheme.error 
            }]}
            onPress={handleDeleteGroup}>
            <MaterialIcons name="delete" size={24} color={currentTheme.error} />
            <Text style={[styles.deleteButtonText, { color: currentTheme.error }]}>Eliminar Grupo</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.leaveButton, { 
              backgroundColor: currentTheme.error + '20',
              borderColor: currentTheme.error 
            }]}
            onPress={handleLeaveGroup}>
            <MaterialIcons name="exit-to-app" size={24} color={currentTheme.error} />
            <Text style={[styles.leaveButtonText, { color: currentTheme.error }]}>Salir del Grupo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <MemberOptionsMenu
        visible={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
        onMakeAdmin={() => selectedMember && handleMakeAdmin(selectedMember.id)}
        onRemoveAdmin={() => selectedMember && handleRemoveAdmin(selectedMember.id)}
        onRemove={() => selectedMember && handleRemoveMember(selectedMember.id)}
        memberName={selectedMember?.name || ''}
        isAdmin={selectedMember?.isAdmin || false}
      />

      <Modal
        visible={isPhotoExpanded}
        transparent={true}
        onRequestClose={() => setIsPhotoExpanded(false)}>
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setIsPhotoExpanded(false)}>
          <View style={styles.expandedPhotoContainer}>
            {viewModel.isAdmin && (
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
                  Cambiar foto del grupo
                </Text>
              </TouchableOpacity>
            )}
            {viewModel.groupData?.photoURL ? (
              <Image
                source={{uri: viewModel.groupData.photoURL}}
                style={styles.expandedPhoto}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.expandedPhotoPlaceholder, { backgroundColor: primaryColor }]}>
                <Text style={[styles.expandedPhotoText, { color: currentTheme.background }]}>
                  {viewModel.groupData?.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  groupInfo: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
  },
  groupPhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    overflow: 'hidden',
  },
  groupPhoto: {
    width: '100%',
    height: '100%',
  },
  groupPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupPhotoText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoBox: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  descriptionContainer: {
    width: '100%',
    marginBottom: 12,
  },
  descriptionTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 8,
  },
  descriptionText: {
    fontSize: 16,
    textAlign: 'left',
    marginRight: 4,
    flex: 1,
  },
  editIcon: {
    marginLeft: 4,
  },
  editDescriptionContainer: {
    width: '100%',
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#E5E5E5',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  editButtonText: {
    fontSize: 16,
  },
  creationDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  dateIcon: {
    marginRight: 4,
  },
  creationDate: {
    fontSize: 14,
  },
  membersSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  membersList: {
    paddingBottom: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberPhotoText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  memberPhone: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
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
    zIndex: 1000,
  },
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  editNameContainer: {
    width: '100%',
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addMemberButton: {
    padding: 8,
  },
  removeMemberButton: {
    padding: 8,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  adminText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  memberOptionsButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
  visibilityContainer: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  visibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  visibilityIcon: {
    marginRight: 4,
  },
  visibilityTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
  },
  visibilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  },
  visibilityText: {
    fontSize: 14,
  },
  locationContainer: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    marginRight: 4,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  },
  locationText: {
    fontSize: 14,
  },
});

export default GroupDetailsScreen; 