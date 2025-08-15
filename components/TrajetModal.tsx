import DateTimePicker from '@react-native-community/datetimepicker';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { MapPressEvent, Marker } from 'react-native-maps';
import styles from '../assets/styles';
import { TrajetConducteur } from '../models/TrajetConducteur';
import TrajetConducteurService from '../services/TrajetConducteurService';

type Props = {
    modalVisible: boolean;
    setModalVisible: (visible: boolean) => void;
    onTrajetAdded: (trajet: TrajetConducteur) => void;
};

const INITIAL_REGION = {
    latitude: -18.8792,
    longitude: 47.5079,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

export default function TrajetModal({ modalVisible, setModalVisible, onTrajetAdded }: Props) {
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [form, setForm] = useState({
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

    const handleMapPress = (type: 'depart' | 'arrivee', e: MapPressEvent) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        if (type === 'depart') {
            setForm({ ...form, latDepart: latitude.toString(), lngDepart: longitude.toString() });
        } else {
            setForm({ ...form, latArrivee: latitude.toString(), lngArrivee: longitude.toString() });
        }
    };

    const handleAdd = async () => {
        try {
            const token = await SecureStore.getItemAsync('userToken');            
            const idConducteur = await SecureStore.getItemAsync('userId');
            if (!token) {
                Alert.alert("Erreur", "Vous n'etes pas connecté");
                return;
            }

            const dto = {
                ...form,
                heureDepartEstimee: form.heureDepartEstimee.toISOString(),
                placesDisponibles: parseInt(form.placesDisponibles, 10),
                actif: 1
            };

            const response = await TrajetConducteurService.createTrajet(dto, token);
            const result = await response.json();

            if (!response.ok) {
                Alert.alert("Erreur", result.message || "Erreur lors de l'envoi.");
                return;
            }

            const newTrajet: TrajetConducteur = {
                id: result.id || '', // récupéré depuis la réponse backend
                idConducteur: idConducteur || '', // idem
                ...dto,
                latDepart: parseFloat(dto.latDepart),
                lngDepart: parseFloat(dto.lngDepart),
                latArrivee: parseFloat(dto.latArrivee),
                lngArrivee: parseFloat(dto.lngArrivee),
                actif: 1
            };

            onTrajetAdded(newTrajet);
            setModalVisible(false);
            resetForm();
            Alert.alert("Succès", "Trajet ajouté !");
        } catch (err) {
            console.error("Erreur:", err);
            Alert.alert("Erreur", "Une erreur est survenue.");
        }
    };

    const resetForm = () => {
        setForm({
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
    };

    return (
        <Modal visible={modalVisible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <TouchableOpacity
                        onPress={() => setModalVisible(false)}
                        style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>

                    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
    <Text style={styles.modalTitle}>Nouveau trajet</Text>

    <Text style={styles.label}>Point de départ</Text>
    <TextInput
        style={styles.input}
        placeholder="Ex : Antaninarenina"
        value={form.pointDepart}
        onChangeText={txt => setForm({ ...form, pointDepart: txt })}
    />

    <MapView style={styles.map} initialRegion={INITIAL_REGION} onPress={e => handleMapPress('depart', e)}>
        {form.latDepart && form.lngDepart && (
            <Marker coordinate={{ latitude: parseFloat(form.latDepart), longitude: parseFloat(form.lngDepart) }} />
        )}
    </MapView>

    <Text style={styles.label}>Point d’arrivée</Text>
    <TextInput
        style={styles.input}
        placeholder="Ex : Ivandry"
        value={form.pointArrivee}
        onChangeText={txt => setForm({ ...form, pointArrivee: txt })}
    />

    <MapView style={styles.map} initialRegion={INITIAL_REGION} onPress={e => handleMapPress('arrivee', e)}>
        {form.latArrivee && form.lngArrivee && (
            <Marker coordinate={{ latitude: parseFloat(form.latArrivee), longitude: parseFloat(form.lngArrivee) }} />
        )}
    </MapView>

    <Text style={styles.label}>Heure de départ estimée</Text>
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

    <Text style={styles.label}>Places disponibles</Text>
    <TextInput
        style={styles.input}
        placeholder="Ex : 3"
        keyboardType="numeric"
        value={form.placesDisponibles}
        onChangeText={txt => setForm({ ...form, placesDisponibles: txt })}
    />

    <Text style={styles.label}>Description</Text>
    <TextInput
        style={styles.input}
        placeholder="Ex : Trajet direct sans arrêt"
        value={form.description}
        onChangeText={txt => setForm({ ...form, description: txt })}
    />

    <Text style={styles.label}>Lancer le trajet maintenant ?</Text>
<Switch
  value={form.statut === 'En route'}
  onValueChange={(value) =>
    setForm({ ...form, statut: value ? 'En route' : 'Prévu' })
  }
/>

    <View style={styles.buttons}>
        <TouchableOpacity onPress={handleAdd} style={styles.btn}>
            <Text style={styles.btnText}>Valider le trajet</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.btn, styles.cancel]}>
            <Text style={styles.btnText}>Annuler</Text>
        </TouchableOpacity>
    </View>
</ScrollView>
                </View>
            </View>
        </Modal>
    );
}
