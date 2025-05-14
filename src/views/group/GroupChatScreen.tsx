import React, { useRef, useEffect } from 'react';
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
  const { isDark, secondaryColor } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    return () => {
      viewModel.cleanup();
    };
  }, [viewModel]);

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = viewModel.isOwnMessage(item);
    const senderName = viewModel.getParticipantName(item.senderId);

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
          {
            backgroundColor: isOwnMessage ? secondaryColor : currentTheme.card,
          }
        ]}
      >
        <View style={styles.messageContentColumn}>
          {!isOwnMessage && (
            <Text style={[styles.senderName, { color: currentTheme.primary }]}>
              {senderName}
            </Text>
          )}
          <View style={styles.messageContentRow}>
            <Text
              style={[
                styles.messageText,
                { color: isOwnMessage ? currentTheme.background : currentTheme.text }
              ]}
            >
              {item.text}
            </Text>
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
    );
  };

  if (viewModel.loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: currentTheme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.header, { 
        backgroundColor: currentTheme.card,
        borderBottomColor: currentTheme.border 
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={currentTheme.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerContent}
          onPress={() => navigation.navigate('GroupDetails', { groupId })}>
          {viewModel.groupPhotoURL ? (
            <Image 
              source={{ uri: viewModel.groupPhotoURL }} 
              style={styles.headerPhoto}
            />
          ) : (
            <View style={[styles.headerPhotoPlaceholder, { backgroundColor: currentTheme.primary }]}>
              <Text style={[styles.headerPhotoText, { color: currentTheme.background }]}>
                {viewModel.groupName?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
            {viewModel.groupName}
          </Text>
        </TouchableOpacity>
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
    flex: 1,
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
});

export default GroupChatScreen;
