import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useAuthSession } from '@/providers/AuthProvider';
import UserService from '@/services/UserService';

export default function ExploreScreen() {
  const { token } = useAuthSession();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>({
    latitude: -18.91368,
    longitude: 47.53613,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [markers, setMarkers] = useState<
    Array<{ id: string; latitude: number; longitude: number; title: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // 1. Centrage initial + mémorisation de userLocation
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission localisation refusée');
        setLoading(false);
        setInitializing(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const initRegion: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setRegion(initRegion);
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      mapRef.current?.animateToRegion(initRegion, 800);

      setLoading(false);
      setInitializing(false);
    })();
  }, []);

  // 2. Chargement des marqueurs après le centrage initial
  useEffect(() => {
    if (initializing || !token?.current) return;
    setLoading(true);

    UserService.getNearbyUsers(region, token.current)
      .then(res => res.text())
      .then(txt => (txt ? JSON.parse(txt) : []))
      .catch(() => [])
      .then(data => setMarkers(data))
      .finally(() => setLoading(false));
  }, [region, token, initializing]);

  // 3. Recentrage manuel depuis le bouton
  const recenter = () => {
    if (!userLocation) return;
    const r: Region = {
      ...region,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    };
    setRegion(r);
    mapRef.current?.animateToRegion(r, 500);
  };

  return (
    <ThemedView style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionDragComplete={setRegion}
        showsUserLocation={false}
      >
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Vous"
            pinColor="blue"
          />
        )}

        {markers.map(m => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
          />
        ))}
      </MapView>

      {/* Bouton de recentrage */}
      <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
        <Ionicons name="locate-outline" size={28} color="#fff" />
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator
          style={styles.loaderOverlay}
          size="large"
        />
      )}
    </ThemedView>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 } as StyleProp<ViewStyle>,

  recenterBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },

  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});