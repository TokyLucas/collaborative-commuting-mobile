import { ThemedView } from '@/components/ThemedView'
import { useAuthSession } from '@/providers/AuthProvider'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { WebView } from 'react-native-webview'
import LocationChannel from '../../../services/LocationChannel'

export default function ExploreScreen() {
  const { token, user } = useAuthSession()
  const webRef = useRef<WebView>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [disponibilite, setDisponibilite] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trajetEnRoute, setTrajetEnRoute] = useState<any | null>(null)

  const channelRef = useRef(LocationChannel())
  const channel = channelRef.current
  
  const [ready, setReady] = useState(false)
  useEffect(() => {
    channel.setOnReady(setReady)
    channel.connect()
    return () => channel.close()
  }, [channel])

  useEffect(() => {
    const fetchDisponibilite = async () => {
      if (token?.current && user?.current) {
        try {
          const res = await fetch(
            `${process.env.EXPO_PUBLIC_API_BASEURL}/api/disponibilites/conducteur/${user.current}`,
            { headers: { Authorization: `Bearer ${token.current}` } }
          )
          if (res.ok) {
            const dispo = await res.json()
            setDisponibilite(dispo)
          }
        } catch (e) {
          console.error("Erreur réseau GET disponibilite:", e)
        }
      }
    }
    fetchDisponibilite()
  }, [token, user, trajetEnRoute])

  useEffect(() => {
    let subscription: Location.LocationSubscription
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          setError("Permission de localisation refusée")
          setLoading(false)
          return
        }
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Highest, timeInterval: 1000, distanceInterval: 0 },
          async (loc) => {
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
            setUserLocation(coords)
            if (token?.current && user?.current) {
              try {
                const res = await fetch(
                  `${process.env.EXPO_PUBLIC_API_BASEURL}/api/disponibilites/conducteur/${user.current}`,
                  { headers: { Authorization: `Bearer ${token.current}` } }
                )
                if (res.ok) {
                  setDisponibilite(await res.json())
                } else if (res.status === 404) {
                  setDisponibilite(null)
                } else {
                  const text = await res.text()
                  console.error("Erreur GET dispo:", res.status, text)
                  setError("Impossible de récupérer la disponibilité")
                }
              } catch (e) {
                console.error("Erreur réseau GET dispo:", e)
                setError("Erreur réseau")
              }
            }
            setLoading(false)
          }
        )
      } catch (e) {
        console.error("Erreur init localisation:", e)
        setError("Erreur de localisation")
        setLoading(false)
      }
    })()
    return () => {
      subscription && subscription.remove()
    }
  }, [token, user])

  useEffect(() => {
    const fetchTrajet = async () => {
      if (token?.current && user?.current) {
        try {
          const res = await fetch(
            `${process.env.EXPO_PUBLIC_API_BASEURL}/api/trajetC/conducteur/${user.current}`,
            { headers: { Authorization: `Bearer ${token.current}` } }
          )
          if (res.ok) {
            const data = await res.json()
            const enRoute = Array.isArray(data) ? data.find((t) => t.statut === "EN_ROUTE") : null
            if (enRoute) {
              const trajet = {
                id: enRoute.id,
                latArrivee: enRoute.latArrivee,
                lngArrivee: enRoute.lngArrivee,
                placesDisponibles: enRoute.placesDisponibles,
              }
              setTrajetEnRoute(trajet)
            } else {
              setTrajetEnRoute(null)
            }
          } else {
            setTrajetEnRoute(null)
          }
        } catch (e) {
          console.error("Erreur réseau GET trajet:", e)
          setError("Erreur réseau")
        }
      }
    }
    fetchTrajet()
  }, [token, user])

  const leafletHTML = userLocation && trajetEnRoute
    ? `
  <html>
    <head>
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      <style>
        #map { height: 100%; width: 100%; margin:0; padding:0; }
        body { margin:0; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        window.map = L.map('map').setView([${userLocation.latitude}, ${userLocation.longitude}], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
          attribution: '&copy; OSM contributors, OSM France',
          subdomains: 'abc',
          maxZoom: 20
        }).addTo(window.map);
        var bigIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet/dist/images/marker-icon.png',
          iconSize: [75, 123],
          iconAnchor: [37, 122],
          popupAnchor: [0, -122]
        });
        L.marker([${userLocation.latitude}, ${userLocation.longitude}], { icon: bigIcon })
          .addTo(window.map).bindPopup("<b>Vous</b>").openPopup();
        L.marker([${trajetEnRoute.latArrivee}, ${trajetEnRoute.lngArrivee}])
          .addTo(window.map).bindPopup("<b>Arrivée</b>");
      </script>
    </body>
  </html>
  `
    : ''

  const recenter = () => {
    if (!userLocation || !webRef.current) return
    const js = `
      if (window.map) {
        window.map.setView([${userLocation.latitude}, ${userLocation.longitude}], window.map.getZoom());
        if (window.userMarker) { window.userMarker.setLatLng([${userLocation.latitude}, ${userLocation.longitude}]); }
      }
      true;
    `
    webRef.current.injectJavaScript(js)
  }

  const toggleDisponibilite = async () => {
    if (!userLocation || !token?.current || !user?.current) return
    try {
      const check = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASEURL}/api/disponibilites/conducteur/${user.current}`,
        { headers: { Authorization: `Bearer ${token.current}` } }
      )
      if (check.ok) {
        const existing = await check.json()
        setDisponibilite(existing)
        const newStatut = existing.statut === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE"
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASEURL}/api/disponibilites/statut/${user.current}?statut=${newStatut}`,
          { method: "PUT", headers: { Authorization: `Bearer ${token.current}` } }
        )
        if (res.ok) {
          setDisponibilite(await res.json())
        }
      } else if (check.status === 404) {
        const body = {
          conducteurId: user.current,
          position: { type: "Point", coordinates: [userLocation.longitude, userLocation.latitude] },
          statut: "AVAILABLE"
        }
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASEURL}/api/disponibilites`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.current}` },
          body: JSON.stringify(body)
        })
        if (res.ok) {
          setDisponibilite(await res.json())
        }
      }
    } catch (e) {
      console.error("Erreur toggleDisponibilite:", e)
    }
  }

  const updatePosition = async () => {
    if (!userLocation || !disponibilite || !token?.current || !user?.current) return
    try {
      const body = {
        conducteurId: user.current,
        position: { type: "Point", coordinates: [userLocation.longitude, userLocation.latitude] },
        statut: disponibilite.statut
      }
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASEURL}/api/disponibilites/position/${user.current}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.current}` },
          body: JSON.stringify(body)
        }
      )
      if (res.ok) {
        setDisponibilite(await res.json())
      }
    } catch (e) {
      console.error("Erreur update position:", e)
    }
  }

  return (
    <ThemedView style={styles.container}>
      {loading && <ActivityIndicator style={styles.loaderOverlay} size="large" />}
      {error && <Text style={{ color: "red", textAlign: "center" }}>{error}</Text>}
  
      {!loading && userLocation && leafletHTML ? (
        <WebView ref={webRef} originWhitelist={['*']} source={{ html: leafletHTML }} style={styles.map} />
      ) : (
        !loading && <Text style={{ textAlign: 'center', marginTop: 20 }}>Chargement de la carte...</Text>
      )}
  
      <View style={styles.bottomPanel}>
        {disponibilite && (
          <Text style={styles.statusText}>
            Statut actuel : {disponibilite.statut === "AVAILABLE" ? "Disponible" : "Indisponible"}
          </Text>
        )}
  
        {trajetEnRoute && (
          <Text style={styles.statusText}>
            Places disponibles : {trajetEnRoute.placesDisponibles}
          </Text>
        )}
  
        <View style={styles.actionsRow}>
          <View style={styles.btnWrapper}>
            <TouchableOpacity style={styles.toggleBtn} onPress={toggleDisponibilite}>
              <Ionicons name="power-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.btnLabel}>Actif</Text>
          </View>

          <View style={styles.btnWrapper}>
            <TouchableOpacity style={styles.updateBtn} onPress={updatePosition}>
              <Ionicons name="refresh-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.btnLabel}>Maj</Text>
          </View>

          <View style={styles.btnWrapper}>
            <TouchableOpacity style={[styles.requestBtn, !ready && { opacity: 0.5 }]}
              onPress={() => ready && channel.requestLocation()}
              disabled={!ready}>
              <Ionicons name="navigate-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.btnLabel}>Demander</Text>
          </View>

          <View style={styles.btnWrapper}>
            <TouchableOpacity style={[styles.sendBtn, !ready && { opacity: 0.5 }]}
              onPress={() => {
                if (ready && disponibilite?.position?.coordinates) {
                  const [lng, lat] = disponibilite.position.coordinates
                  channel.sendLocation(lat, lng)
                }
              }}
              disabled={!ready}>
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

  
        {!disponibilite && (
          <View style={styles.btnWrapper}>
            <TouchableOpacity style={styles.initBtn} onPress={toggleDisponibilite}>
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.btnLabel}>Initier</Text>
          </View>
        )}
      </View>
    </ThemedView>
  )
  
}

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
  statusText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
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
  toggleBtn: {
    backgroundColor: '#27AE60',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateBtn: {
    backgroundColor: '#1ABC9C',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestBtn: {
    backgroundColor: '#58D68D',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 1,
  },
  sendBtn: {
    backgroundColor: '#28B463',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 1,
  },
  recenterBtn: {
    backgroundColor: '#2ECC71',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initBtn: {
    backgroundColor: '#28B463',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignSelf: 'center',
    marginTop: 10,
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
