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
} from 'react-native';
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {observer} from 'mobx-react-lite';
import {GroupDetailsViewModel} from '../../viewmodels/GroupDetailsViewModel';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { globalStyles } from '../../styles/globalStyles';

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
              navigation.goBack();
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

  const renderMember = ({item}: {item: any}) => (
    <TouchableOpacity
      style={styles.memberItem}
      onPress={() => navigation.navigate('UserProfile', {userId: item.id})}>
      {item.photoURL ? (
        <Image source={{uri: item.photoURL}} style={styles.memberPhoto} />
      ) : (
        <View style={styles.memberPhotoPlaceholder}>
          <Text style={[styles.memberPhotoText, globalStyles.textWhite]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.memberInfo}>
        <View style={styles.memberNameContainer}>
          <Text style={[styles.memberName, globalStyles.text]}>{item.name}</Text>
          {item.isAdmin && (
            <View style={styles.adminBadge}>
              <Text style={[styles.adminText, globalStyles.textWhite]}>Admin</Text>
            </View>
          )}
        </View>
        <Text style={[styles.memberPhone, globalStyles.textSecondary]}>{item.phoneNumber}</Text>
      </View>
      {viewModel.isAdmin && item.id !== viewModel.groupData?.adminId && (
        <TouchableOpacity
          style={styles.removeMemberButton}
          onPress={() => handleRemoveMember(item.id)}>
          <MaterialIcons name="remove-circle" size={24} color="#FF3B30" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (viewModel.loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (viewModel.error || !viewModel.groupData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{viewModel.error || 'Grupo no encontrado'}</Text>
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
        <Text style={[styles.headerTitle, globalStyles.text]}>Detalles del Grupo</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.groupInfo}>
          <TouchableOpacity 
            style={styles.groupPhotoContainer}
            onPress={() => viewModel.pickAndUploadPhoto()}
          >
            {viewModel.groupData.photoURL ? (
              <Image
                source={{uri: viewModel.groupData.photoURL}}
                style={styles.groupPhoto}
              />
            ) : (
              <View style={styles.groupPhotoPlaceholder}>
                <Text style={[styles.groupPhotoText, globalStyles.textWhite]}>
                  {viewModel.groupData.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {viewModel.isAdmin && (
              <View style={styles.editPhotoButton}>
                <MaterialIcons name="camera-alt" size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {viewModel.uploadingPhoto && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}

          {isEditingName ? (
            <View style={styles.editNameContainer}>
              <TextInput
                style={[styles.nameInput, globalStyles.text]}
                value={newName}
                onChangeText={setNewName}
                placeholder="Nombre del grupo"
                placeholderTextColor="#666"
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={() => setIsEditingName(false)}>
                  <Text style={[styles.editButtonText, globalStyles.text]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, styles.saveButton]}
                  onPress={handleSaveName}>
                  <Text style={[styles.editButtonText, globalStyles.textWhite]}>Guardar</Text>
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
              <Text style={[styles.groupName, globalStyles.text]}>{viewModel.groupData.name}</Text>
              {viewModel.isAdmin && (
                <MaterialIcons name="edit" size={16} color="#007AFF" style={styles.editIcon} />
              )}
            </TouchableOpacity>
          )}
          
          <View style={styles.infoBox}>
            <View style={styles.descriptionContainer}>
              {isEditingDescription ? (
                <View style={styles.editDescriptionContainer}>
                  <TextInput
                    style={[styles.descriptionInput, globalStyles.text]}
                    value={newDescription}
                    onChangeText={setNewDescription}
                    placeholder="Escribe una descripción..."
                    placeholderTextColor="#666"
                    multiline
                    maxLength={200}
                  />
                  <View style={styles.editButtons}>
                    <TouchableOpacity
                      style={[styles.editButton, styles.cancelButton]}
                      onPress={() => setIsEditingDescription(false)}>
                      <Text style={[styles.editButtonText, globalStyles.text]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editButton, styles.saveButton]}
                      onPress={handleSaveDescription}>
                      <Text style={[styles.editButtonText, globalStyles.textWhite]}>Guardar</Text>
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
                  <Text style={[styles.descriptionText, globalStyles.text]}>
                    {viewModel.groupData.description || 'Sin descripción'}
                  </Text>
                  {viewModel.isAdmin && (
                    <MaterialIcons name="edit" size={16} color="#007AFF" style={styles.editIcon} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.creationDateContainer}>
              <MaterialIcons name="event" size={16} color="#666" style={styles.dateIcon} />
              <Text style={[styles.creationDate, globalStyles.textSecondary]}>
                Creado el {viewModel.groupData.createdAt.toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, globalStyles.text]}>
              Miembros ({viewModel.members.length})
            </Text>
            {viewModel.isAdmin && (
              <TouchableOpacity
                style={styles.addMemberButton}
                onPress={handleAddMember}>
                <MaterialIcons name="person-add" size={24} color="#007AFF" />
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

        {viewModel.isAdmin && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteGroup}>
            <MaterialIcons name="delete" size={24} color="#FF3B30" />
            <Text style={styles.deleteButtonText}>Eliminar Grupo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    borderBottomColor: '#E5E5E5',
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
    borderBottomColor: '#E5E5E5',
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
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupPhotoText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
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
    borderTopColor: '#E5E5E5',
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
    borderBottomColor: '#E5E5E5',
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
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberPhotoText: {
    fontSize: 20,
    color: '#fff',
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
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  editIcon: {
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
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
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  adminText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default GroupDetailsScreen; 