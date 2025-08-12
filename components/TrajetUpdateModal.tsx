import DateTimePicker from '@react-native-community/datetimepicker';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { MapPressEvent, Marker } from 'react-native-maps';
import styles from '../assets/styles';
import TrajetConducteurService from '../services/TrajetConducteurService';

type Props = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  trajetId: string | null;
  onTrajetUpdated: () => void;
};

const INITIAL_REGION = {
  latitude: -18.8792,
  longitude: 47.5079,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function TrajetUpdateModal({ visible, setVisible, trajetId, onTrajetUpdated }: Props) {
  const [form, setForm] = useState({
    id: '',
    pointDepart: '',
    latDepart: '',
    lngDepart: '',
    pointArrivee: '',
    latArrivee: '',
    lngArrivee: '',
    heureDepartEstimee: new Date(),
    placesDisponibles: '',
    description: '',
    statut: '',
  });

  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible && trajetId) {
      loadTrajet();
    }
  }, [visible, trajetId]);

  const loadTrajet = async () => {
    const token = await SecureStore.getItemAsync('userToken');
    if (!token) return;

    const res = await TrajetConducteurService.getById(trajetId!, token);
    const data = await res.json();

    if (res.ok) {
      setForm({
        ...data,
        heureDepartEstimee: new Date(data.heureDepartEstimee),
        placesDisponibles: data.placesDisponibles.toString(),
      });
    } else {
      Alert.alert('Erreur', data.message || 'Erreur lors du chargement');
    }
  };

  const handleUpdate = async () => {
    const token = await SecureStore.getItemAsync('userToken');
    if (!token) return;

    const dto = {
      ...form,
      heureDepartEstimee: form.heureDepartEstimee.toISOString(),
      placesDisponibles: parseInt(form.placesDisponibles, 10),
    };

    const response = await TrajetConducteurService.updateTrajet(form.id, dto, token);
    const result = await response.json();

    if (response.ok) {
      Alert.alert('Succès', 'Trajet mis à jour.');
      onTrajetUpdated();
      setVisible(false);
    } else {
      Alert.alert('Erreur', result.message || 'Échec de la mise à jour');
    }
  };

  const handleMapPress = (type: 'depart' | 'arrivee', e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    if (type === 'depart') {
      setForm({ ...form, latDepart: latitude.toString(), lngDepart: longitude.toString() });
    } else {
      setForm({ ...form, latArrivee: latitude.toString(), lngArrivee: longitude.toString() });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity
            onPress={() => setVisible(false)}
            style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>✕</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            <Text style={styles.modalTitle}>Modifier trajet</Text>

            <TextInput style={styles.input} placeholder="Point de départ"
              value={form.pointDepart} onChangeText={txt => setForm({ ...form, pointDepart: txt })} />
            <MapView style={styles.map} initialRegion={INITIAL_REGION}
              onPress={e => handleMapPress('depart', e)}>
              {form.latDepart && form.lngDepart && (
                <Marker coordinate={{ latitude: parseFloat(form.latDepart), longitude: parseFloat(form.lngDepart) }} />
              )}
            </MapView>

            <TextInput style={styles.input} placeholder="Point d’arrivée"
              value={form.pointArrivee} onChangeText={txt => setForm({ ...form, pointArrivee: txt })} />
            <MapView style={styles.map} initialRegion={INITIAL_REGION}
              onPress={e => handleMapPress('arrivee', e)}>
              {form.latArrivee && form.lngArrivee && (
                <Marker coordinate={{ latitude: parseFloat(form.latArrivee), longitude: parseFloat(form.lngArrivee) }} />
              )}
            </MapView>

            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.input}>
              <Text>{form.heureDepartEstimee ? form.heureDepartEstimee.toLocaleTimeString() : 'Choisir une heure'}</Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={form.heureDepartEstimee}
                mode="time"
                display="default"
                onChange={(_, date) => {
                  setShowTimePicker(false);
                  if (date) setForm({ ...form, heureDepartEstimee: date });
                }}
              />
            )}

            <TextInput style={styles.input} placeholder="Places disponibles"
              keyboardType="numeric" value={form.placesDisponibles}
              onChangeText={txt => setForm({ ...form, placesDisponibles: txt })} />

            <TextInput style={styles.input} placeholder="Description"
              value={form.description} onChangeText={txt => setForm({ ...form, description: txt })} />

            <TextInput style={styles.input} placeholder="Statut"
              value={form.statut} onChangeText={txt => setForm({ ...form, statut: txt })} />

            <View style={styles.buttons}>
              <TouchableOpacity onPress={handleUpdate} style={styles.btn}>
                <Text style={styles.btnText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVisible(false)} style={[styles.btn, styles.cancel]}>
                <Text style={styles.btnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
