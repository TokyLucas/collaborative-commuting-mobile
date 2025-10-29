import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Car } from "../models/Car";
import { TrajetVoiture } from "../models/TrajetVoiture"; // <- modèle avec car?: Car
import CarService from "../services/CarService";
import TrajetConducteurService from "../services/TrajetConducteurService";

type Props = {
  visible: boolean;
  onClose: () => void;
  trajetId: string | null;
  onDelete: (trajet: TrajetVoiture) => void;
  onTrajetUpdated?: () => void;
  onEdit: (trajetId: string) => void;
};

function fmtTime(isoOrDateLike?: string) {
  if (!isoOrDateLike) return "-";
  const d = new Date(isoOrDateLike);
  return isNaN(+d) ? "-" : d.toLocaleTimeString();
}

function fmtDateTime(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return isNaN(+d) ? "-" : d.toLocaleString();
}

export default function TrajetDetailModal({
  visible,
  onClose,
  trajetId,
  onDelete,
  onTrajetUpdated,
  onEdit,
}: Props) {
  const [trajet, setTrajet] = useState<TrajetVoiture | null>(null);
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !trajetId) {
      setTrajet(null);
      setCar(null);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const token = await SecureStore.getItemAsync("userToken");
        if (!token) {
          setLoading(false);
          return;
        }

        // 1) Essaye d'abord via la VIEW (car déjà joint)
        try {
          const resView = await TrajetConducteurService.getByIdView(trajetId, token);
          const dataView = await resView.json();
          if (resView.ok && dataView) {
            setTrajet(dataView as TrajetVoiture);
            setCar((dataView as TrajetVoiture)?.car ?? null);
          } else {
            // 2) Fallback: trajet "classique" + fetch voitureId
            const res = await TrajetConducteurService.getById(trajetId, token);
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Erreur de chargement du trajet");
            setTrajet(data);

            if (data?.car && typeof data.car === "object") {
              setCar(data.car as Car);
            } else if (data?.voitureId) {
              try {
                const c = await CarService.getById(String(data.voitureId), token);
                setCar(c);
              } catch {
                setCar(null);
              }
            } else {
              setCar(null);
            }
          }
        } catch {
          // 3) En cas d’erreur de view, on tente direct le fallback
          const res = await TrajetConducteurService.getById(trajetId, token);
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message || "Erreur de chargement du trajet");
          setTrajet(data);

          if (data?.car && typeof data.car === "object") {
            setCar(data.car as Car);
          } else if (data?.voitureId) {
            try {
              const c = await CarService.getById(String(data.voitureId), token);
              setCar(c);
            } catch {
              setCar(null);
            }
          } else {
            setCar(null);
          }
        }
      } catch (e: any) {
        console.error(e);
        Alert.alert("Erreur", e?.message || "Impossible de charger les détails.");
        setTrajet(null);
        setCar(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, trajetId]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {loading ? (
            <ActivityIndicator size="large" />
          ) : trajet ? (
            <>
              <Text style={styles.title}>Détails du trajet</Text>

              <Text>Départ : {trajet.pointDepart}</Text>
              <Text>Arrivée : {trajet.pointArrivee}</Text>
              <Text>Heure : {fmtTime(trajet.heureDepartEstimee)}</Text>
              <Text>Places : {trajet.placesDisponibles}</Text>
              {!!trajet.description && <Text>Description : {trajet.description}</Text>}
              <Text>Statut : {trajet.statut}</Text>

              {/* Véhicule */}
              <View style={{ marginTop: 10 }}>
                <Text style={styles.subTitle}>Véhicule</Text>
                {car ? (
                  <>
                    <Text>
                      {car.brand} {car.model} {car.color ? `(${car.color})` : ""}
                    </Text>
                    <Text>Nombre de places : {car.nbPlaces}</Text>
                    <Text style={styles.meta}>
                      Créé le : {fmtDateTime(car.createdAt)} • MAJ : {fmtDateTime(car.updateAt)}
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontStyle: "italic" }}>Véhicule non renseigné</Text>
                )}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    if (trajet?.id) onEdit(trajet.id);
                  }}
                  style={[styles.btn, styles.edit]}
                >
                  <Text style={styles.btnText}>✏️ Modifier</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => trajet && onDelete(trajet)}
                  style={[styles.btn, styles.delete]}
                >
                  <Text style={styles.btnText}>🗑️ Supprimer</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>Fermer</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text>Aucun trajet trouvé</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
  },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  subTitle: { fontWeight: "600", marginBottom: 4 },
  meta: { color: "#6b7280", fontSize: 12, marginTop: 4 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  btn: { flex: 1, padding: 10, borderRadius: 8, alignItems: "center", marginHorizontal: 5 },
  edit: { backgroundColor: "#f0ad4e" },
  delete: { backgroundColor: "#d9534f" },
  btnText: { color: "#fff", fontWeight: "600" },
  closeBtn: { marginTop: 20, alignItems: "center" },
  closeText: { color: "#007bff", fontSize: 16 },
});
