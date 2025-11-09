import { ThemedView } from '@/components/ThemedView'
import { useAuthSession } from '@/providers/AuthProvider'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { WebView } from 'react-native-webview'
import CarService from '../../../services/CarService'
import LocationChannel from '../../../services/LocationChannel'
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
  const [disponibilite, setDisponibilite] = useState<any | null>(null)
  const channelRef = useRef(LocationChannel())
  const channel = channelRef.current
  
  const [ready, setReady] = useState(false)
  useEffect(() => {
    channel.setOnReady(setReady)
    channel.setOnCoords((lat: number, lng: number) => {
      if (userLocation && webRef.current) {
        webRef.current.postMessage(JSON.stringify({
          type: 'draw-route',
          fromLat: userLocation.latitude,
          fromLng: userLocation.longitude,
          toLat: lat,
          toLng: lng,
        }))
      }
    })
    channel.connect()
    return () => channel.close()
  }, [channel, userLocation])
    


  useEffect(() => {
    let subscription: Location.LocationSubscription
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLoading(false)
        return
      }
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 1000, distanceInterval: 0 },
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
            console.error("Erreur message handler:", err);
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
  
      {!loading && userLocation && leafletHTML ? (
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: leafletHTML }}
          style={styles.map}
        />
      ) : (
        !loading && <Text style={{ textAlign: 'center', marginTop: 20 }}>Chargement de la carte...</Text>
      )}
  
      <View style={styles.bottomPanel}>
      <View style={styles.actionsRow}>
        <View style={styles.btnWrapper}>
          <TouchableOpacity
            style={[styles.requestBtn, !ready && { opacity: 0.5 }]}
            // Demander: envoie une requête seulement si le dataChannel est prêt
            onPress={() => {
              if (!ready) return
              channel.requestLocation()
            }}
            disabled={!ready}
          >
            <Ionicons name="navigate-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.btnLabel}>Demander</Text>
        </View>

        <View style={styles.btnWrapper}>
          <TouchableOpacity
            style={[styles.sendBtn, !ready && { opacity: 0.5 }]}
            onPress={async () => {
              if (!ready) return
              try {
                const { status } = await Location.requestForegroundPermissionsAsync()
                if (status !== 'granted') {
                  console.warn('[WARN] Permission de localisation refusée')
                  return
                }
                const loc = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Highest,
                })
                const lat = loc.coords.latitude
                const lng = loc.coords.longitude
                channel.sendLocation(lat, lng)
              } catch (e) {
                console.error('Erreur getCurrentPositionAsync:', e)
              }
            }}
            disabled={!ready}
          >
            <Ionicons name="send-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.btnLabel}>Envoyer</Text>
        </View>

        <View style={styles.btnWrapper}>
          <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
            <Ionicons name="locate-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.btnLabel}>Centre</Text>
        </View>
      </View>

      </View>
    </ThemedView>
  )
  
}

const { width } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: 6,
  },
  btnWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  btnLabel: {
    fontSize: 12,
    color: '#2ECC71',
    textAlign: 'center',
    lineHeight: 14,
  },
  requestBtn: {
    backgroundColor: '#58D68D',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    backgroundColor: '#28B463',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recenterBtn: {
    backgroundColor: '#2ECC71',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
