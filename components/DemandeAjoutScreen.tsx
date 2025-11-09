import { useAuthSession } from "@/providers/AuthProvider";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Demande } from "../models/Demande";
import DemandeService from "../services/DemandeService";

type Props = {
  onCancel: () => void;
  onSuccess: (demandeId?: string) => void;
};

export default function DemandeAjoutScreen({ onCancel, onSuccess }: Props) {
  const { user, token } = useAuthSession();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const pinRed = require("../assets/images/pin-red.png");

  const [form, setForm] = useState({
    pointDepart: "",
    departLatitude: "",
    departLongitude: "",
    pointArrivee: "",
    arriveeLatitude: "",
    arriveeLongitude: "",
    nbPlaces: "",
    tarif: "",
    heureArriveeEstimee: new Date(),
  });

  // ✅ Récupération ID étudiant simplifiée
  const getEtudiantId = (): string | null => {
    return user?.current ?? null;
  };

  const handleAdd = async () => {
    console.log("handleAdd appelé");
    try {
      const etudiantId = getEtudiantId();
      if (!token?.current) return Alert.alert("Erreur", "Vous n'êtes pas connecté");
      if (!etudiantId) return Alert.alert("Erreur", "Identifiant étudiant introuvable.");

      const departLatitude = Number(form.departLatitude);
      const departLongitude = Number(form.departLongitude);
      const arriveeLatitude = Number(form.arriveeLatitude);
      const arriveeLongitude = Number(form.arriveeLongitude);
      const nbPlaces = Number.parseInt(form.nbPlaces || "0", 10);
      const tarif = Number.parseFloat(form.tarif || "0");

      if (
        [departLatitude, departLongitude, arriveeLatitude, arriveeLongitude].some(
          Number.isNaN
        )
      ) {
        Alert.alert(
          "Coordonnées manquantes",
          "Choisis départ et arrivée via les cartes."
        );
        return;
      }

      const dto: Omit<
        Demande,
        "id" | "statut" | "dateCreation" | "dateMiseAJour"
      > = {
        etudiantId,
        pointDepart: form.pointDepart.trim(),
        departLatitude,
        departLongitude,
        pointArrivee: form.pointArrivee.trim(),
        arriveeLatitude,
        arriveeLongitude,
        nbPlaces,
        tarif,
        heureArriveeEstimee: form.heureArriveeEstimee.toISOString(),
      };

      console.log("Données envoyées:", dto);
      const response = await DemandeService.createDemande(dto, token.current);
      const result = await response.json();

      if (!response.ok) {
        Alert.alert("Erreur", result?.message || "Erreur lors de l'envoi.");
        return;
      }

      const demandeId = result?.id || result?._id;
      if (demandeId) {
        onSuccess(demandeId);
      } else {
        Alert.alert("Succès", "Demande créée !");
        onSuccess();
      }
    } catch (err) {
      console.error("Erreur:", err);
      Alert.alert("Erreur", "Une erreur est survenue.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View
        style={{
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>Nouvelle demande</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={{ fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Point de départ */}
        <Text style={styles.label}>Point de départ</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Antaninarenina"
          value={form.pointDepart}
          onChangeText={(txt) => setForm({ ...form, pointDepart: txt })}
        />

        {/* Point d’arrivée */}
        <Text style={styles.label}>Point d’arrivée</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Ivandry"
          value={form.pointArrivee}
          onChangeText={(txt) => setForm({ ...form, pointArrivee: txt })}
        />

        {/* Heure d'arrivée estimée */}
        <Text style={styles.label}>Heure d'arrivée estimée</Text>
        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.input}>
          <Text>
            {form.heureArriveeEstimee.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={form.heureArriveeEstimee}
            mode="time"
            display="default"
            onChange={(_, date) => {
              setShowTimePicker(false);
              if (date) setForm({ ...form, heureArriveeEstimee: date });
            }}
          />
        )}

        {/* Nombre de places */}
        <Text style={styles.label}>Nombre de places</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : 1"
          keyboardType="numeric"
          value={form.nbPlaces}
          onChangeText={(txt) => setForm({ ...form, nbPlaces: txt })}
        />

        {/* Tarif */}
        <Text style={styles.label}>Tarif</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : 5000"
          keyboardType="numeric"
          value={form.tarif}
          onChangeText={(txt) => setForm({ ...form, tarif: txt })}
        />

        <TouchableOpacity onPress={handleAdd} style={styles.btn}>
          <Text style={styles.btnText}>Valider la demande</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 8, marginBottom: 4, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  btn: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
});
