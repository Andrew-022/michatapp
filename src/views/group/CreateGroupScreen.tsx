import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { getAuth } from '@react-native-firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp 
} from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { globalStyles } from '../../styles/globalStyles';
import { CreateGroupViewModel } from '../../viewmodels/CreateGroupViewModel';
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';
import MapView, { Marker, Circle } from 'react-native-maps';

const CreateGroupScreen = observer(() => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const viewModel = React.useMemo(() => new CreateGroupViewModel(), []);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const mapRef = React.useRef<MapView>(null);

  const handleSelectLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const location = await viewModel.getCurrentLocation();
      if (location) {
        viewModel.setLocation(location);
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.animateToRegion(viewModel.mapRegion, 1000);
          }
        }, 100);
      }
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Error al obtener la ubicación');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleNext = () => {
    const validation = viewModel.validateStep1();
    if (!validation.isValid) {
      Alert.alert('Error', validation.error);
      return;
    }
    navigation.navigate('SelectParticipants', { viewModel });
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.header, { 
        backgroundColor: currentTheme.card,
        borderBottomColor: currentTheme.border 
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={currentTheme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>Crear Grupo</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <TextInput
            style={[styles.input, { 
              backgroundColor: currentTheme.card,
              color: currentTheme.text,
              borderColor: currentTheme.border
            }]}
            value={viewModel.groupName}
            onChangeText={viewModel.setGroupName.bind(viewModel)}
            placeholder="Nombre del grupo"
            placeholderTextColor={currentTheme.secondary}
          />

          <View style={[styles.switchContainer, { borderColor: currentTheme.border }]}>
            <Text style={[styles.switchLabel, { color: currentTheme.text }]}>
              Grupo público
            </Text>
            <TouchableOpacity
              style={[styles.switch, viewModel.isPublic && styles.switchActive]}
              onPress={() => viewModel.setPublic(!viewModel.isPublic)}
            >
              <Text style={[styles.switchText, { color: currentTheme.text }]}>
                {viewModel.isPublic ? 'Sí' : 'No'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.locationButton, 
              { backgroundColor: currentTheme.primary },
              locationLoading && styles.locationButtonDisabled
            ]}
            onPress={handleSelectLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator color={currentTheme.background} />
            ) : (
              <Text style={[styles.locationButtonText, { color: currentTheme.background }]}>
                {viewModel.location ? 'Cambiar ubicación' : 'Seleccionar ubicación actual'}
              </Text>
            )}
          </TouchableOpacity>

          {locationError && (
            <Text style={[styles.errorText, { color: currentTheme.error }]}>
              {locationError}
            </Text>
          )}

          <View style={[styles.mapContainer, { borderColor: currentTheme.border }]}>
            <MapView
              ref={mapRef}
              style={styles.map}
              region={viewModel.mapRegion}
              provider="google"
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
              loadingEnabled={true}
              loadingIndicatorColor={currentTheme.primary}
              loadingBackgroundColor={currentTheme.background}
              onMapReady={() => {
                if (viewModel.location) {
                  mapRef.current?.animateToRegion(viewModel.mapRegion, 1000);
                }
              }}
            >
              {viewModel.location && (
                <Circle
                  key={`circle-${viewModel.location.latitude}-${viewModel.location.longitude}`}
                  center={{
                    latitude: viewModel.location.latitude,
                    longitude: viewModel.location.longitude,
                  }}
                  radius={100}
                  strokeColor={currentTheme.primary}
                  fillColor={`${currentTheme.primary}33`}
                  strokeWidth={2}
                />
              )}
            </MapView>
          </View>

          {viewModel.location && (
            <Text style={[styles.locationText, { color: currentTheme.secondary }]}>
              {viewModel.location.address || `Lat: ${viewModel.location.latitude.toFixed(6)}, Long: ${viewModel.location.longitude.toFixed(6)}`}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: currentTheme.primary },
              (!viewModel.groupName.trim() || !viewModel.location) && 
                { backgroundColor: currentTheme.border }
            ]}
            onPress={handleNext}
            disabled={!viewModel.groupName.trim() || !viewModel.location}>
            <Text style={[styles.nextButtonText, { color: currentTheme.background }]}>
              Siguiente
            </Text>
            <Icon name="arrow-forward" size={24} color={currentTheme.background} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  input: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  searchInput: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  contactList: {
    flexGrow: 0,
    maxHeight: 300,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  contactPhone: {
    fontSize: 13,
  },
  selectedMark: {
    fontWeight: 'bold',
    fontSize: 20,
    marginLeft: 8,
  },
  createButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  switch: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ddd',
  },
  switchActive: {
    backgroundColor: '#007AFF',
  },
  switchText: {
    color: '#fff',
    fontWeight: '600',
  },
  locationButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  mapContainer: {
    height: 300,
    marginVertical: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  participantsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  participantsButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default CreateGroupScreen;
