import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { TrajetConducteur } from '../models/TrajetConducteur';
import TrajetConducteurService from '../services/TrajetConducteurService';

type Props = {
  visible: boolean;
  onClose: () => void;
  trajetId: string | null;
  onDelete: (trajet: TrajetConducteur) => void;
  onTrajetUpdated?: () => void; 
  onEdit: (trajetId: string) => void; 
};

export default function TrajetDetailModal({
  visible,
  onClose,
  trajetId,
  onDelete,
  onTrajetUpdated,
  onEdit,
}: Props) {
  const [trajet, setTrajet] = useState<TrajetConducteur | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && trajetId) {
      setLoading(true);
      (async () => {
        const token = await SecureStore.getItemAsync('userToken');
        if (!token) { setLoading(false); return; }
        try {
          const res = await TrajetConducteurService.getById(trajetId, token);
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message || 'Erreur de chargement');
          setTrajet(data);
        } catch {
          setTrajet(null);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setTrajet(null);
    }
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
              <Text>Heure : {new Date(trajet.heureDepartEstimee).toLocaleTimeString()}</Text>
              <Text>Places : {trajet.placesDisponibles}</Text>
              <Text>Description : {trajet.description}</Text>
              <Text>Statut : {trajet.statut}</Text>
              {/* ✅ nouveaux champs véhicule */}
              <Text style={{ marginTop: 8 }}>
                Véhicule : {trajet.marque} {trajet.type} — {trajet.couleur}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => {
                    onClose();               // fermer le détail
                    if (trajet?.id) onEdit(trajet.id); // ouvrir la page update
                  }}
                  style={[styles.btn, styles.edit]}
                >
                  <Text style={styles.btnText}>✏️ Modifier</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onDelete(trajet)}
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  btn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  edit: { backgroundColor: '#f0ad4e' },
  delete: { backgroundColor: '#d9534f' },
  btnText: { color: '#fff', fontWeight: '600' },
  closeBtn: { marginTop: 20, alignItems: 'center' },
  closeText: { color: '#007bff', fontSize: 16 },
});
