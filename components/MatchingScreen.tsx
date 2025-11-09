import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

export default function MatchingScreen({ route }) {
  const { demandeId } = route.params;
  const [loading, setLoading] = useState(true);
  const [trajets, setTrajets] = useState([]);

  useEffect(() => {
    const fetchMatching = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        const res = await fetch(`https://ton-api.com/demande/match/${demandeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setTrajets(data);
      } catch (err) {
        console.error("Erreur fetch matching:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatching();
  }, [demandeId]);

  if (loading) return <ActivityIndicator size="large" color="#000" />;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}>
        Trajets correspondants
      </Text>
      {trajets.length === 0 ? (
        <Text>Aucun trajet trouvé pour cette demande 😕</Text>
      ) : (
        <FlatList
          data={trajets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 12, padding: 12, borderWidth: 1, borderRadius: 8 }}>
              <Text>Départ : {item.pointDepart}</Text>
              <Text>Arrivée : {item.pointArrivee}</Text>
              <Text>Heure : {item.dateDepart}</Text>
              <Text>Conducteur : {item.conducteur?.nom || "Inconnu"}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
