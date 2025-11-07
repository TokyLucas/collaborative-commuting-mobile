import { ThemedView } from '@/components/ThemedView'
import { useAuthSession } from '@/providers/AuthProvider'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { WebView } from 'react-native-webview'
import CarService from '../../../services/CarService'
import { PokeChannel } from '../../../services/PokeChannel'
import TrajetConducteurService from '../../../services/TrajetConducteurService'


type Marker = {
  id: string
  pointDepart: string
  latDepart: number
  lngDepart: number
  pointArrivee: string
  latArrivee: number
  lngArrivee: number
  heureDepartEstimee: string
  placesDisponibles: number
  statut: string
  carBrand: string
  carModel: string
  carColor: string
  carNbPlaces: number
}

type PokeRequest =
  | { from: string }
  | { lat: number; lng: number }

export default function ExploreScreen() {
  const { token } = useAuthSession()
  const webRef = useRef<WebView>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [markers, setMarkers] = useState<Marker[]>([])
  const [loading, setLoading] = useState(true)
  const [pokeChannel, setPokeChannel] = useState<PokeChannel | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [pokeRequest, setPokeRequest] = useState<PokeRequest | null>(null)

  useEffect(() => {
    let subscription: Location.LocationSubscription
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLoading(false)
        return
      }
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 5000, distanceInterval: 0 },
        async (loc) => {
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
          setUserLocation(coords)
          try {
            const nearbyDrivers: any[] = []
            const enriched: Marker[] = await Promise.all(
              nearbyDrivers.map(async (d: any) => {
                let car = null
                let trajet = null
                if (token?.current) {
                  try {
                    car = await CarService.getById(d.id, token.current)
                  } catch {}
                  try {
                    const res = await TrajetConducteurService.getByConducteurId(d.id, token.current)
                    trajet = await res.json()
                  } catch {}
                }
                return {
                  id: trajet?.id || d.id,
                  pointDepart: trajet?.pointDepart || "",
                  latDepart: trajet?.latDepart || 0,
                  lngDepart: trajet?.lngDepart || 0,
                  pointArrivee: trajet?.pointArrivee || "",
                  latArrivee: trajet?.latArrivee || 0,
                  lngArrivee: trajet?.lngArrivee || 0,
                  heureDepartEstimee: trajet?.heureDepartEstimee || "",
                  placesDisponibles: trajet?.placesDisponibles || 0,
                  statut: trajet?.statut || "",
                  carBrand: car?.brand || "",
                  carModel: car?.model || "",
                  carColor: car?.color || "",
                  carNbPlaces: car?.nbPlaces || 0,
                }
              })
            )
            setMarkers(enriched)
          } catch (e) {}
          setLoading(false)
        }
      )
    })()
    return () => {
      subscription && subscription.remove()
    }
  }, [token])

  const markersHTML = markers
    .map((m) => {
      const brandModel = m.carBrand && m.carModel ? `${m.carBrand} ${m.carModel}` : "Voiture inconnue"
      const color = m.carColor || ""
      const nbPlaces = m.carNbPlaces || ""
      const dispo = m.placesDisponibles ?? ""
      const depart = m.pointDepart || ""
      const arrivee = m.pointArrivee || ""
      const heure = m.heureDepartEstimee ? new Date(m.heureDepartEstimee).toLocaleString() : ""
      return `
        L.marker([${m.latDepart}, ${m.lngDepart}], { icon: bigIcon })
          .addTo(map)
          .bindPopup("<b>${brandModel}</b><br/>Couleur: ${color}<br/>Places: ${nbPlaces} (restantes: ${dispo})<br/>${depart} ➝ ${arrivee}<br/>Départ: ${heure}");
      `
    })
    .join('\n')

  const leafletHTML = userLocation
    ? `
  <html>
    <head>
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      <style>
        #map { height: 100%; width: 100%; margin:0; padding:0; }
        body { margin:0; }
        .leaflet-popup-content { font-size: 1.5em; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${userLocation.latitude}, ${userLocation.longitude}], 19);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        var bigIcon = L.icon({
          iconUrl: "https://unpkg.com/leaflet/dist/images/marker-icon.png",
          iconSize: [50, 82],
          iconAnchor: [25, 82],
          popupAnchor: [0, -82]
        });

        var userMarker = L.marker([${userLocation.latitude}, ${userLocation.longitude}], { icon: bigIcon })
          .addTo(map)
          .bindPopup("Vous", { className: "big-popup" })
          .openPopup();

        ${markersHTML}

        document.addEventListener('message', function(e) {
          try {
            var msg = JSON.parse(e.data);
            if (msg.type === 'recenter') {
              map.panTo(userMarker.getLatLng());
              userMarker.openPopup();
            }
            if (msg.type === 'draw-route') {
              var from = [msg.fromLat, msg.fromLng];
              var to = [msg.toLat, msg.toLng];
              var routeLine = L.polyline([from, to], { color: 'red', weight: 4 }).addTo(map);
              map.fitBounds(routeLine.getBounds());
              console.log("Ligne rouge tracée entre:", from, "et", to);
            }
          } catch (err) {
            console.error("Erreur draw-route:", err);
          }
        });
      </script>
    </body>
  </html>
`
    : ''

  const recenter = () => {
    if (!userLocation) return
    webRef.current?.postMessage(
      JSON.stringify({ type: 'recenter', lat: userLocation.latitude, lng: userLocation.longitude })
    )
  }

  return (
    <ThemedView style={styles.container}>
      {loading && <ActivityIndicator style={styles.loaderOverlay} size="large" />}
      {!loading && userLocation && (
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: leafletHTML }}
          style={styles.map}
        />
      )}
      {pokeRequest && (
        <TouchableOpacity
          style={styles.warningBtn}
          onPress={() => setShowPopup(true)}
        >
          <Ionicons name="warning-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {showPopup && (
          <View style={styles.popup}>
            <Text style={styles.popupText}>Demande de localisation reçue</Text>
            <View style={styles.popupActions}>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => {
                  if (pokeChannel && userLocation) {
                    const payload = {
                      type: "coords",
                      lat: userLocation.latitude,
                      lng: userLocation.longitude,
                    }
                    pokeChannel.send(JSON.stringify(payload))
                    if (pokeRequest && "lat" in pokeRequest && "lng" in pokeRequest) {
                      webRef.current?.postMessage(JSON.stringify({
                        type: "draw-route",
                        fromLat: userLocation.latitude,
                        fromLng: userLocation.longitude,
                        toLat: pokeRequest.lat,
                        toLng: pokeRequest.lng
                      }))
                    }
                  }
                  setShowPopup(false)
                  setPokeRequest(null)
                }}
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => {
                  setShowPopup(false)
                  setPokeRequest(null)
                  setPokeChannel(null)
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.pokeBtn}
          onPress={() => {
            console.log("[P2P] Bouton poke pressé → initialisation du canal P2P")

            const channel = new PokeChannel("driver", (payload) => {
              try {
                const parsed = JSON.parse(payload)
                if (parsed.type === "coords") {
                  setPokeRequest({ lat: parsed.lat, lng: parsed.lng })
                  if (userLocation) {
                    webRef.current?.postMessage(JSON.stringify({
                      type: "draw-route",
                      fromLat: parsed.lat,
                      fromLng: parsed.lng,
                      toLat: userLocation.latitude,
                      toLng: userLocation.longitude
                    }))
                  }
                } else if (payload === "poke-request") {
                  setShowPopup(true)
                  setPokeRequest({ from: "passenger" })
                }
              } catch (err) {
                console.error("[P2P] Erreur parsing côté conducteur:", err)
              }
            })

            setPokeChannel(channel)

            channel.send("poke-request")
            console.log("[P2P] Canal créé et message envoyé: poke-request")
          }}
        >
          <Ionicons name="hand-left-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
          <Ionicons name="locate-outline" size={28} color="#fff" />
        </TouchableOpacity>
        </ThemedView>
    )
}

const { width } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pokeBtn: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#FF2D55',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  warningBtn: {
    position: 'absolute',
    bottom: 140,
    right: 20,
    backgroundColor: '#FFA500',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  popup: {
    position: 'absolute',
    bottom: 200,
    right: 20,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    elevation: 6,
    flexDirection: 'row',
    gap: 12,
  },
  popupText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  popupActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flex: 1,
  },
  acceptBtn: {
    backgroundColor: '#4CAF50',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: '#FF2D55',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

