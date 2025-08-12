import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import TrajetModal from '../../../components/TrajetModal';
import { TrajetConducteur } from '../../../models/TrajetConducteur';
import TrajetConducteurService from '../../../services/TrajetConducteurService';

export default function AccueilScreen() {
    const [trajets, setTrajets] = useState<TrajetConducteur[]>([]);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        fetchTrajets();
    }, []);

    const fetchTrajets = async () => {
    try {
        const token = await SecureStore.getItemAsync('userToken');
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
                <View style={styles.header}>
                    <Text style={styles.title}>Liste des trajets</Text>
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <Text style={styles.addIcon}>➕</Text>
                    </TouchableOpacity>
                    </View>


                <FlatList
                    data={trajets}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>{item.pointDepart} → {item.pointArrivee}</Text>
                            <Text>Heure : {new Date(item.heureDepartEstimee).toLocaleTimeString()}</Text>
                            <Text>Statut : {item.statut}</Text>

                            <View style={styles.actionRow}>
                                <TouchableOpacity onPress={() => console.log('Détails', item)}>
                                    <Text style={styles.icon}>🔍</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => console.log('Modifier', item)}>
                                    <Text style={styles.icon}>✏️</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => console.log('Supprimer', item)}>
                                    <Text style={styles.icon}>🗑️</Text>
                                </TouchableOpacity>
                            </View>

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
    header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
},
addIcon: {
    fontSize: 24,
    color: '#4A90E2',
},

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
    actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    },
    icon: {
        fontSize: 20,
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
