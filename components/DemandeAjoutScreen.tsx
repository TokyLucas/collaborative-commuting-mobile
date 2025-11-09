import { useAuthSession } from "@/providers/AuthProvider";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Demande } from "../models/Demande";
import DemandeService from "../services/DemandeService";
import MapPickerModal from "./MapPickerModal";

type Props = {
  onCancel: () => void;
  onSuccess: (demandeId?: string) => void;
};

export default function DemandeAjoutScreen({ onCancel, onSuccess }: Props) {
  const { user } = useAuthSession();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mapDepartVisible, setMapDepartVisible] = useState(false);
  const [mapArriveeVisible, setMapArriveeVisible] = useState(false);
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

  // ✅ Soumission avec récupération simplifiée de l'ID et du token
  const handleAdd = async () => {
    try {
      const etudiantId = (user as any)?.current; // ID directement depuis le contexte
      const tokenVal = (user as any)?.token;    // Token directement depuis le contexte

      if (!tokenVal) return Alert.alert("Erreur", "Vous n'êtes pas connecté");
      if (!etudiantId)
        return Alert.alert("Erreur", "Identifiant étudiant introuvable.");

      const departLatitude = Number(form.departLatitude);
      const departLongitude = Number(form.departLongitude);
      const arriveeLatitude = Number(form.arriveeLatitude);
      const arriveeLongitude = Number(form.arriveeLongitude);
      const nbPlaces = Number.parseInt(form.nbPlaces || "0", 10);
      const tarif = Number.parseFloat(form.tarif || "0");

      if ([departLatitude, departLongitude, arriveeLatitude, arriveeLongitude].some(Number.isNaN)) {
        Alert.alert(
          "Coordonnées manquantes",
          "Choisis départ et arrivée via les cartes."
        );
        return;
      }

      const dto: Omit<Demande, "id" | "statut" | "dateCreation" | "dateMiseAJour"> = {
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

      const response = await DemandeService.createDemande(dto, tokenVal);
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
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          Nouvelle demande
        </Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={{ fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Point de départ */}
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
          >
            <Image source={pinRed} style={styles.pinIcon} />
          </TouchableOpacity>
        </View>
        {!!form.departLatitude && !!form.departLongitude && (
          <Text style={styles.helper}>
            Départ: {form.departLatitude}, {form.departLongitude}
          </Text>
        )}

        {/* Point d’arrivée */}
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
          >
            <Image source={pinRed} style={styles.pinIcon} />
          </TouchableOpacity>
        </View>
        {!!form.arriveeLatitude && !!form.arriveeLongitude && (
          <Text style={styles.helper}>
            Arrivée: {form.arriveeLatitude}, {form.arriveeLongitude}
          </Text>
        )}

        {/* Heure d'arrivée estimée */}
        <Text style={styles.label}>Heure d'arrivée estimée</Text>
        <TouchableOpacity
          onPress={() => setShowTimePicker(true)}
          style={styles.input}
        >
          <Text>
            {form.heureArriveeEstimee
              ? form.heureArriveeEstimee.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Choisir l'heure"}
          </Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={form.heureArriveeEstimee}
            mode="time"
            display="default"
            onChange={(_, date) => {
              setTimeout(() => setShowTimePicker(false), 100);
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

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <TouchableOpacity onPress={handleAdd} style={[styles.btn, { flex: 1 }]}>
            <Text style={styles.btnText}>Valider la demande</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.cancel]}>
            <Text style={styles.btnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals cartes */}
      <MapPickerModal
        visible={mapDepartVisible}
        title="Choisir le point de départ"
        initial={{
          lat: form.departLatitude ? Number(form.departLatitude) : undefined,
          lng: form.departLongitude ? Number(form.departLongitude) : undefined,
        }}
        onClose={() => setMapDepartVisible(false)}
        onPick={(lat, lng) =>
          setForm({ ...form, departLatitude: String(lat), departLongitude: String(lng) })
        }
        markerTitle="Départ"
      />
      <MapPickerModal
        visible={mapArriveeVisible}
        title="Choisir le point d’arrivée"
        initial={{
          lat: form.arriveeLatitude ? Number(form.arriveeLatitude) : undefined,
          lng: form.arriveeLongitude ? Number(form.arriveeLongitude) : undefined,
        }}
        onClose={() => setMapArriveeVisible(false)}
        onPick={(lat, lng) =>
          setForm({ ...form, arriveeLatitude: String(lat), arriveeLongitude: String(lng) })
        }
        markerTitle="Arrivée"
      />
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
  pinIcon: { width: 22, height: 28, resizeMode: "contain" },
});
