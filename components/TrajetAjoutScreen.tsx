import { useAuthSession } from "@/providers/AuthProvider";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { TrajetConducteur } from "../models/TrajetConducteur";
import TrajetConducteurService from "../services/TrajetConducteurService";
import MapPickerModal from "./MapPickerModal";

type Props = {
  onCancel: () => void;
  onSuccess: () => void;
};

export default function TrajetAjoutScreen({ onCancel, onSuccess }: Props) {
  const { user } = useAuthSession();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mapDepartVisible, setMapDepartVisible] = useState(false);
  const [mapArriveeVisible, setMapArriveeVisible] = useState(false);
  const pinRed = require("../assets/images/pin-red.png");

  const [form, setForm] = useState({
    marque: "",
    type: "",
    couleur: "",
    pointDepart: "",
    latDepart: "",
    lngDepart: "",
    pointArrivee: "",
    latArrivee: "",
    lngArrivee: "",
    heureDepartEstimee: new Date(),
    placesDisponibles: "",
    description: "",
    statut: "Prévu",
  });

  const handleAdd = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const idConducteurC = (user as any)?.current ?? (user as any)?.id ?? "";

      if (!token) { Alert.alert("Erreur", "Vous n'êtes pas connecté"); return; }
      if (!idConducteurC) { Alert.alert("Erreur", "Identifiant conducteur introuvable."); return; }

      const latDepart = Number(form.latDepart);
      const lngDepart = Number(form.lngDepart);
      const latArrivee = Number(form.latArrivee);
      const lngArrivee = Number(form.lngArrivee);
      const placesDisponibles = Number.parseInt(form.placesDisponibles || "0", 10);

      if ([latDepart, lngDepart, latArrivee, lngArrivee].some(Number.isNaN)) {
        Alert.alert("Coordonnées manquantes", "Choisis départ et arrivée via les cartes.");
        return;
      }

      const dto: Omit<TrajetConducteur, "id"> = {
        idConducteur: idConducteurC as string,
        pointDepart: form.pointDepart.trim(),
        latDepart, lngDepart,
        pointArrivee: form.pointArrivee.trim(),
        latArrivee, lngArrivee,
        heureDepartEstimee: form.heureDepartEstimee.toISOString(),
        placesDisponibles,
        description: form.description.trim(),
        statut: form.statut,
        actif: 1,
        marque: form.marque.trim(),
        type: form.type.trim(),
        couleur: form.couleur.trim(),
      };

      const response = await TrajetConducteurService.createTrajet(dto, token);
      const result = await response.json();
      if (!response.ok) { Alert.alert("Erreur", result?.message || "Erreur lors de l'envoi."); return; }

      Alert.alert("Succès", "Trajet ajouté !");
      onSuccess();
    } catch (err) {
      console.error("Erreur:", err);
      Alert.alert("Erreur", "Une erreur est survenue.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header simple */}
      <View style={{ padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>Nouveau trajet</Text>
        <TouchableOpacity onPress={onCancel}><Text style={{ fontSize: 18 }}>✕</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Nouveaux champs en haut */}
        <Text style={styles.label}>Marque</Text>
        <TextInput style={styles.input} placeholder="Ex : Toyota" value={form.marque}
          onChangeText={(txt) => setForm({ ...form, marque: txt })} />

        <Text style={styles.label}>Type / Modèle</Text>
        <TextInput style={styles.input} placeholder="Ex : Corolla" value={form.type}
          onChangeText={(txt) => setForm({ ...form, type: txt })} />

        <Text style={styles.label}>Couleur</Text>
        <TextInput style={styles.input} placeholder="Ex : Blanc" value={form.couleur}
          onChangeText={(txt) => setForm({ ...form, couleur: txt })} />

        {/* Points sans map inline */}
       <Text style={styles.label}>Point de départ</Text>
<View style={styles.row}>
  <TextInput
    style={[styles.input, { flex: 1 }]}
    placeholder="Ex : Antaninarenina"
    value={form.pointDepart}
    onChangeText={(txt) => setForm({ ...form, pointDepart: txt })}
  />
  <TouchableOpacity
    style={styles.iconBtn}
    onPress={() => setMapDepartVisible(true)}
    accessibilityRole="button"
    accessibilityLabel="Choisir le point de départ sur la carte"
  >
    <Image source={pinRed} style={styles.pinIcon} />
  </TouchableOpacity>
</View>
{!!form.latDepart && !!form.lngDepart && (
  <Text style={styles.helper}>Départ: {form.latDepart}, {form.lngDepart}</Text>
)}

    <Text style={styles.label}>Point d’arrivée</Text>
<View style={styles.row}>
  <TextInput
    style={[styles.input, { flex: 1 }]}
    placeholder="Ex : Ivandry"
    value={form.pointArrivee}
    onChangeText={(txt) => setForm({ ...form, pointArrivee: txt })}
  />
  <TouchableOpacity
    style={styles.iconBtn}
    onPress={() => setMapArriveeVisible(true)}
    accessibilityRole="button"
    accessibilityLabel="Choisir le point d’arrivée sur la carte"
  >
    <Image source={pinRed} style={styles.pinIcon} />
  </TouchableOpacity>
</View>
{!!form.latArrivee && !!form.lngArrivee && (
  <Text style={styles.helper}>Arrivée: {form.latArrivee}, {form.lngArrivee}</Text>
)}

        <Text style={styles.label}>Heure de départ estimée</Text>
        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.input}>
          <Text>{form.heureDepartEstimee ? form.heureDepartEstimee.toLocaleTimeString() : "Choisir une heure"}</Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={form.heureDepartEstimee}
            mode="time"
            display="default"
            onChange={(_, date) => {
              setShowTimePicker(false);
              if (date) setForm({ ...form, heureDepartEstimee: date });
            }}
          />
        )}

        <Text style={styles.label}>Places disponibles</Text>
        <TextInput style={styles.input} placeholder="Ex : 3" keyboardType="numeric"
          value={form.placesDisponibles}
          onChangeText={(txt) => setForm({ ...form, placesDisponibles: txt })} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={styles.input} placeholder="Ex : Trajet direct sans arrêt" value={form.description}
          onChangeText={(txt) => setForm({ ...form, description: txt })} />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <TouchableOpacity onPress={handleAdd} style={[styles.btn, { flex: 1 }]}>
            <Text style={styles.btnText}>Valider le trajet</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.cancel]}>
            <Text style={styles.btnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals cartes réutilisables */}
      <MapPickerModal
        visible={mapDepartVisible}
        title="Choisir le point de départ"
        initial={{
          lat: form.latDepart ? Number(form.latDepart) : undefined,
          lng: form.lngDepart ? Number(form.lngDepart) : undefined,
        }}
        onClose={() => setMapDepartVisible(false)}
        onPick={(lat, lng) => setForm({ ...form, latDepart: String(lat), lngDepart: String(lng) })}
        markerTitle="Départ"
      />
      <MapPickerModal
        visible={mapArriveeVisible}
        title="Choisir le point d’arrivée"
        initial={{
          lat: form.latArrivee ? Number(form.latArrivee) : undefined,
          lng: form.lngArrivee ? Number(form.lngArrivee) : undefined,
        }}
        onClose={() => setMapArriveeVisible(false)}
        onPick={(lat, lng) => setForm({ ...form, latArrivee: String(lat), lngArrivee: String(lng) })}
        markerTitle="Arrivée"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 8, marginBottom: 4, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, backgroundColor: "#fff" },
  btn: { backgroundColor: "#4A90E2", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, marginTop: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
  cancel: { backgroundColor: "#999" },
  helper: { marginTop: 6, color: "#444" },
row: { flexDirection: "row", alignItems: "center", gap: 8 },
iconBtn: {
  marginLeft: 8,
  paddingVertical: 8,
  paddingHorizontal: 10,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#ccc",
  backgroundColor: "#fff",
},
pinIcon: {
  width: 22,
  height: 28,      
  resizeMode: "contain",
},

});
