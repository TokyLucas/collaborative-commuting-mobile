import TrajetConducteurService from '@/services/TrajetConducteurService';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onCancel: () => void;
  onSelectTrajet: (trajetId: string) => void; // callback pour le bouton
};

type Trajet = {
  _id: string;
  pointDepart: string;
  pointArrivee: string;
  heureDepartEstimee: string;
  placesDisponibles: number;
  description: string;
  statut: string;
};

export default function MatchingScreen({ onCancel, onSelectTrajet }: Props) {
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrajets() {
      try {
        const token = await SecureStore.getItemAsync('token');
        if (!token) throw new Error('Utilisateur non connecté');

        const response = await TrajetConducteurService.getAllView(token);
        const data: Trajet[] = await response.json();
        const actifs = data.filter(t => t.statut === 'Actif' && t.placesDisponibles > 0);
        setTrajets(actifs);
      } catch (error) {
        console.error(error);
        Alert.alert('Erreur', 'Impossible de récupérer les trajets.');
      } finally {
        setLoading(false);
      }
    }

    fetchTrajets();
  }, []);

  const renderItem = ({ item }: { item: Trajet }) => (
    <View style={styles.card}>
      <Text style={styles.title}>
        {item.pointDepart} → {item.pointArrivee}
      </Text>
      <Text>Heure départ : {new Date(item.heureDepartEstimee).toLocaleTimeString()}</Text>
      <Text>Places disponibles : {item.placesDisponibles}</Text>
      <Text>Description : {item.description}</Text>

      <TouchableOpacity
        style={styles.sendButton}
        onPress={() => onSelectTrajet(item._id)}
      >
        <Text style={styles.sendButtonText}>Envoyer</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <Text>Chargement...</Text>;

  return (
    <View style={styles.container}>
      {trajets.length === 0 ? (
        <Text style={styles.noMatchText}>Aucun trajet correspondant pour le moment 😔</Text>
      ) : (
        <FlatList
          data={trajets}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <TouchableOpacity
        style={[styles.sendButton, { backgroundColor: '#f44336', marginTop: 10 }]}
        onPress={onCancel}
      >
        <Text style={styles.sendButtonText}>Annuler</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f7f7f7' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  sendButton: {
    marginTop: 12,
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  noMatchText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#555',
    marginTop: 20,
  },
});
