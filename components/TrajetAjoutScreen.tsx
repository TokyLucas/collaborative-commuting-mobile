import { useAuthSession } from "@/providers/AuthProvider";
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
  View,
} from "react-native";
import { Car } from "../models/Car";
import { TrajetConducteur } from "../models/TrajetConducteur";
import CarService from "../services/CarService";
import TrajetConducteurService from "../services/TrajetConducteurService";
import MapPickerModal from "./MapPickerModal";

type Props = {
  onCancel: () => void;
  onSuccess: () => void;
};

/* --- Champ avec label FIXE (pas d'animation) --- */
type FieldBoxProps = React.ComponentProps<typeof TextInput> & {
  label: string;
  rightAdornment?: React.ReactNode;
};
function FieldBox({ label, rightAdornment, style, ...inputProps }: FieldBoxProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.boxLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.boxInner}>
        <TextInput {...inputProps} style={[styles.boxInput, style]} />
        {rightAdornment ? <View style={styles.adornment}>{rightAdornment}</View> : null}
      </View>
    </View>
  );
}

export default function TrajetAjoutScreen({ onCancel, onSuccess }: Props) {
  const { user } = useAuthSession();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mapDepartVisible, setMapDepartVisible] = useState(false);
  const [mapArriveeVisible, setMapArriveeVisible] = useState(false);

  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [loadingCars, setLoadingCars] = useState<boolean>(false);

  const [jours, setJours] = useState<number[]>([]); // 1=Lundi ... 7=Dimanche

  const pinRed = require("../assets/images/pin-red.png");

  const [form, setForm] = useState<{
    pointDepart: string;
    latDepart: string;
    lngDepart: string;
    pointArrivee: string;
    latArrivee: string;
    lngArrivee: string;
    heureDepartEstimee: Date;
    placesDisponibles: string;
    description: string;
    statut: string;
  }>({
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

  // Charger les voitures
  useEffect(() => {
    (async () => {
      try {
        setLoadingCars(true);
        const token = await SecureStore.getItemAsync("userToken");
        const userId = (user as any)?.current ?? (user as any)?.id ?? "";
        if (!token || !userId) return;

        const list = await CarService.getUserCars(userId, token);
        setCars(list || []);
        if (list?.length) setSelectedCarId(list[0].id);
      } catch (e) {
        console.error(e);
        Alert.alert("Erreur", "Impossible de charger vos voitures.");
      } finally {
        setLoadingCars(false);
      }
    })();
  }, [user]);

  const handleAdd = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const idConducteurC = (user as any)?.current ?? (user as any)?.id ?? "";

      if (!token) {
        Alert.alert("Erreur", "Vous n'êtes pas connecté");
        return;
      }
      if (!idConducteurC) {
        Alert.alert("Erreur", "Identifiant conducteur introuvable.");
        return;
      }
      if (!selectedCarId) {
        Alert.alert("Erreur", "Veuillez choisir une voiture.");
        return;
      }

      const latDepart = Number(form.latDepart);
      const lngDepart = Number(form.lngDepart);
      const latArrivee = Number(form.latArrivee);
      const lngArrivee = Number(form.lngArrivee);
      const placesDisponibles = Number.parseInt(form.placesDisponibles || "0", 10);

      if ([latDepart, lngDepart, latArrivee, lngArrivee].some(Number.isNaN)) {
        Alert.alert("Coordonnées manquantes", "Choisissez départ et arrivée via les cartes.");
        return;
      }
      if (!form.pointDepart.trim() || !form.pointArrivee.trim()) {
        Alert.alert("Champs requis", "Renseignez les points de départ et d’arrivée.");
        return;
      }
      if (Number.isNaN(placesDisponibles) || placesDisponibles <= 0) {
        Alert.alert("Champs requis", "Renseignez un nombre de places valide.");
        return;
      }

      const payload: Omit<TrajetConducteur, "id"> = {
        idConducteur: String(idConducteurC),
        pointDepart: form.pointDepart.trim(),
        latDepart,
        lngDepart,
        pointArrivee: form.pointArrivee.trim(),
        latArrivee,
        lngArrivee,
        heureDepartEstimee: form.heureDepartEstimee.toISOString(),
        placesDisponibles,
        description: form.description.trim(),
        statut: form.statut,
        actif: 1,
        voitureId: selectedCarId,
        jours: jours.length ? jours : null,
      };

      const response = await TrajetConducteurService.createTrajet(payload, token);
      const result = await response.json();

      if (!response.ok) {
        Alert.alert("Erreur", result?.message || "Erreur lors de l'envoi.");
        return;
      }

      Alert.alert("Succès", "Trajet ajouté !");
      onSuccess();
    } catch (err) {
      console.error("Erreur:", err);
      Alert.alert("Erreur", "Une erreur est survenue.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nouveau trajet</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={{ fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Voiture */}
        <View style={styles.box}>
          <Text style={styles.boxLabel}>Voiture</Text>
          <View style={styles.pickerBoxInner}>
            <Picker
              enabled={!loadingCars}
              selectedValue={selectedCarId}
              onValueChange={(val) => setSelectedCarId(String(val))}
            >
              {cars.length === 0 ? (
                <Picker.Item
                  label={loadingCars ? "Chargement..." : "Aucune voiture"}
                  value=""
                />
              ) : (
                cars.map((c) => (
                  <Picker.Item
                    key={c.id}
                    value={c.id}
                    label={`${c.brand ?? ""} ${c.model ?? ""} ${
                      c.color ? `(${c.color})` : ""
                    }`.trim()}
                  />
                ))
              )}
            </Picker>
          </View>
        </View>

        {/* Départ */}
        <FieldBox
          label="Point de départ"
          value={form.pointDepart}
          onChangeText={(t) => setForm({ ...form, pointDepart: t })}
          placeholder="Ex : Antaninarenina"
          rightAdornment={
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setMapDepartVisible(true)}
            >
              <Image source={pinRed} style={styles.pinIcon} />
            </TouchableOpacity>
          }
        />
        {!!form.latDepart && !!form.lngDepart && (
          <Text style={styles.helper}>
            Départ: {form.latDepart}, {form.lngDepart}
          </Text>
        )}

        {/* Arrivée */}
        <FieldBox
          label="Point d’arrivée"
          value={form.pointArrivee}
          onChangeText={(t) => setForm({ ...form, pointArrivee: t })}
          placeholder="Ex : Ivandry"
          rightAdornment={
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setMapArriveeVisible(true)}
            >
              <Image source={pinRed} style={styles.pinIcon} />
            </TouchableOpacity>
          }
        />
        {!!form.latArrivee && !!form.lngArrivee && (
          <Text style={styles.helper}>
            Arrivée: {form.latArrivee}, {form.lngArrivee}
          </Text>
        )}

        {/* Heure & Places */}
        <View style={styles.rowWrap}>
          <View style={styles.half}>
            <TouchableOpacity onPress={() => setShowTimePicker(true)} activeOpacity={0.8}>
              <FieldBox
                label="Heure de départ estimée"
                value={form.heureDepartEstimee.toLocaleTimeString()}
                editable={false}
                pointerEvents="none"
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

        {/* Sélecteur de jours */}
        <Text style={[styles.boxLabel, { marginBottom: 6 }]}>Jours de trajet</Text>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 12 }}>
          {["L", "M", "M", "J", "V", "S", "D"].map((label, i) => {
            const index = i + 1;
            const selected = jours.includes(index);
            return (
              <TouchableOpacity
                key={index}
                onPress={() =>
                  setJours((prev) =>
                    prev.includes(index)
                      ? prev.filter((j) => j !== index)
                      : [...prev, index]
                  )
                }
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: selected ? "#A3E635" : "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: selected ? "#000" : "#666", fontWeight: "600" }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <FieldBox
          label="Description"
          value={form.description}
          onChangeText={(t) => setForm({ ...form, description: t })}
          placeholder="Ex : Trajet direct sans arrêt"
          multiline
        />

        {/* Actions */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <TouchableOpacity onPress={handleAdd} style={[styles.btn, { flex: 1 }]}>
            <Text style={styles.btnText}>Valider le trajet</Text>
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
        onPick={(lat, lng) =>
          setForm({ ...form, latDepart: String(lat), lngDepart: String(lng) })
        }
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
        onPick={(lat, lng) =>
          setForm({ ...form, latArrivee: String(lat), lngArrivee: String(lng) })
        }
        markerTitle="Arrivée"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },

  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 },
  half: { flexBasis: "48%", flexGrow: 1, minWidth: 160 },

  box: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    marginBottom: 12,
  },
  boxLabel: { fontSize: 12, color: "#6B7280", paddingTop: 8, paddingHorizontal: 12 },
  boxInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 2,
    gap: 8,
  },
  boxInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
  pickerBoxInner: { paddingHorizontal: 6, paddingBottom: 4 },

  btn: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
    flex: 1,
  },
  btnText: { color: "#fff", fontWeight: "600" },
  cancel: { backgroundColor: "#999" },

  helper: { marginTop: 6, color: "#444" },

  iconBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  pinIcon: { width: 22, height: 28, resizeMode: "contain" },
  adornment: {},
});
