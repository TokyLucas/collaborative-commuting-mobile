import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
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

  const [showPlacesModal, setShowPlacesModal] = useState(false);
  const [placesInput, setPlacesInput] = useState("");
  const [currentTrajetId, setCurrentTrajetId] = useState<string | null>(null);

  // ——— récupérer la liste des trajets ———
  const fetchTrajets = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) return;

      const response = await TrajetConducteurService.getAllView(token);
      const data = await response.json();

      if (!response.ok) {
        console.error("Erreur fetch:", data?.message || "Erreur inconnue");
        return;
      }

      // filtrage logique : seulement trajets actifs et non désactivés temporairement
      const today = new Date();
      const trajetsFiltres = (Array.isArray(data) ? data : []).filter((t: TrajetVoiture) => {
        const actif = t.actif === 1 || t.actif === null;
        const debut = t.dateDesactivationDebut ? new Date(t.dateDesactivationDebut) : null;
        const fin = t.dateDesactivationFin ? new Date(t.dateDesactivationFin) : null;
        const desactiveTemporaire =
          debut && fin && today >= debut && today <= fin;
        return actif && !desactiveTemporaire;
      });

      setTrajets(trajetsFiltres);
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

  // ——— Changer statut ———
  const changerStatut = async (id: string, nouveauStatut: string, placesDispoJournalier?: number) => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) return;

      const dto: any = { statut: nouveauStatut };
      if (placesDispoJournalier != null) dto.placesDispoJournalier = placesDispoJournalier;

      const response = await TrajetConducteurService.updateTrajet(id, dto, token);
      if (!response.ok) {
        const data = await response.json();
        Alert.alert("Erreur", data?.message || "Impossible de mettre à jour le statut.");
        return;
      }
      fetchTrajets();
    } catch (e) {
      console.error("Erreur MAJ statut:", e);
    }
  };

  // ——— Désactivation ———
  const desactiverTrajet = async (id: string) => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) return;
      const dto = { actif: 0 };
      const response = await TrajetConducteurService.updateTrajet(id, dto, token);
      if (!response.ok) {
        const data = await response.json();
        Alert.alert("Erreur", data?.message || "Impossible de désactiver ce trajet.");
        return;
      }
      fetchTrajets();
    } catch (e) {
      console.error("Erreur désactivation:", e);
    }
  };

  // ——— Démarrage (ouvrir le modal de saisie places du jour) ———
  const openPlacesModal = (trajetId: string) => {
    setCurrentTrajetId(trajetId);
    setPlacesInput("");
    setShowPlacesModal(true);
  };

  const confirmPlaces = async () => {
    if (!currentTrajetId) return;
    const nb = parseInt(placesInput);
    if (isNaN(nb) || nb <= 0) {
      Alert.alert("Erreur", "Nombre invalide.");
      return;
    }
    setShowPlacesModal(false);
    await changerStatut(currentTrajetId, "En route", nb);
    setCurrentTrajetId(null);
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

            const isDisabled =
              item.actif === 0 ||
              (item.dateDesactivationDebut &&
                item.dateDesactivationFin &&
                new Date() >= new Date(item.dateDesactivationDebut) &&
                new Date() <= new Date(item.dateDesactivationFin));

            return (
              <View style={[styles.card, isDisabled && { opacity: 0.5 }]}>
                <Text style={styles.cardTitle}>
                  {item.pointDepart} → {item.pointArrivee}
                </Text>

                <Text>Heure de départ : {heure}</Text>
                <Text>Statut : {item.statut}</Text>
                <Text style={{ marginTop: 6 }}>Véhicule : {vehiculeLabel}</Text>

                <View style={styles.actionRow}>
                  {!isDisabled && item.statut === "Prévu" && (
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => openPlacesModal(item.id)}
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

                  {!isDisabled && item.statut !== "Terminé" && (
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

                  {item.statut === "En route" && !isDisabled && (
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

        {/* Modal pour définir les places disponibles du jour */}
        <Modal visible={showPlacesModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Places disponibles aujourd’hui</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex : 3"
                keyboardType="numeric"
                value={placesInput}
                onChangeText={setPlacesInput}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={confirmPlaces}>
                  <Text style={styles.btnText}>Confirmer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.cancel, { flex: 1 }]}
                  onPress={() => setShowPlacesModal(false)}
                >
                  <Text style={styles.btnText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    elevation: 6,
  },
  modalTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    textAlign: "center",
    marginBottom: 14,
  },
  btn: {
    backgroundColor: "#4A90E2",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
  cancel: { backgroundColor: "#999" },
});
