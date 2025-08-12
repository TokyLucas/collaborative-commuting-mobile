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

import TrajetDetailModal from '../../../components/TrajetDetailModal'; // import modal détail
import TrajetModal from '../../../components/TrajetModal';
import { TrajetConducteur } from '../../../models/TrajetConducteur';
import TrajetConducteurService from '../../../services/TrajetConducteurService';

export default function AccueilScreen() {
    const [trajets, setTrajets] = useState<TrajetConducteur[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

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

    const openDetail = (id: string) => {
        setSelectedId(id);
        setDetailModalVisible(true);
    };

    const closeDetail = () => {
        setSelectedId(null);
        setDetailModalVisible(false);
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
                                <TouchableOpacity
                                    style={styles.iconBtn}
                                    onPress={() => openDetail(item.id!)}
                                >
                                    <Text style={styles.icon}>🔍</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconBtn}>
                                    <Text style={styles.icon}>✏️</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconBtn}>
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

                <TrajetDetailModal
                    visible={detailModalVisible}
                    onClose={closeDetail}
                    trajetId={selectedId}
                    onEdit={(trajet) => { /* gérer modifier ici */ }}
                    onDelete={(trajet) => { /* gérer supprimer ici */ }}
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
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 10,
    },
    iconBtn: {
        backgroundColor: '#e0e0e0',
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    icon: {
        fontSize: 16,
        color: '#000',
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
