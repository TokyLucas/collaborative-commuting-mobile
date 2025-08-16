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
import TrajetUpdateModal from './TrajetUpdateModal'; // 👈 Import du modal de mise à jour

type Props = {
  visible: boolean;
  onClose: () => void;
  trajetId: string | null;
  onDelete: (trajet: TrajetConducteur) => void;
  onTrajetUpdated?: () => void; // 👈 pour recharger la liste après update
};

export default function TrajetDetailModal({
  visible,
  onClose,
  trajetId,
  onDelete,
  onTrajetUpdated,
}: Props) {
  const [trajet, setTrajet] = useState<TrajetConducteur | null>(null);
  const [loading, setLoading] = useState(false);
  const [updateVisible, setUpdateVisible] = useState(false); // 👈 état local du modal update

  useEffect(() => {
    if (visible && trajetId) {
      setLoading(true);
      SecureStore.getItemAsync('userToken').then(token => {
        if (!token) {
          setLoading(false);
          return;
        }
        TrajetConducteurService.getById(trajetId, token)
          .then(res => res.json())
          .then(data => {
            setTrajet(data);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
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

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => setUpdateVisible(true)} // 👈 ouvrir le modal update
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

              <TrajetUpdateModal
                visible={updateVisible}
                setVisible={setUpdateVisible}
                trajetId={trajet.id!}
                onTrajetUpdated={() => {
                  setUpdateVisible(false);
                  onClose(); 
                  onTrajetUpdated?.(); 
                }}
              />
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '90%',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    btn: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    edit: {
        backgroundColor: '#f0ad4e',
    },
    delete: {
        backgroundColor: '#d9534f',
    },
    btnText: {
        color: '#fff',
        fontWeight: '600',
    },
    closeBtn: {
        marginTop: 20,
        alignItems: 'center',
    },
    closeText: {
        color: '#007bff',
        fontSize: 16,
    },
});