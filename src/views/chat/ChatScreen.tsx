import React, {useRef, useEffect, useState} from 'react';
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
  Alert,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import {observer} from 'mobx-react-lite';
import {ChatViewModel} from '../../viewmodels/ChatViewModel';
import {globalStyles} from '../../styles/globalStyles';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';
import { Message } from '../../models/Message';
import { CacheService } from '../../services/cache';
import { runInAction } from 'mobx';

type ChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

interface ChatScreenProps {
  route: {
    params: {
      chatId: string;
      otherParticipantId: string;
    };
  };
}

const ChatScreen = observer(({route}: ChatScreenProps) => {
  const {chatId, otherParticipantId} = route.params;
  const navigation = useNavigation<ChatNavigationProp>();
  const viewModel = React.useMemo(
    () => new ChatViewModel(chatId, otherParticipantId),
    [chatId, otherParticipantId],
  );
  const flatListRef = useRef<FlatList>(null);
  const { isDark, secondaryColor, primaryColor } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [selectedMessagePosition, setSelectedMessagePosition] = useState({ x: 0, y: 0 });
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

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
      '¿Estás seguro de que quieres eliminar todos los mensajes de este chat?',
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

  const renderMessage = ({item}: {item: any}) => {
    const isOwnMessage = viewModel.isOwnMessage(item);
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
          ]}>
          <View style={styles.messageContent}>
            {item.type === 'image' ? (
              <TouchableOpacity 
                onPress={() => {
                  if (selectedMessages.length > 0) {
                    handleMessageSelect(item.id);
                  } else {
                    setSelectedImage(item.imageUrl);
                  }
                }}
                onLongPress={() => handleLongPress(item.id)}
                delayLongPress={200}>
                <Image
                  source={{ uri: item.imageUrl }} 
                  style={styles.messageImage}
                  resizeMode="cover"
                  onError={(error) => {
                    console.error('Error al cargar imagen:', error.nativeEvent);
                    // Intentar cargar la imagen local si falla la carga remota
                    CacheService.getLocalImage(item.imageUrl, chatId)
                      .then(localPath => {
                        if (localPath) {
                          runInAction(() => {
                            item.imageUrl = localPath;
                          });
                        }
                      })
                      .catch(console.error);
                  }}
                />
              </TouchableOpacity>
            ) : (
              <Text 
                selectable={true}
                style={[
                  styles.messageText,
                  { color: isOwnMessage ? currentTheme.background : currentTheme.text }
                ]}>
                {item.text}
              </Text>
            )}
            <Text style={[
              styles.messageTime,
              { color: isOwnMessage ? currentTheme.background : currentTheme.secondary }
            ]}>
              {item.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Enviando...'}
            </Text>
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
      enabled={true}>
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
              {viewModel.otherParticipantPhoto ? (
                <Image 
                  source={{ uri: viewModel.otherParticipantPhoto }} 
                  style={styles.headerPhoto}
                />
              ) : (
                <View style={[styles.headerPhotoPlaceholder, { backgroundColor: primaryColor }]}>
                  <Text style={[styles.headerPhotoText, { color: currentTheme.background }]}>
                    {viewModel.otherParticipantName?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <TouchableOpacity 
                onPress={() => navigation.navigate('UserProfile', { userId: otherParticipantId })}
                style={styles.headerTitleContainer}>
                <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
                  {viewModel.otherParticipantName}
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
          disabled={!viewModel.newMessage.trim()}>
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
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
  messageContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
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
    bottom: 80, // Altura aproximada del área de entrada de mensajes
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
  messageMenuContainer: {
    position: 'absolute',
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

export default ChatScreen; 