import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
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
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert("Erreur", "Token non disponible.");
                return;
            }

            const dto = {
                ...form,
                heureDepartEstimee: form.heureDepartEstimee.toISOString(),
                placesDisponibles: parseInt(form.placesDisponibles, 10),
            };

            const response = await TrajetConducteurService.createTrajet(dto, token);
            const result = await response.json();

            if (!response.ok) {
                Alert.alert("Erreur", result.message || "Erreur lors de l'envoi.");
                return;
            }

            const newTrajet: TrajetConducteur = {
                id: result.id || '', // récupéré depuis la réponse backend
                idConducteur: result.idConducteur || '', // idem
                ...dto,
                latDepart: parseFloat(dto.latDepart),
                lngDepart: parseFloat(dto.lngDepart),
                latArrivee: parseFloat(dto.latArrivee),
                lngArrivee: parseFloat(dto.lngArrivee),
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
                    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                        <Text style={styles.modalTitle}>Nouveau trajet</Text>

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
                            <TouchableOpacity onPress={handleAdd} style={styles.btn}>
                                <Text style={styles.btnText}>Ajouter</Text>
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
