import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { WebView } from "react-native-webview";

type Coords = { lat?: number; lng?: number };

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onPick: (lat: number, lng: number) => void;

  /** Optionnels */
  initial?: Coords;
  markerTitle?: string;
  confirmText?: string;
  cancelText?: string;
  mapHeight?: number;
  mapContainerStyle?: StyleProp<ViewStyle>;
};

const DEFAULT_COORD = { lat: -18.8792, lng: 47.5079 };

export default function MapPickerModal({
  visible,
  title,
  onClose,
  onPick,
  initial = DEFAULT_COORD,
  markerTitle = "Position",
  confirmText = "Valider le point",
  cancelText = "Annuler",
  mapHeight = 360,
  mapContainerStyle,
}: Props) {
  const [coord, setCoord] = useState<Coords>(initial);
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) setCoord(initial);
  }, [visible, initial]);

  const leafletHTML = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <style>
          html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${coord.lat}, ${coord.lng}], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          let marker = L.marker([${coord.lat}, ${coord.lng}]).addTo(map).bindPopup("${markerTitle}").openPopup();

          map.on('click', function(e) {
            const { lat, lng } = e.latlng;
            if (marker) map.removeLayer(marker);
            marker = L.marker([lat, lng]).addTo(map).bindPopup("Nouveau point").openPopup();
            window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
          });
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setCoord({ lat: data.lat, lng: data.lng });
    } catch {}
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
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Carte (Leaflet / OpenStreetMap) */}
        <View
          style={[
            styles.mapBox,
            { height: mapHeight },
            mapContainerStyle,
          ]}
        >
          {loading && (
            <ActivityIndicator
              size="large"
              color="#4A90E2"
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <WebView
            ref={webRef}
            originWhitelist={["*"]}
            source={{ html: leafletHTML }}
            style={StyleSheet.absoluteFillObject}
            onLoadEnd={() => setLoading(false)}
            onMessage={handleMessage}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btn, { flex: 1, marginRight: 8 }]}
            onPress={validate}
          >
            <Text style={styles.btnText}>{confirmText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.cancel]}
            onPress={onClose}
          >
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
