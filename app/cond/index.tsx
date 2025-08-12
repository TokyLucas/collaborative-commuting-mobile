import React, { useEffect, useState } from 'react';
import {
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import TrajetModal from '../../components/TrajetModal';
import { TrajetConducteur } from '../../models/TrajetConducteur';
import TrajetConducteurService from '../../services/TrajetConducteurService';

export default function AccueilScreen() {
    const [trajets, setTrajets] = useState<TrajetConducteur[]>([]);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        fetchTrajets();
    }, []);

    const fetchTrajets = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error("Token manquant");
                return;
            }

            const response = await TrajetConducteurService.getAll(token);
            const data = await response.json();

            if (!response.ok) {
                console.error("Erreur lors du fetch:", data.message || "Erreur inconnue");
                return;
            }

            setTrajets(data);
        } catch (error) {
            console.error("Erreur API:", error);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.title}>Liste des trajets</Text>

                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.btn}>
                    <Text style={styles.btnText}>➕ Ajouter un trajet</Text>
                </TouchableOpacity>

                <FlatList
                    data={trajets}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>{item.pointDepart} → {item.pointArrivee}</Text>
                            <Text>Heure : {new Date(item.heureDepartEstimee).toLocaleTimeString()}</Text>
                            <Text>Places : {item.placesDisponibles}</Text>
                            <Text>Description : {item.description}</Text>
                            <Text>Statut : {item.statut}</Text>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>Aucun trajet disponible.</Text>}
                />

                <TrajetModal
                    modalVisible={modalVisible}
                    setModalVisible={setModalVisible}
                    onTrajetAdded={fetchTrajets} // recharge la liste après ajout
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f3f3f3',
    },
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 16,
    },
    btn: {
        backgroundColor: '#4A90E2',
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
        alignItems: 'center',
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        marginVertical: 6,
        borderRadius: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    empty: {
        textAlign: 'center',
        color: '#888',
        fontStyle: 'italic',
        marginTop: 20,
    },
});
