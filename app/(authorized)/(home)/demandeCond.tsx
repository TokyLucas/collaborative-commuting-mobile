import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { TrajetVoiture } from "../../../models/TrajetVoiture";
import TrajetConducteurService from "../../../services/TrajetConducteurService";

export default function DemandeScreen() {
  const [trajets, setTrajets] = useState<TrajetVoiture[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrajets = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        console.error("Token manquant");
        return;
      }
      const response = await TrajetConducteurService.getAllView(token);
      const data = await response.json();

      if (!response.ok) {
        console.error("Erreur fetch:", data?.message || "Erreur inconnue");
        return;
      }

      setTrajets((Array.isArray(data) ? data : []).filter((t: TrajetVoiture) => t.actif === 1));
    } catch (e) {
      console.error("Erreur API:", e);
    }
  }, []);

  useEffect(() => {
    fetchTrajets();
  }, [fetchTrajets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrajets();
    setRefreshing(false);
  }, [fetchTrajets]);

  const demanderTrajet = async (id: string) => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        console.error("Token manquant");
        return;
      }

      const dto = { demande: true }; // Exemple : à adapter selon ton API
      const response = await TrajetConducteurService.demanderTrajet(id, dto, token);

      if (!response.ok) {
        const data = await response.json();
        console.error("Erreur demande:", data?.message || "Erreur inconnue");
        Alert.alert("Erreur", data?.message || "Impossible de faire la demande.");
        return;
      }

      Alert.alert("Succès", "Votre demande a été envoyée.");
      fetchTrajets();
    } catch (e) {
      console.error("Erreur demande:", e);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Liste des trajets disponibles</Text>

        <FlatList
          data={trajets}
          keyExtractor={(item, index) => item.id || index.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const heure = item.heureDepartEstimee
              ? new Date(item.heureDepartEstimee).toLocaleTimeString()
              : "-";

            const vehiculeLabel = item.car
              ? `${item.car.brand} ${item.car.model} ${item.car.color ? `(${item.car.color})` : ""}`.trim()
              : "—";

            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {item.pointDepart} → {item.pointArrivee}
                </Text>

                <Text>Heure de départ : {heure}</Text>
                <Text>Statut : {item.statut}</Text>
                <Text style={{ marginTop: 6 }}>Véhicule : {vehiculeLabel}</Text>

                <TouchableOpacity
                  style={styles.demanderBtn}
                  onPress={() => demanderTrajet(item.id)}
                >
                  <Text style={styles.demanderText}>Demander</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Aucun trajet disponible.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f3f3f3" },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "600", textAlign: "center", marginBottom: 16 },
  card: { backgroundColor: "#fff", padding: 16, marginVertical: 6, borderRadius: 8 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  demanderBtn: {
    marginTop: 12,
    backgroundColor: "#4A90E2",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  demanderText: { color: "#fff", fontWeight: "600" },
  empty: { textAlign: "center", color: "#888", fontStyle: "italic", marginTop: 20 },
});
