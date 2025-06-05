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
  const menuAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      viewModel.cleanup();
    };
  }, [viewModel]);

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

  const renderMessage = ({item}: {item: any}) => {
    const isOwnMessage = viewModel.isOwnMessage(item);
    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
          {
            backgroundColor: isOwnMessage ? secondaryColor : currentTheme.card,
          }
        ]}>
        <View style={styles.messageContent}>
          {item.type === 'image' ? (
            <TouchableOpacity onPress={() => setSelectedImage(item.imageUrl)}>
              <Image
                source={{ uri: item.imageUrl }} 
                style={styles.messageImage}
                resizeMode="cover"
                onLoadStart={() => {
                  // Intentar cargar la imagen local primero
                  CacheService.getLocalImage(item.imageUrl, chatId)
                    .then(localPath => {
                      if (localPath) {
                        // Si existe localmente, actualizar la fuente
                        item.imageUrl = localPath;
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
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={primaryColor} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
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
});

export default ChatScreen; 