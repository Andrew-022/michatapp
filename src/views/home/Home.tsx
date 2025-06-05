import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Animated,
  Alert,
  Image,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { observer } from 'mobx-react-lite';
import { HomeViewModel } from '../../viewmodels/HomeViewModel';
import Icon from 'react-native-vector-icons/MaterialIcons';
import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';
import { globalStyles } from '../../styles/globalStyles';
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';
import { getMessaging, getToken } from '@react-native-firebase/messaging';
import { saveUserFCMToken } from '../../services/firestore';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const Home = observer(() => {
  const navigation = useNavigation<HomeNavigationProp>();
  const viewModel = React.useMemo(() => new HomeViewModel(), []);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-300)).current;
  const { isDark, secondaryColor, primaryColor } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
    Animated.timing(slideAnim, {
      toValue: menuVisible ? -300 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigation.replace('PhoneAuth');
      }
    });

    // Solicitar permiso de notificaciones cuando se carga el componente
    viewModel.requestNotificationPermission();

    return () => unsubscribe();
  }, [navigation]);

  const handleSignOut = async () => {
    try {
      await viewModel.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleChatPress = (chat: any) => {
    const otherParticipantId = viewModel.getOtherParticipantId(chat);
    if (otherParticipantId) {
      navigation.navigate('Chat', {
        chatId: chat.id,
        otherParticipantId,
      });
    }
  };

  const renderChatItem = ({item}: {item: any}) => {
    const isGroup = !!item.adminIds;
    let lastMessageText = 'No hay mensajes';
    if (item.lastMessage) {
      if (item.lastMessage.type === 'image') {
        lastMessageText = '📷 Imagen';
      } else if (item.lastMessage.text) {
        lastMessageText = item.lastMessage.text;
      }
    }

    return (
      <TouchableOpacity
        style={[styles.chatItem, { 
          backgroundColor: currentTheme.card,
          borderBottomColor: currentTheme.border 
        }]}
        onPress={() => {
          if (isGroup) {
            navigation.navigate('GroupChat', { groupId: item.id });
          } else {
            const otherParticipantId = viewModel.getOtherParticipantId(item);
            if (otherParticipantId) {
              navigation.navigate('Chat', {
                chatId: item.id,
                otherParticipantId,
              });
            }
          }
        }}>
        <View style={[styles.avatarContainer, { backgroundColor: primaryColor }]}>
          {isGroup ? (
            item.photoURL ? (
              <Image 
                source={{ uri: item.photoURL }} 
                style={styles.avatarImage}
              />
            ) : (
              <Text style={[styles.avatarText, { color: currentTheme.background }]}>
                {item.name?.charAt(0).toUpperCase() || 'G'}
              </Text>
            )
          ) : item.otherParticipantPhoto ? (
            <Image 
              source={{ uri: item.otherParticipantPhoto }} 
              style={styles.avatarImage}
            />
          ) : (
            <Text style={[styles.avatarText, { color: currentTheme.background }]}>
              {item.otherParticipantName?.charAt(0).toUpperCase() || '?'}
            </Text>
          )}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text 
              style={[styles.chatName, { color: currentTheme.text }]} 
              numberOfLines={1}
              ellipsizeMode="tail">
              {isGroup
                ? item.name
                : item.otherParticipantName || 'Usuario desconocido'}
            </Text>
            <View style={styles.headerRight}>
              {item.lastMessageTime && (
                <Text style={[styles.lastMessageTime, { color: currentTheme.text }]}>
                  {viewModel.formatLastMessageTime(item.lastMessageTime)}
                </Text>
              )}
              {item.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: primaryColor }]}>
                  <Text style={styles.unreadCount}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
          <Text 
            style={[styles.lastMessage, { color: currentTheme.text }]} 
            numberOfLines={1}
            ellipsizeMode="tail">
            {lastMessageText}
          </Text>
        </View>
      </TouchableOpacity>
    );
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
      <View style={[styles.header, { backgroundColor: currentTheme.card, borderBottomColor: currentTheme.border }]}>
        <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
          <Icon name="menu" size={24} color={primaryColor} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: currentTheme.text }]}>Chats</Text>
        </View>
        <View style={styles.menuButton} />
      </View>

      <FlatList
        data={viewModel.chats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: currentTheme.text }]}>No tienes chats aún</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.newChatButton, { backgroundColor: primaryColor }]}
        onPress={() => navigation.navigate('ContactList')}>
        <Text style={[styles.newChatButtonText, { color: currentTheme.background }]}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={toggleMenu}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={toggleMenu}>
          <Animated.View
            style={[
              styles.menuContainer,
              {
                transform: [{translateX: slideAnim}],
                backgroundColor: currentTheme.card,
              },
            ]}>
            <View style={styles.menuHeader}>
              <Text style={[styles.menuTitle, { color: currentTheme.text }]}>Menú</Text>
              <TouchableOpacity onPress={toggleMenu}>
                <Icon name="close" size={24} color={currentTheme.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: currentTheme.border }]} 
              onPress={() => {
                navigation.navigate('Profile');
                toggleMenu();
              }}>
              <Icon name="person" size={24} color={primaryColor} />
              <Text style={[styles.menuItemText, { color: currentTheme.text }]}>Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: currentTheme.border }]} 
              onPress={() => {
                navigation.navigate('Settings');
                toggleMenu();
              }}>
              <Icon name="settings" size={24} color={primaryColor} />
              <Text style={[styles.menuItemText, { color: currentTheme.text }]}>Configuración</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: currentTheme.border }]} 
              onPress={() => {
                navigation.navigate('CreateGroup');
                toggleMenu();
              }}>
              <Icon name="group-add" size={24} color={primaryColor} />
              <Text style={[styles.menuItemText, { color: currentTheme.text }]}>Crear Grupo</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: currentTheme.border }]} 
              onPress={() => {
                navigation.navigate('NearbyGroups');
                toggleMenu();
              }}>
              <Icon name="location-on" size={24} color={primaryColor} />
              <Text style={[styles.menuItemText, { color: currentTheme.text }]}>Grupos Cercanos</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: currentTheme.border }]} 
              onPress={handleSignOut}>
              <Icon name="exit-to-app" size={24} color={currentTheme.error} />
              <Text style={[styles.menuItemText, { color: currentTheme.error }]}>
                Cerrar Sesión
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuButton: {
    padding: 8,
    width: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    fontSize: 16,
  },
  chatList: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    width: '75%',
    marginRight: 8,
  },
  lastMessage: {
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
  newChatButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  newChatButtonText: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 300,
    height: '100%',
    padding: 16,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 40,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 16,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '25%',
    justifyContent: 'flex-end',
  },
  lastMessageTime: {
    fontSize: 12,
  },
});

export default Home; 