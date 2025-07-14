import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NearbyGroupsViewModel } from '../../viewmodels/NearbyGroupsViewModel';
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Slider from '@react-native-community/slider';

type NearbyGroupsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NearbyGroups'>;

const NearbyGroupsScreen = observer(() => {
  const navigation = useNavigation<NearbyGroupsNavigationProp>();
  const [viewModel] = React.useState(() => new NearbyGroupsViewModel());
  const { isDark, primaryColor } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  const [maxDistance, setMaxDistance] = useState(10);
  const [tempDistance, setTempDistance] = useState(10);
  const [search, setSearch] = useState('');

  useEffect(() => {
    viewModel.loadNearbyGroups(maxDistance);
  }, []);

  const handleJoinGroup = async (groupId: string) => {
    const success = await viewModel.joinGroup(groupId);
    if (success) {
      navigation.navigate('GroupChat', { groupId });
    }
  };

  const handleAcceptDistance = () => {
    setMaxDistance(tempDistance);
    viewModel.loadNearbyGroups(tempDistance);
    setShowDistanceModal(false);
  };

  // Filtrar grupos por búsqueda
  const filteredGroups = viewModel.groups.filter(group => {
    const text = (group.name + ' ' + (group.description || '')).toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const renderGroupItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.groupItem, { backgroundColor: currentTheme.card }]}
      onPress={() => {
        if (viewModel.isUserInGroup(item.id)) {
          navigation.navigate('GroupChat', { groupId: item.id });
        }
      }}
    >
      <View style={styles.groupInfo}>
        <Text style={[styles.groupName, { color: currentTheme.text }]}>{item.name}</Text>
        {item.description && (
          <Text style={[styles.groupDescription, { color: currentTheme.secondary }]}>
            {item.description}
          </Text>
        )}
        <Text style={[styles.distance, { color: currentTheme.secondary }]}>
          {item.distance.toFixed(1)} km
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.joinButton,
          { backgroundColor: primaryColor },
          viewModel.isUserInGroup(item.id) && styles.joinedButton
        ]}
        onPress={() => handleJoinGroup(item.id)}
        disabled={viewModel.isUserInGroup(item.id)}
      >
        <Text style={[styles.joinButtonText, { color: currentTheme.background }]}>
          {viewModel.isUserInGroup(item.id) ? 'Unido' : 'Unirse'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderDistanceModal = () => (
    <Modal
      visible={showDistanceModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDistanceModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowDistanceModal(false)}
      >
        <View style={[styles.modalContent, { backgroundColor: currentTheme.card }]}>
          <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
            Distancia máxima
          </Text>
          <Text style={[styles.distanceValue, { color: primaryColor }]}>
            {tempDistance} km
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={30}
            step={1}
            value={tempDistance}
            onValueChange={setTempDistance}
            minimumTrackTintColor={primaryColor}
            maximumTrackTintColor={currentTheme.border}
            thumbTintColor={primaryColor}
          />
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: primaryColor }]}
            onPress={handleAcceptDistance}
          >
            <Text style={[styles.closeButtonText, { color: currentTheme.background }]}>
              Aceptar
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (viewModel.loading) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (viewModel.error) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <Text style={[styles.errorText, { color: currentTheme.error }]}>
          {viewModel.error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: primaryColor }]}
          onPress={() => viewModel.loadNearbyGroups(maxDistance)}
        >
          <Text style={[styles.retryButtonText, { color: currentTheme.background }]}>
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.header, { backgroundColor: currentTheme.card }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={primaryColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>Grupos Cercanos</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowDistanceModal(true)}>
          <Icon name="filter-list" size={24} color={primaryColor} />
        </TouchableOpacity>
      </View>
      {/* Buscador */}
      <View style={{paddingHorizontal: 16, paddingBottom: 0, paddingTop: 15}}>
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: currentTheme.card, color: currentTheme.text, borderColor: currentTheme.border }
          ]}
          placeholder="Buscar grupo..."
          placeholderTextColor={currentTheme.secondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredGroups}
        renderItem={renderGroupItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={viewModel.loading}
            onRefresh={() => viewModel.loadNearbyGroups(maxDistance)}
            colors={[primaryColor]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: currentTheme.secondary }]}>
              No hay grupos cercanos
            </Text>
          </View>
        }
      />

      {renderDistanceModal()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  groupInfo: {
    flex: 1,
    marginRight: 16,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  distance: {
    fontSize: 12,
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinedButton: {
    opacity: 0.7,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  distanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 24,
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 4,
  },
});

export default NearbyGroupsScreen; 