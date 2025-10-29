import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import MapView, {
  MapPressEvent,
  Marker,
  Region,
} from "react-native-maps";

type Coords = { lat?: number; lng?: number };

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onPick: (lat: number, lng: number) => void;

  /** Optionnels */
  initial?: Coords;                   // point pré-sélectionné
  initialRegion?: Region;             // région par défaut de la carte
  markerTitle?: string;               // titre du marker
  confirmText?: string;               // texte bouton valider
  cancelText?: string;                // texte bouton annuler
  mapHeight?: number;                 // hauteur de la carte (px), défaut 360
  mapContainerStyle?: StyleProp<ViewStyle>; // style conteneur carte
};

const DEFAULT_REGION: Region = {
  latitude: -18.8792,
  longitude: 47.5079,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapPickerModal({
  visible,
  title,
  onClose,
  onPick,
  initial,
  initialRegion = DEFAULT_REGION,
  markerTitle = "Position",
  confirmText = "Valider le point",
  cancelText = "Annuler",
  mapHeight = 360,
  mapContainerStyle,
}: Props) {
  const [coord, setCoord] = useState<Coords>(initial || {});

  useEffect(() => {
    if (visible) setCoord(initial || {});
  }, [visible, initial]);

  const onMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoord({ lat: latitude, lng: longitude });
  };

  const validate = () => {
    if (!coord.lat || !coord.lng) {
      Alert.alert("Point manquant", "Clique sur la carte pour choisir un point.");
      return;
    }
    onPick(coord.lat, coord.lng);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Carte (hauteur fixe + absoluteFill) */}
        <View
          style={[
            styles.mapBox,
            { height: mapHeight },
            mapContainerStyle,
          ]}
        >
          <MapView
            key={visible ? "open" : "closed"} // force remount à l'ouverture
            style={StyleSheet.absoluteFillObject}
            initialRegion={initialRegion}
            onPress={onMapPress}
            scrollEnabled
            zoomEnabled
            rotateEnabled={false}
          >
            {coord.lat && coord.lng ? (
              <Marker
                coordinate={{ latitude: coord.lat, longitude: coord.lng }}
                title={markerTitle}
              />
            ) : null}
          </MapView>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btn, { flex: 1, marginRight: 8 }]}
            onPress={validate}
          >
            <Text style={styles.btnText}>{confirmText}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onClose}>
            <Text style={styles.btnText}>{cancelText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: { fontSize: 16, fontWeight: "700" },
  close: { fontSize: 18 },
  mapBox: {
    margin: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ddd",
  },
  footer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  btn: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
  cancel: { backgroundColor: "#999" },
});
