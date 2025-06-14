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
import * as ImagePicker from 'react-native-image-picker';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

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
  const [imageToSend, setImageToSend] = useState<{uri: string; type?: string; fileName?: string} | null>(null);
  const [imageText, setImageText] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightAnimation = useRef(new Animated.Value(0)).current;
  const swipeableRefs = useRef(new Map<string, Swipeable>()).current;

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
      ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      }).then(result => {
        if (result.assets && result.assets[0]) {
          setImageToSend({
            uri: result.assets[0].uri || '',
            type: result.assets[0].type,
            fileName: result.assets[0].fileName
          });
        }
      });
    } else {
      ImagePicker.launchCamera({
        mediaType: 'photo',
        quality: 0.8,
      }).then(result => {
        if (result.assets && result.assets[0]) {
          setImageToSend({
            uri: result.assets[0].uri || '',
            type: result.assets[0].type,
            fileName: result.assets[0].fileName
          });
        }
      });
    }
  };

  const handleSendImage = async () => {
    if (imageToSend) {
      setImageToSend(null);
      setImageText('');
      await viewModel.sendImage(imageToSend, imageText);
      viewModel.cancelReply();
    }
  };

  const handleCancelImage = () => {
    setImageToSend(null);
  };

  const handleLongPress = (messageId: string) => {
    handleMessageSelect(messageId);
  };

  const handleSwipeRight = (message: Message) => {
    viewModel.setReplyingTo(message);
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

  const renderRightActions = (message: Message) => {
    return (
      <TouchableOpacity
        style={[styles.replyAction, { backgroundColor: primaryColor }]}
        onPress={() => handleSwipeRight(message)}>
        <Icon name="arrow-undo" size={24} color="white" />
      </TouchableOpacity>
    );
  };

  const renderLeftActions = (message: Message) => {
    return (
      <TouchableOpacity
        style={[styles.selectAction, { backgroundColor: secondaryColor }]}
        onPress={() => handleMessageSelect(message.id)}>
        <Icon name="checkmark-circle" size={24} color="white" />
      </TouchableOpacity>
    );
  };

  const scrollToMessage = (messageId: string) => {
    const index = viewModel.messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5
      });

      // Iniciar animación de resaltado
      setHighlightedMessageId(messageId);
      highlightAnimation.setValue(0);
      Animated.sequence([
        Animated.timing(highlightAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(highlightAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setHighlightedMessageId(null);
      });
    }
  };

  const handleReplyPress = (messageId: string) => {
    if (selectedMessages.length === 0) {
      scrollToMessage(messageId);
    }
  };

  const renderMessage = ({item}: {item: any}) => {
    const isOwnMessage = viewModel.isOwnMessage(item);
    const isSelected = selectedMessages.includes(item.id);
    const isHighlighted = item.id === highlightedMessageId;

    const highlightStyle = {
      transform: [{
        scale: highlightAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.05]
        })
      }],
      opacity: highlightAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.8]
      })
    };

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.set(item.id, ref);
          } else {
            swipeableRefs.delete(item.id);
          }
        }}
        renderLeftActions={() => (
          <View style={{ width: 80 }} />
        )}
        leftThreshold={40}
        onSwipeableWillOpen={() => {
          if (!isSelected) {
            handleSwipeRight(item);
            swipeableRefs.get(item.id)?.close();
          }
        }}
        overshootLeft={false}
        friction={2}
        enabled={!isSelected}>
        <TouchableOpacity
          onLongPress={() => handleLongPress(item.id)}
          onPress={() => {
            if (selectedMessages.length > 0) {
              handleMessageSelect(item.id);
            }
          }}
          delayLongPress={200}>
          <Animated.View
            style={[
              styles.messageContainer,
              isOwnMessage ? styles.ownMessage : styles.otherMessage,
              {
                backgroundColor: isOwnMessage ? secondaryColor : currentTheme.card,
                borderWidth: isSelected ? 2 : 0,
                borderColor: primaryColor,
              },
              isHighlighted && highlightStyle
            ]}>
            {item.replyTo && (
              <TouchableOpacity 
                style={[styles.replyContainer, { 
                  borderLeftColor: isOwnMessage ? currentTheme.background : primaryColor 
                }]}
                onPress={() => handleReplyPress(item.replyTo)}>
                <Text style={[styles.replyToText, { 
                  color: isOwnMessage ? currentTheme.background : currentTheme.secondary 
                }]}>
                  {item.replyToType === 'image' ? 'Imagen' : item.replyToText}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.messageContent}>
              {item.type === 'image' ? (
                <View>
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
                      onError={async (error) => {
                        console.error('Error al cargar imagen:', error.nativeEvent);
                        // Intentar cargar la imagen local si falla la carga remota
                        const localPath = await CacheService.getLocalImage(item.imageUrl, chatId);
                        if (localPath) {
                          runInAction(() => {
                            const messageIndex = viewModel.messages.findIndex(m => m.id === item.id);
                            if (messageIndex !== -1) {
                              viewModel.messages[messageIndex] = {
                                ...viewModel.messages[messageIndex],
                                imageUrl: localPath
                              };
                            }
                          });
                        }
                      }}
                    />
                  </TouchableOpacity>
                  {item.text && (
                    <Text 
                      selectable={true}
                      style={[
                        styles.messageText,
                        { color: isOwnMessage ? currentTheme.background : currentTheme.text }
                      ]}>
                      {item.text}
                    </Text>
                  )}
                  <View style={[styles.messageFooter, { alignSelf: 'flex-end' }]}>
                    <Text style={[
                      styles.messageTime,
                      { color: isOwnMessage ? currentTheme.background : currentTheme.secondary }
                    ]}>
                      {item.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Enviando...'}
                    </Text>
                    {isOwnMessage && (
                      <Icon 
                        name={item.status === 'sending' ? 'time-outline' : 'checkmark-done'} 
                        size={16} 
                        color={isOwnMessage ? currentTheme.background : currentTheme.secondary}
                        style={styles.messageStatus}
                      />
                    )}
                  </View>
                </View>
              ) : (
                <>
                  <Text 
                    selectable={true}
                    style={[
                      styles.messageText,
                      { color: isOwnMessage ? currentTheme.background : currentTheme.text }
                    ]}>
                    {item.text}
                  </Text>
                  <View style={styles.messageFooter}>
                    <Text style={[
                      styles.messageTime,
                      { color: isOwnMessage ? currentTheme.background : currentTheme.secondary }
                    ]}>
                      {item.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Enviando...'}
                    </Text>
                    {isOwnMessage && (
                      <Icon 
                        name={item.status === 'sending' ? 'time-outline' : 'checkmark-done'} 
                        size={16} 
                        color={isOwnMessage ? currentTheme.background : currentTheme.secondary}
                        style={styles.messageStatus}
                      />
                    )}
                  </View>
                </>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Swipeable>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
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

        {viewModel.replyingTo && (
          <View style={[styles.replyingToContainer, { 
            backgroundColor: currentTheme.card,
            borderTopColor: currentTheme.border 
          }]}>
            <View style={[styles.replyingToContent, { 
              borderLeftColor: primaryColor 
            }]}>
              <Text style={[styles.replyingToText, { color: currentTheme.text }]}>
                Respondiendo a: {viewModel.replyingTo.type === 'image' ? 'Imagen' : viewModel.replyingTo.text}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cancelReplyButton}
              onPress={viewModel.cancelReply}>
              <Icon name="close" size={24} color={primaryColor} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputContainer, { 
          backgroundColor: currentTheme.card,
          borderTopColor: currentTheme.border 
        }]}>
          {imageToSend ? (
            <View style={styles.imagePreviewContainer}>
              <Image 
                source={{ uri: imageToSend.uri }} 
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.cancelImageButton}
                onPress={handleCancelImage}>
                <Icon name="close-circle" size={24} color={primaryColor} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.attachButton}
              onPress={toggleImageMenu}>
              <Icon name="attach" size={24} color={primaryColor} />
            </TouchableOpacity>
          )}
          <TextInput
            style={[styles.input, { 
              backgroundColor: currentTheme.background,
              color: currentTheme.text
            }]}
            value={imageToSend ? imageText : viewModel.newMessage}
            onChangeText={imageToSend ? setImageText : viewModel.setNewMessage}
            placeholder={imageToSend ? "Añade un mensaje..." : "Escribe un mensaje..."}
            placeholderTextColor={currentTheme.secondary}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: (imageToSend ? (imageText.trim() || true) : viewModel.newMessage.trim()) ? secondaryColor : currentTheme.border }
            ]}
            onPress={imageToSend ? handleSendImage : () => viewModel.sendMessage()}
            disabled={!imageToSend && !viewModel.newMessage.trim()}>
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
    </GestureHandlerRootView>
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
    marginBottom: 4,
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
    marginBottom: 4,
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
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageStatus: {
    marginLeft: 4,
  },
  imageMessageText: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  imageMessageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    marginRight: 8,
  },
  imagePreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  cancelImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  replyContainer: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 4,
    opacity: 0.7,
  },
  replyToText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
  },
  replyingToContent: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginRight: 8,
  },
  replyingToText: {
    fontSize: 14,
  },
  cancelReplyButton: {
    padding: 8,
  },
  replyAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  selectAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
});

export default ChatScreen; 