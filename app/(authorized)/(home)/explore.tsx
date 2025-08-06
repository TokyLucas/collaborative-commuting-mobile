import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
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
  const [markers, setMarkers] = useState<
    Array<{ id: string; latitude: number; longitude: number; title: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // 1. Centrage initial
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
      mapRef.current?.animateToRegion(initRegion, 1000);
      setLoading(false);
      setInitializing(false);
    })();
  }, []);

  // 2. Chargement des marqueurs uniquement quand ce n'est pas le centrage initial
  useEffect(() => {
    if (initializing) return;
    if (!token?.current) return;

    setLoading(true);
    UserService.getNearbyUsers(region, token.current)
      .then(res => res.text())
      .then(txt => (txt ? JSON.parse(txt) : []))
      .catch(() => [])
      .then(data => setMarkers(data))
      .finally(() => setLoading(false));
  }, [region, token, initializing]);

  // 3. Ne plus binder onRegionChangeComplete directement
  //    On utilise onRegionDragComplete (après que l'utilisateur ait fini de bouger la carte)
  return (
    <ThemedView style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionDragComplete={setRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {markers.map(m => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
          />
        ))}
      </MapView>

      {loading && (
        <ActivityIndicator
          style={styles.loaderOverlay}
          size="large"
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 } as StyleProp<ViewStyle>,
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});