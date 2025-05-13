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
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { GroupChatViewModel } from '../../viewmodels/GroupChatViewModel';
import { globalStyles } from '../../styles/globalStyles';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/Ionicons';

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

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = viewModel.isOwnMessage(item);
    const senderName = viewModel.getParticipantName(item.senderId);

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <View style={styles.messageContentColumn}>
          {!isOwnMessage && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}
          <View style={styles.messageContentRow}>
            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                isOwnMessage ? globalStyles.textWhite : globalStyles.text,
              ]}
            >
              {item.text}
            </Text>
            <Text
              style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
                isOwnMessage ? globalStyles.textWhite : globalStyles.textSecondary,
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{viewModel.groupName}</Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={viewModel.messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.messageList}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={viewModel.newMessage}
          onChangeText={viewModel.setNewMessage}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="rgba(54, 54, 54, 0.7)"
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !viewModel.newMessage.trim() && styles.sendButtonDisabled,
          ]}
          onPress={() => viewModel.sendMessage()}
          disabled={!viewModel.newMessage.trim()}
        >
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
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
    color: '#007AFF',
    marginRight: 6,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    flexShrink: 1,
  },
  ownMessageText: {
    opacity: 1,
  },
  otherMessageText: {
    opacity: 1,
  },
  messageTime: {
    fontSize: 10,
    marginLeft: 4,
  },
  ownMessageTime: {
    opacity: 0.7,
  },
  otherMessageTime: {
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    color: '#000',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#B4B4B4',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GroupChatScreen;
