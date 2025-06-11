import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {observer} from 'mobx-react-lite';
import {UserProfileViewModel} from '../../viewmodels/UserProfileViewModel';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';

type UserProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'UserProfile'>;

const UserProfileScreen = observer(() => {
  const navigation = useNavigation<UserProfileNavigationProp>();
  const route = useRoute();
  const {userId} = route.params as {userId: string};
  const viewModel = React.useMemo(() => new UserProfileViewModel(userId), [userId]);
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);
  const { isDark, primaryColor } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    return () => {
      viewModel.cleanup();
    };
  }, [viewModel]);

  const handleStartChat = async () => {
    try {
      const result = await viewModel.startChat();
      if (result.chatId && result.otherParticipantId) {
        navigation.navigate('Chat', {
          chatId: result.chatId,
          otherParticipantId: result.otherParticipantId,
        });
      } else {
        Alert.alert('Error', 'No se pudo iniciar el chat');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar el chat');
    }
  };

  if (viewModel.loading) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (viewModel.error || !viewModel.userData) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <Text style={[styles.errorText, { color: currentTheme.error }]}>
          {viewModel.error || 'Usuario no encontrado'}
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
          <Icon name="arrow-back" size={24} color={primaryColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>Perfil</Text>
      </View>

      <View style={styles.profileContainer}>
        <TouchableOpacity onPress={() => setIsPhotoExpanded(true)}>
          {viewModel.userData.photoURL ? (
            <Image source={{uri: viewModel.userData.photoURL}} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
              <Text style={[styles.avatarText, { color: currentTheme.background }]}>
                {viewModel.userData.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={[styles.name, { color: currentTheme.text }]}>{viewModel.userData.name}</Text>
        <Text style={[styles.phoneNumber, { color: currentTheme.secondary }]}>
          {viewModel.userData.phoneNumber}
        </Text>

        <TouchableOpacity
          style={[styles.chatButton, { backgroundColor: primaryColor }]}
          onPress={handleStartChat}>
          <Icon name="chatbubble-outline" size={20} color="white" style={styles.chatButtonIcon} />
          <Text style={styles.chatButtonText}>Iniciar Chat</Text>
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          <Text style={[styles.statusLabel, { color: currentTheme.secondary }]}>
            Estado
          </Text>
          <View style={[styles.statusBox, { 
            backgroundColor: currentTheme.card,
            borderColor: currentTheme.border
          }]}>
            <Text style={[styles.status, { color: currentTheme.text }]}>
              {viewModel.userData.status || '¡Hola! Estoy usando MichatApp'}
            </Text>
          </View>
        </View>
      </View>

      <Modal
        visible={isPhotoExpanded}
        transparent={true}
        onRequestClose={() => setIsPhotoExpanded(false)}>
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setIsPhotoExpanded(false)}>
          {viewModel.userData.photoURL ? (
            <Image
              source={{uri: viewModel.userData.photoURL}}
              style={styles.expandedAvatar}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.expandedAvatarPlaceholder, { backgroundColor: primaryColor }]}>
              <Text style={[styles.expandedAvatarText, { color: currentTheme.background }]}>
                {viewModel.userData.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  profileContainer: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedAvatar: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').width * 0.9,
    borderRadius: 10,
  },
  expandedAvatarPlaceholder: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').width * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  expandedAvatarText: {
    fontSize: 120,
    fontWeight: 'bold',
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
  status: {
    fontSize: 16,
    textAlign: 'left',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 16,
    marginBottom: 8,
  },
  chatButtonIcon: {
    marginRight: 8,
  },
  chatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UserProfileScreen; 