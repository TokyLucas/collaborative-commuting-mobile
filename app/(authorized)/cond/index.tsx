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

import TrajetAjoutScreen from "../../../components/TrajetAjoutScreen";
import TrajetDetailModal from "../../../components/TrajetDetailModal";
import TrajetUpdateScreen from "../../../components/TrajetUpdateScreen";
import { TrajetVoiture } from "../../../models/TrajetVoiture";
import TrajetConducteurService from "../../../services/TrajetConducteurService";

type Mode = "list" | "add" | "update";

export default function AccueilScreen() {
  const [trajets, setTrajets] = useState<TrajetVoiture[]>([]);
  const [mode, setMode] = useState<Mode>("list");
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

      // On n’affiche que les trajets actifs
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

  const openUpdatePage = (id: string) => {
    setSelectedId(id);
    setMode("update");
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
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        console.error("Token manquant");
        return;
      }
      const dto = { statut: nouveauStatut };
      const response = await TrajetConducteurService.updateTrajet(id, dto, token);

      if (!response.ok) {
        const data = await response.json();
        console.error("Erreur MAJ statut:", data?.message || "Erreur inconnue");
        Alert.alert("Erreur", data?.message || "Impossible de mettre à jour le statut.");
        return;
      }
      fetchTrajets();
    } catch (e) {
      console.error("Erreur MAJ statut:", e);
    }
  };

  const desactiverTrajet = async (id: string) => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        console.error("Token manquant");
        return;
      }
      const dto = { actif: 0 };
      const response = await TrajetConducteurService.updateTrajet(id, dto, token);

      if (!response.ok) {
        const data = await response.json();
        console.error("Erreur désactivation:", data?.message || "Erreur inconnue");
        Alert.alert("Erreur", data?.message || "Impossible de désactiver ce trajet.");
        return;
      }
      fetchTrajets();
    } catch (e) {
      console.error("Erreur désactivation:", e);
    }
  };

  // ——— vues "Ajout" et "Update" ———
  if (mode === "add") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <TrajetAjoutScreen
          onCancel={() => setMode("list")}
          onSuccess={() => {
            setMode("list");
            fetchTrajets();
          }}
        />
      </SafeAreaView>
    );
  }

  if (mode === "update") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <TrajetUpdateScreen
          trajetId={selectedId}
          onCancel={() => setMode("list")}
          onSuccess={() => {
            setMode("list");
            fetchTrajets();
          }}
        />
      </SafeAreaView>
    );
  }

  // ——— vue "Liste" ———
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Liste des trajets</Text>
          <TouchableOpacity onPress={() => setMode("add")}>
            <Text style={styles.addIcon}>➕</Text>
          </TouchableOpacity>
        </View>

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

                <View style={styles.actionRow}>
                  {item.statut === "Prévu" && (
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => changerStatut(item.id, "En route")}
                    >
                      <Text style={styles.icon}>🟢</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openDetail(item.id)}
                  >
                    <Text style={styles.icon}>🔍</Text>
                  </TouchableOpacity>

                  {item.statut !== "Terminé" && (
                    <>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => openUpdatePage(item.id)}
                      >
                        <Text style={styles.icon}>📝</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => desactiverTrajet(item.id)}
                      >
                        <Text style={styles.icon}>🗑️</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {item.statut === "En route" && (
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => changerStatut(item.id, "Terminé")}
                    >
                      <Text style={styles.icon}>🔴</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Aucun trajet disponible.</Text>}
        />

        <TrajetDetailModal
          visible={detailModalVisible}
          onClose={closeDetail}
          trajetId={selectedId}
          onDelete={() => {}}
          onTrajetUpdated={fetchTrajets}
          onEdit={(id) => {
            setSelectedId(id);
            setDetailModalVisible(false);
            setMode("update");
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addIcon: { fontSize: 24, color: "#4A90E2" },
  safe: { flex: 1, backgroundColor: "#f3f3f3" },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "600", textAlign: "center", marginBottom: 16 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  iconBtn: {
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  icon: { fontSize: 16, color: "#000" },
  card: { backgroundColor: "#fff", padding: 16, marginVertical: 6, borderRadius: 8 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  empty: { textAlign: "center", color: "#888", fontStyle: "italic", marginTop: 20 },
});
