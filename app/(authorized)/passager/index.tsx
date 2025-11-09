import DemandeAjoutScreen from "@/components/DemandeAjoutScreen";
import { useAuthSession } from "@/providers/AuthProvider";
import DemandeService from "@/services/DemandeService";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PassagerIndexScreen() {
  const { user, token } = useAuthSession();
  const [demandes, setDemandes] = useState<any[]>([]);
  const [mode, setMode] = useState<"add" | "list">("list");
  const [loading, setLoading] = useState(false);

  const fetchDemandes = async () => {
    if (!user?.current || !token?.current) return;
    try {
      setLoading(true);
      const data = await DemandeService.getByPassagerId(user.current, token.current);
      setDemandes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur fetch demandes:", err);
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    fetchDemandes();
  }, []);

  // === Mode Ajout ===
  if (mode === "add") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <DemandeAjoutScreen
          onCancel={() => setMode("list")}
          onSuccess={() => setMode("list")}
        />
      </SafeAreaView>
    );
  }

  // === Mode Liste ===
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.newBtn} onPress={() => setMode("add")}>
        <Text style={styles.newBtnText}>➕ Nouvelle demande</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Mes demandes récentes</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={demandes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text>{item.pointDepart} → {item.pointArrivee}</Text>
              <Text>Statut : {item.statut}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucune demande pour le moment.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  newBtn: { backgroundColor: "#4A90E2", padding: 12, borderRadius: 8, marginBottom: 20 },
  newBtnText: { color: "#fff", fontWeight: "bold", textAlign: "center", fontSize: 16 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  card: { backgroundColor: "#f2f2f2", padding: 12, borderRadius: 8, marginBottom: 10 },
  empty: { textAlign: "center", color: "#888", fontStyle: "italic", marginTop: 20 },
});
