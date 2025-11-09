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
import MapView, { Marker } from "react-native-maps";
import { Demande } from "../models/Demande";
import DemandeService from "../services/DemandeService";

type Props = {
  onCancel: () => void;
  onSuccess: (demandeId?: string) => void;
};

export default function DemandeAjoutScreen({ onCancel, onSuccess }: Props) {
  const { user, token } = useAuthSession();
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [form, setForm] = useState({
    pointDepart: "",
    departLatitude: null as number | null,
    departLongitude: null as number | null,
    pointArrivee: "",
    arriveeLatitude: null as number | null,
    arriveeLongitude: null as number | null,
    nbPlaces: "",
    tarif: "",
    heureArriveeEstimee: new Date(),
  });

  const getEtudiantId = (): string | null => {
    return user?.current ?? null;
  };

  const handleAdd = async () => {
    console.log("on est dans handle Add")
    try {
      const etudiantId = getEtudiantId();
      if (!token?.current) return Alert.alert("Erreur", "Vous n'êtes pas connecté");
      if (!etudiantId) return Alert.alert("Erreur", "Identifiant étudiant introuvable.");

      const departLatitude = form.departLatitude;
      const departLongitude = form.departLongitude;
      const arriveeLatitude = form.arriveeLatitude;
      const arriveeLongitude = form.arriveeLongitude;
      const nbPlaces = Number.parseInt(form.nbPlaces || "0", 10);
      const tarif = Number.parseFloat(form.tarif || "0");

      if (
        departLatitude === null ||
        departLongitude === null ||
        arriveeLatitude === null ||
        arriveeLongitude === null
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

      console.log ("DTO Reponse", dto);
      const result = await DemandeService.createDemande(dto, token.current);
      // const result = await response.json();

      if (!result) {
        Alert.alert("Erreur lors de l'envoi.");
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
        <Text style={styles.label}>Point de départ</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Antaninarenina"
          value={form.pointDepart}
          onChangeText={(txt) => setForm({ ...form, pointDepart: txt })}
        />

        <MapView
          style={{ width: "100%", height: 200, marginBottom: 10 }}
          initialRegion={{
            latitude: -18.9137,
            longitude: 47.5361,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setForm({ ...form, departLatitude: latitude, departLongitude: longitude });
          }}
        >
          {form.departLatitude && form.departLongitude && (
            <Marker coordinate={{ latitude: form.departLatitude, longitude: form.departLongitude }} />
          )}
        </MapView>

        <Text style={styles.label}>Point d’arrivée</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Ivandry"
          value={form.pointArrivee}
          onChangeText={(txt) => setForm({ ...form, pointArrivee: txt })}
        />

        <MapView
          style={{ width: "100%", height: 200, marginBottom: 10 }}
          initialRegion={{
            latitude: -18.9137,
            longitude: 47.5361,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setForm({ ...form, arriveeLatitude: latitude, arriveeLongitude: longitude });
          }}
        >
          {form.arriveeLatitude && form.arriveeLongitude && (
            <Marker coordinate={{ latitude: form.arriveeLatitude, longitude: form.arriveeLongitude }} />
          )}
        </MapView>

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

        <Text style={styles.label}>Nombre de places</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : 1"
          keyboardType="numeric"
          value={form.nbPlaces}
          onChangeText={(txt) => setForm({ ...form, nbPlaces: txt })}
        />

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
