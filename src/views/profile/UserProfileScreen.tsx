import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {observer} from 'mobx-react-lite';
import {UserProfileViewModel} from '../../viewmodels/UserProfileViewModel';
import Icon from 'react-native-vector-icons/Ionicons';

type UserProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'UserProfile'>;

const UserProfileScreen = observer(() => {
  const navigation = useNavigation<UserProfileNavigationProp>();
  const route = useRoute();
  const {userId} = route.params as {userId: string};
  const viewModel = React.useMemo(() => new UserProfileViewModel(userId), [userId]);

  if (viewModel.loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (viewModel.error || !viewModel.userData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{viewModel.error || 'Usuario no encontrado'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <View style={styles.profileContainer}>
        {viewModel.userData.photoURL ? (
          <Image source={{uri: viewModel.userData.photoURL}} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {viewModel.userData.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.name}>{viewModel.userData.name}</Text>
        <Text style={styles.phoneNumber}>{viewModel.userData.phoneNumber}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 24,
  },
});

export default UserProfileScreen; 