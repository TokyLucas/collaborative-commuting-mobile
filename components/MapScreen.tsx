import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  fetchNearbyDisponibilites,
  Disponibilite,
} from '../services/disponibiliteService';

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [markers, setMarkers] = useState<Disponibilite[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

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

      const nearby = await fetchNearbyDisponibilites(
        loc.coords.latitude,
        loc.coords.longitude
      );
      setMarkers(nearby);
      setLoading(false);
      setInitializing(false);
    })();
  }, []);

  // Fetch sur drag manuel uniquement
  const onDragDone = async (newRegion: Region) => {
    setRegion(newRegion);
    setLoading(true);
    const nearby = await fetchNearbyDisponibilites(
      newRegion.latitude,
      newRegion.longitude
    );
    setMarkers(nearby);
    setLoading(false);
  };

  if (loading || !region) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      region={region}
      showsUserLocation
      onRegionDragComplete={onDragDone}
    >
      {markers.map(m => {
        const [lng, lat] = m.position.coordinates;
        return (
          <Marker
            key={m.id}
            coordinate={{ latitude: lat, longitude: lng }}
            pinColor={m.statut === 'AVAILABLE' ? 'green' : 'red'}
            title={`ID: ${m.conducteurId}`}
            description={m.statut}
          />
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});