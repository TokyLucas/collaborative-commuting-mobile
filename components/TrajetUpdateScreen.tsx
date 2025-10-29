import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Car } from "../models/Car";
import { TrajetConducteur } from "../models/TrajetConducteur";
import CarService from "../services/CarService";
import TrajetConducteurService from "../services/TrajetConducteurService";
import MapPickerModal from "./MapPickerModal";

type Props = {
  trajetId: string | null;
  onCancel: () => void;
  onSuccess: () => void;
};

type FieldBoxProps = React.ComponentProps<typeof TextInput> & {
  label: string;
  rightAdornment?: React.ReactNode;
};
function FieldBox({ label, rightAdornment, style, ...inputProps }: FieldBoxProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.boxLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.boxInner}>
        <TextInput {...inputProps} style={[styles.boxInput, style]} />
        {rightAdornment ? <View style={styles.adornment}>{rightAdornment}</View> : null}
      </View>
    </View>
  );
}

export default function TrajetUpdateScreen({ trajetId, onCancel, onSuccess }: Props) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mapDepartVisible, setMapDepartVisible] = useState(false);
  const [mapArriveeVisible, setMapArriveeVisible] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarId, setSelectedCarId] = useState("");

  const pinRed = require("../assets/images/pin-red.png");

  const [form, setForm] = useState({
    id: "",
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

  // Charger trajet + voitures utilisateur
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token || !trajetId) return;

      // Récupération du trajet
      const res = await TrajetConducteurService.getById(trajetId, token);
      const data = await res.json();
      if (!res.ok) { Alert.alert("Erreur", data?.message || "Chargement impossible"); return; }

      setForm({
        id: data.id || trajetId,
        pointDepart: data.pointDepart || "",
        latDepart: String(data.latDepart ?? ""),
        lngDepart: String(data.lngDepart ?? ""),
        pointArrivee: data.pointArrivee || "",
        latArrivee: String(data.latArrivee ?? ""),
        lngArrivee: String(data.lngArrivee ?? ""),
        heureDepartEstimee: new Date(data.heureDepartEstimee),
        placesDisponibles: String(data.placesDisponibles ?? ""),
        description: data.description || "",
        statut: data.statut || "Prévu",
      });
      setSelectedCarId(data.voitureId || ""); // backend doit renvoyer voitureId

      // Récupération voitures utilisateur
      const userId = data.idConducteur;
      const list = await CarService.getUserCars(userId, token);
      setCars(list);
      if (!data.voitureId && list.length) setSelectedCarId(list[0].id);
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
      if (!selectedCarId) {
        Alert.alert("Erreur", "Choisissez une voiture.");
        return;
      }

      const dto: Omit<TrajetConducteur, "id"> & { voitureId: string } = {
        idConducteur: "", // le backend garde l’existant
        pointDepart: form.pointDepart.trim(),
        latDepart, lngDepart,
        pointArrivee: form.pointArrivee.trim(),
        latArrivee, lngArrivee,
        heureDepartEstimee: form.heureDepartEstimee.toISOString(),
        placesDisponibles,
        description: form.description.trim(),
        statut: form.statut || "Prévu",
        actif: 1,
        voitureId: selectedCarId,
      } as any;

      const response = await TrajetConducteurService.updateTrajet(form.id, dto, token);
      const result = await response.json();
      if (!response.ok) { Alert.alert("Erreur", result?.message || "Échec mise à jour"); return; }

      Alert.alert("Succès", "Trajet mis à jour !");
      onSuccess();
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Une erreur est survenue.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Modifier trajet</Text>
        <TouchableOpacity onPress={onCancel}><Text style={styles.headerClose}>✕</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Sélecteur voiture */}
        <View style={styles.box}>
          <Text style={styles.boxLabel}>Voiture</Text>
          <Picker
            selectedValue={selectedCarId}
            onValueChange={(val) => setSelectedCarId(val)}
          >
            {cars.map((c) => (
              <Picker.Item
                key={c.id}
                value={c.id}
                label={`${c.brand ?? ""} ${c.model ?? ""} ${c.color ? `(${c.color})` : ""}`}
              />
            ))}
          </Picker>
        </View>

        {/* Départ */}
        <FieldBox
          label="Point de départ"
          value={form.pointDepart}
          onChangeText={(t) => setForm({ ...form, pointDepart: t })}
          placeholder="Ex : Antaninarenina"
          rightAdornment={
            <TouchableOpacity style={styles.iconBtn} onPress={() => setMapDepartVisible(true)}>
              <Image source={pinRed} style={styles.pinIcon} />
            </TouchableOpacity>
          }
        />
        {!!form.latDepart && !!form.lngDepart && (
          <Text style={styles.helper}>Départ: {form.latDepart}, {form.lngDepart}</Text>
        )}

        {/* Arrivée */}
        <FieldBox
          label="Point d’arrivée"
          value={form.pointArrivee}
          onChangeText={(t) => setForm({ ...form, pointArrivee: t })}
          placeholder="Ex : Ivandry"
          rightAdornment={
            <TouchableOpacity style={styles.iconBtn} onPress={() => setMapArriveeVisible(true)}>
              <Image source={pinRed} style={styles.pinIcon} />
            </TouchableOpacity>
          }
        />
        {!!form.latArrivee && !!form.lngArrivee && (
          <Text style={styles.helper}>Arrivée: {form.latArrivee}, {form.lngArrivee}</Text>
        )}

        {/* Heure + places */}
        <View style={styles.rowWrap}>
          <View style={styles.half}>
            <TouchableOpacity onPress={() => setShowTimePicker(true)}>
              <FieldBox
                label="Heure de départ estimée"
                value={form.heureDepartEstimee.toLocaleTimeString()}
                editable={false}
              />
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
          </View>
          <View style={styles.half}>
            <FieldBox
              label="Places disponibles"
              value={form.placesDisponibles}
              onChangeText={(t) => setForm({ ...form, placesDisponibles: t })}
              keyboardType="numeric"
              placeholder="Ex : 3"
            />
          </View>
        </View>

        <FieldBox
          label="Description"
          value={form.description}
          onChangeText={(t) => setForm({ ...form, description: t })}
          placeholder="Ex : Trajet direct"
          multiline
        />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <TouchableOpacity onPress={handleUpdate} style={[styles.btn, { flex: 1 }]}>
            <Text style={styles.btnText}>Modifier</Text>
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
  header: { padding: 16, flexDirection: "row", justifyContent: "space-between" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  headerClose: { fontSize: 18 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 },
  half: { flexBasis: "48%", flexGrow: 1, minWidth: 160 },
  box: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, backgroundColor: "#FAFAFA", marginBottom: 12 },
  boxLabel: { fontSize: 12, color: "#6B7280", paddingTop: 8, paddingHorizontal: 12 },
  boxInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, paddingTop: 2, gap: 8 },
  boxInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
  adornment: {},
  btn: { backgroundColor: "#4A90E2", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
  cancel: { backgroundColor: "#999" },
  helper: { marginTop: 6, color: "#444" },
  iconBtn: { padding: 6, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff" },
  pinIcon: { width: 22, height: 28, resizeMode: "contain" },
});
