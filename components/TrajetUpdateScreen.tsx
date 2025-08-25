import DateTimePicker from "@react-native-community/datetimepicker";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from "react-native";
import { TrajetConducteur } from "../models/TrajetConducteur";
import TrajetConducteurService from "../services/TrajetConducteurService";
import MapPickerModal from "./MapPickerModal";

type Props = {
  trajetId: string | null;
  onCancel: () => void;
  onSuccess: () => void;
};

export default function TrajetUpdateScreen({ trajetId, onCancel, onSuccess }: Props) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mapDepartVisible, setMapDepartVisible] = useState(false);
  const [mapArriveeVisible, setMapArriveeVisible] = useState(false);

  const pinRed = require("../assets/images/pin-red.png");
  const [form, setForm] = useState({
    id: "",
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
    statut: "",
  });

  useEffect(() => {
    if (!trajetId) return;
    (async () => {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) return;

      const res = await TrajetConducteurService.getById(trajetId, token);
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Erreur", data?.message || "Chargement impossible");
        return;
      }

      setForm({
        id: data.id || trajetId,
        marque: data.marque || "",
        type: data.type || "",
        couleur: data.couleur || "",
        pointDepart: data.pointDepart || "",
        latDepart: String(data.latDepart ?? ""),
        lngDepart: String(data.lngDepart ?? ""),
        pointArrivee: data.pointArrivee || "",
        latArrivee: String(data.latArrivee ?? ""),
        lngArrivee: String(data.lngArrivee ?? ""),
        heureDepartEstimee: new Date(data.heureDepartEstimee),
        placesDisponibles: String(data.placesDisponibles ?? ""),
        description: data.description || "",
        statut: data.statut || "",
      });
    })();
  }, [trajetId]);

  const handleUpdate = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token || !form.id) return;

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
        idConducteur: "", // laissé vide si non modifié côté backend
        pointDepart: form.pointDepart.trim(),
        latDepart, lngDepart,
        pointArrivee: form.pointArrivee.trim(),
        latArrivee, lngArrivee,
        heureDepartEstimee: form.heureDepartEstimee.toISOString(),
        placesDisponibles,
        description: form.description.trim(),
        statut: form.statut || "Prévu",
        actif: 1,
        marque: form.marque.trim(),
        type: form.type.trim(),
        couleur: form.couleur.trim(),
      };

      const response = await TrajetConducteurService.updateTrajet(form.id, dto, token);
      const result = await response.json();
      if (!response.ok) {
        Alert.alert("Erreur", result?.message || "Échec de la mise à jour");
        return;
      }

      Alert.alert("Succès", "Trajet mis à jour.");
      onSuccess();
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Une erreur est survenue.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Modifier trajet</Text>
        <TouchableOpacity onPress={onCancel}><Text style={styles.headerClose}>✕</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Nouveaux champs en haut */}
        <Text style={styles.label}>Marque</Text>
        <TextInput style={styles.input} placeholder="Ex : Toyota"
          value={form.marque} onChangeText={(txt) => setForm({ ...form, marque: txt })} />

        <Text style={styles.label}>Type / Modèle</Text>
        <TextInput style={styles.input} placeholder="Ex : Corolla"
          value={form.type} onChangeText={(txt) => setForm({ ...form, type: txt })} />

        <Text style={styles.label}>Couleur</Text>
        <TextInput style={styles.input} placeholder="Ex : Blanc"
          value={form.couleur} onChangeText={(txt) => setForm({ ...form, couleur: txt })} />

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
          <Text>
            {form.heureDepartEstimee
              ? form.heureDepartEstimee.toLocaleTimeString()
              : "Choisir une heure"}
          </Text>
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
        <TextInput style={styles.input} placeholder="Places disponibles" keyboardType="numeric"
          value={form.placesDisponibles} onChangeText={(txt) => setForm({ ...form, placesDisponibles: txt })} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={styles.input} placeholder="Description"
          value={form.description} onChangeText={(txt) => setForm({ ...form, description: txt })} />

        <Text style={styles.label}>Statut</Text>
        <Text style={[styles.input, { paddingVertical: 12 }]}>Statut : {form.statut || "Prévu"}</Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <TouchableOpacity onPress={handleUpdate} style={[styles.btn, { flex: 1 }]}>
            <Text style={styles.btnText}>Modifier</Text>
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
  header: { padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  headerClose: { fontSize: 18 },

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
