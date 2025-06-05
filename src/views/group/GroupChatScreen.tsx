import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { GroupChatViewModel } from '../../viewmodels/GroupChatViewModel';
import { globalStyles } from '../../styles/globalStyles';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';

type GroupChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GroupChat'>;

interface GroupChatScreenProps {
  route: {
    params: {
      groupId: string;
    };
  };
}

const GroupChatScreen = observer(({ route }: GroupChatScreenProps) => {
  const { groupId } = route.params;
  const navigation = useNavigation<GroupChatNavigationProp>();
  const viewModel = React.useMemo(
    () => new GroupChatViewModel(groupId),
    [groupId]
  );
  const flatListRef = useRef<FlatList>(null);
  const { isDark, secondaryColor, primaryColor } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  useEffect(() => {
    return () => {
      viewModel.cleanup();
    };
  }, [viewModel]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (selectedMessages.length > 0) {
        e.preventDefault();
        setSelectedMessages([]);
      }
    });

    return unsubscribe;
  }, [navigation, selectedMessages]);

  const handleLongPress = (messageId: string) => {
    handleMessageSelect(messageId);
  };

  const handleMessageSelect = (messageId: string) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      } else {
        return [...prev, messageId];
      }
    });
  };

  const handleDeleteMessages = async () => {
    if (selectedMessages.length === 0) return;

    Alert.alert(
      'Eliminar mensajes',
      `¿Estás seguro de que quieres eliminar ${selectedMessages.length} mensaje${selectedMessages.length > 1 ? 's' : ''}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            for (const messageId of selectedMessages) {
              const message = viewModel.messages.find(m => m.id === messageId);
              if (message) {
                await viewModel.deleteMessage(message);
              }
            }
            setSelectedMessages([]);
          }
        }
      ]
    );
  };

  const handleDeleteAllMessages = async () => {
    Alert.alert(
      'Eliminar todos los mensajes',
      '¿Estás seguro de que quieres eliminar todos los mensajes de este grupo?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar todo',
          style: 'destructive',
          onPress: async () => {
            for (const message of viewModel.messages) {
              await viewModel.deleteMessage(message);
            }
            setSelectedMessages([]);
          }
        }
      ]
    );
  };

  const toggleImageMenu = () => {
    const toValue = showImageMenu ? 0 : 1;
    Animated.spring(menuAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
    setShowImageMenu(!showImageMenu);
  };

  const handleImageOption = (option: 'gallery' | 'camera') => {
    toggleImageMenu();
    if (option === 'gallery') {
      viewModel.pickAndSendImage();
    } else {
      viewModel.takeAndSendPhoto();
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = viewModel.isOwnMessage(item);
    const senderName = viewModel.getParticipantName(item.senderId);
    const isSelected = selectedMessages.includes(item.id);

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item.id)}
        onPress={() => {
          if (selectedMessages.length > 0) {
            handleMessageSelect(item.id);
          }
        }}
        delayLongPress={200}>
        <View
          style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessage : styles.otherMessage,
            {
              backgroundColor: isOwnMessage ? secondaryColor : currentTheme.card,
              borderWidth: isSelected ? 2 : 0,
              borderColor: primaryColor,
            }
          ]}
        >
          <View style={styles.messageContentColumn}>
            {!isOwnMessage && (
              <Text style={[styles.senderName, { color: primaryColor }]}>
                {senderName}
              </Text>
            )}
            <View style={styles.messageContentRow}>
              {item.type === 'image' ? (
                <TouchableOpacity onPress={() => setSelectedImage(item.imageUrl)}>
                  <Image
                    source={{ uri: item.imageUrl }} 
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <Text
                  style={[
                    styles.messageText,
                    { color: isOwnMessage ? currentTheme.background : currentTheme.text }
                  ]}
                >
                  {item.text}
                </Text>
              )}
              <Text
                style={[
                  styles.messageTime,
                  { color: isOwnMessage ? currentTheme.background : currentTheme.secondary }
                ]}
              >
                {item.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Enviando...'}
              </Text>
            </View>
          </View>
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: currentTheme.background }]}
      behavior={'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      enabled={true}
    >
      <View style={[styles.header, { 
        backgroundColor: currentTheme.card,
        borderBottomColor: currentTheme.border 
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (selectedMessages.length > 0) {
              setSelectedMessages([]);
            } else {
              navigation.goBack();
            }
          }}>
          <Icon 
            name={selectedMessages.length > 0 ? "close" : "arrow-back"} 
            size={24} 
            color={primaryColor} 
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          {selectedMessages.length > 0 ? (
            <View style={styles.selectionHeader}>
              <Text style={[styles.selectionText, { color: currentTheme.text }]}>
                {selectedMessages.length} mensaje{selectedMessages.length > 1 ? 's' : ''} seleccionado{selectedMessages.length > 1 ? 's' : ''}
              </Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.headerButton, { backgroundColor: '#ff4444' }]}
                  onPress={handleDeleteMessages}>
                  <Icon name="trash" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.headerContent}
                onPress={() => navigation.navigate('GroupDetails', { groupId })}>
                {viewModel.groupPhotoURL ? (
                  <Image 
                    source={{ uri: viewModel.groupPhotoURL }} 
                    style={styles.headerPhoto}
                  />
                ) : (
                  <View style={[styles.headerPhotoPlaceholder, { backgroundColor: primaryColor }]}>
                    <Text style={[styles.headerPhotoText, { color: currentTheme.background }]}>
                      {viewModel.groupName?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <Text 
                  style={[styles.headerTitle, { color: currentTheme.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {viewModel.groupName}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setShowOptionsMenu(true)}>
                <Icon name="ellipsis-vertical" size={24} color={primaryColor} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      <FlatList
        ref={flatListRef}
        data={viewModel.messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.messageList}
      />
      <View style={[styles.inputContainer, { 
        backgroundColor: currentTheme.card,
        borderTopColor: currentTheme.border 
      }]}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={toggleImageMenu}>
          <Icon name="attach" size={24} color={primaryColor} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { 
            backgroundColor: currentTheme.background,
            color: currentTheme.text
          }]}
          value={viewModel.newMessage}
          onChangeText={viewModel.setNewMessage}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={currentTheme.secondary}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: viewModel.newMessage.trim() ? secondaryColor : currentTheme.border }
          ]}
          onPress={() => viewModel.sendMessage()}
          disabled={!viewModel.newMessage.trim()}
        >
          <Text style={[styles.sendButtonText, { color: currentTheme.background }]}>
            Enviar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Menú de opciones de imagen */}
      <Modal
        visible={showImageMenu}
        transparent={true}
        animationType="none"
        onRequestClose={toggleImageMenu}>
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={toggleImageMenu}>
          <Animated.View 
            style={[
              styles.menuContainer,
              {
                backgroundColor: currentTheme.card,
                transform: [{
                  translateY: menuAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0]
                  })
                }]
              }
            ]}>
            <View style={styles.menuContent}>
              <TouchableOpacity 
                style={[styles.menuOption, { borderBottomColor: currentTheme.border }]}
                onPress={() => handleImageOption('gallery')}>
                <Icon name="images" size={24} color={primaryColor} />
                <Text style={[styles.menuOptionText, { color: currentTheme.text }]}>
                  Galería
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuOption}
                onPress={() => handleImageOption('camera')}>
                <Icon name="camera" size={24} color={primaryColor} />
                <Text style={[styles.menuOptionText, { color: currentTheme.text }]}>
                  Cámara
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {viewModel.uploadingImage && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.uploadingText, { color: currentTheme.text }]}>
            Subiendo imagen...
          </Text>
        </View>
      )}

      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalContainer}>
          <Image
            source={{ uri: selectedImage || '' }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}>
            <Icon name="close" size={30} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Menú de opciones */}
      <Modal
        visible={showOptionsMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}>
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}>
          <View style={[styles.optionsMenuContainer, { backgroundColor: currentTheme.card }]}>
            <TouchableOpacity 
              style={[styles.menuOption, { borderBottomColor: currentTheme.border }]}
              onPress={() => {
                setShowOptionsMenu(false);
                handleDeleteAllMessages();
              }}>
              <Icon name="trash-outline" size={24} color="#ff4444" />
              <Text style={[styles.menuOptionText, { color: '#ff4444' }]}>
                Vaciar chat
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerPhotoText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    width: '75%',
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 8,
    borderRadius: 16,
  },
  messageContentColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  messageContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 6,
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    flexShrink: 1,
  },
  messageTime: {
    fontSize: 10,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
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
  uploadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    zIndex: 1000,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuContent: {
    padding: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 150,
    borderBottomWidth: 1,
  },
  menuOptionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  selectionHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  optionsMenuContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 150,
  },
});

export default GroupChatScreen;
