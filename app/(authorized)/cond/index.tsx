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

import TrajetDetailModal from '../../../components/TrajetDetailModal';
import TrajetModal from '../../../components/TrajetModal';
import TrajetUpdateModal from '../../../components/TrajetUpdateModal';
import { TrajetConducteur } from '../../../models/TrajetConducteur';
import TrajetConducteurService from '../../../services/TrajetConducteurService';
export default function AccueilScreen() {
    const [trajets, setTrajets] = useState<TrajetConducteur[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [updateModalVisible, setUpdateModalVisible] = useState(false);
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

            setTrajets(data.filter((trajet: TrajetConducteur) => trajet.actif === 1));

        } catch (error) {
            console.error("Erreur API:", error);
        }
    };
    const openUpdateModal = (id: string) => {
        setSelectedId(id);
        setUpdateModalVisible(true);
    };
    const openDetail = (id: string) => {
        setSelectedId(id);
        setDetailModalVisible(true);
    };

    const closeDetail = () => {
        setSelectedId(null);
        setDetailModalVisible(false);
    };
const changerStatut = async (id: string, nouveauStatut: string) => {
    try {
        const token = await SecureStore.getItemAsync('userToken');
        if (!token) {
            console.error("Token manquant");
            return;
        }

        const dto = { statut: nouveauStatut };
        const response = await TrajetConducteurService.updateTrajet(id, dto, token);
        if (!response.ok) {
            const data = await response.json();
            console.error("Erreur lors de la mise à jour du statut:", data.message || "Erreur inconnue");
            return;
        }

        fetchTrajets(); // Recharger la liste
    } catch (error) {
        console.error("Erreur lors de la mise à jour du statut:", error);
    }
};
const desactiverTrajet = async (id: string) => {
    try {
        const token = await SecureStore.getItemAsync('userToken');
        if (!token) {
            console.error("Token manquant");
            return;
        }

        const dto = { actif: 0 }; 
        const response = await TrajetConducteurService.updateTrajet(id, dto, token);
        if (!response.ok) {
            const data = await response.json();
            console.error("Erreur lors de la désactivation:", data.message || "Erreur inconnue");
            return;
        }

        fetchTrajets(); // Recharger la liste
    } catch (error) {
        console.error("Erreur lors de la désactivation du trajet:", error);
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
                            <Text>Heure de départ : {new Date(item.heureDepartEstimee).toLocaleTimeString()}</Text>
                            <Text>Statut : {item.statut}</Text>

                            <View style={styles.actionRow}>
    {item.statut === 'Prévu' && (
        <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => changerStatut(item.id!, 'En route')}
        >
            <Text style={styles.icon}>🟢</Text>
        </TouchableOpacity>
    )}

    <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => openDetail(item.id!)}
    >
        <Text style={styles.icon}>🔍</Text>
    </TouchableOpacity>

    {item.statut !== 'terminé' && (
    <>
        <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => openUpdateModal(item.id!)}>
            <Text style={styles.icon}>📝</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => desactiverTrajet(item.id!)}>
            <Text style={styles.icon}>🗑️</Text>
        </TouchableOpacity>
    </>
)}



    {item.statut === 'En route' && (
        <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => changerStatut(item.id!, 'terminé')}
        >
            <Text style={styles.icon}>🔴</Text>
        </TouchableOpacity>
    )}
</View>

                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>Aucun trajet disponible.</Text>}
                />

                <TrajetModal
                    modalVisible={modalVisible}
                    setModalVisible={setModalVisible}
                    onTrajetAdded={fetchTrajets} 
                />
                <TrajetUpdateModal
                    visible={updateModalVisible}
                    setVisible={setUpdateModalVisible}
                    trajetId={selectedId}
                    onTrajetUpdated={fetchTrajets}  
                /><TrajetDetailModal
                    visible={detailModalVisible}
                    onClose={closeDetail}
                    trajetId={selectedId}
                    onDelete={(trajet) => { /* gérer supprimer ici */ }}
                    onTrajetUpdated={fetchTrajets} // ✅ utile pour recharger après édition
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
