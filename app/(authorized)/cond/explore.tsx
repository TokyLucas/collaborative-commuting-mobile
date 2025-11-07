import { ThemedView } from '@/components/ThemedView'
import { useAuthSession } from '@/providers/AuthProvider'
import { PokeChannel } from '@/services/PokeChannel'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { WebView } from 'react-native-webview'

export default function ExploreScreen() {
  const { token, user } = useAuthSession()
  const webRef = useRef<WebView>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [disponibilite, setDisponibilite] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pokeChannel, setPokeChannel] = useState<PokeChannel | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [trajetEnRoute, setTrajetEnRoute] = useState<any | null>(null)


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

  type PokeRequest =
  | { from: string }
  | { lat: number; lng: number }

  const [pokeRequest, setPokeRequest] = useState<PokeRequest | null>(null)


  useEffect(() => {
    let subscription: Location.LocationSubscription
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        console.log("Permission status:", status);
        if (status !== 'granted') {
          setError("Permission de localisation refusée")
          setLoading(false)
          return
        }
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Highest, timeInterval: 1000, distanceInterval: 0 },
          async (loc) => {
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
            setUserLocation(coords);

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
            
              console.log(
                "Trajet EN_ROUTE:",
                "ID =", trajet.id,
                "| Places =", trajet.placesDisponibles,
                "| Arrivée =", trajet.latArrivee, trajet.lngArrivee
              )
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
        console.log("Init map avec userLocation:", ${userLocation.latitude}, ${userLocation.longitude});
        console.log("Trajet arrivée:", ${trajetEnRoute.latArrivee}, ${trajetEnRoute.lngArrivee});

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

        const url = "https://graphhopper.com/api/1/route?point=${userLocation.latitude},${userLocation.longitude}&point=${trajetEnRoute.latArrivee},${trajetEnRoute.lngArrivee}&vehicle=car&locale=fr&points_encoded=false&key=786c49d3-b386-4554-a770-218b01fc6fbe";
        console.log("Appel GraphHopper URL:", url);

        fetch(url)
          .then(res => {
            console.log("Réponse brute status:", res.status);
            return res.json();
          })
          .then(data => {
            console.log("Réponse JSON complète:", data);

            if (data.paths && data.paths.length > 0) {
              var geojson = data.paths[0].points;
              console.log("GeoJSON points:", geojson);

              if (geojson && geojson.coordinates) {
                console.log("Nombre de coordonnées:", geojson.coordinates.length);
                var coords = geojson.coordinates.map(c => [c[1], c[0]]);
                console.log("Coords converties pour Leaflet:", coords.slice(0,10)); // affiche les 10 premières

                var routeLine = L.polyline(coords, { color: 'blue', weight: 5 }).addTo(window.map);
                console.log("Polyline ajouté:", routeLine);

                window.map.fitBounds(routeLine.getBounds());
                console.log("Map recadrée sur la route");
              } else {
                console.error("Pas de coordonnées dans geojson:", geojson);
              }
            } else {
              console.error("Pas de route trouvée:", data);
            }
          })
          .catch(err => console.error("Erreur GraphHopper:", err));

        document.addEventListener('message', function(e) {
          try {
            var msg = JSON.parse(e.data);
            if (msg.type === 'draw-route') {
              var from = [msg.fromLat, msg.fromLng];
              var to = [msg.toLat, msg.toLng];
              var routeLine = L.polyline([from, to], { color: 'red', weight: 4 }).addTo(window.map);
              window.map.fitBounds(routeLine.getBounds());
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
  : '';


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
          Statut actuel : {disponibilite.statut === "AVAILABLE" ? "Disponible" : "Indisponible"}{"\n"}
        </Text>
      )}

      {trajetEnRoute && (
        <Text style={styles.statusText}>
          Places disponibles : {trajetEnRoute.placesDisponibles}
        </Text>
      )}


      {pokeRequest && (
        <TouchableOpacity style={styles.warningBtn} onPress={() => setShowPopup(true)}>
          <Ionicons name="warning-outline" size={28} color="#fff" />
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
                console.log("[P2P] Conducteur accepte → envoi coords:", payload)
                pokeChannel.send(JSON.stringify(payload))

                // trace la ligne rouge si pokeRequest contient des coords
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
                console.log("[P2P] Conducteur refuse → fermeture canal")
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


        <View style={styles.actionsRow}>
          {disponibilite && (
            <TouchableOpacity style={styles.toggleBtn} onPress={toggleDisponibilite}>
              <Text style={styles.dispoBtnText}>
                {disponibilite.statut === "AVAILABLE" ? "Rendre inactif" : "Rendre actif"}
              </Text>
            </TouchableOpacity>
          )}

          {disponibilite && (
            <TouchableOpacity style={styles.updateBtn} onPress={updatePosition}>
              <Text style={styles.dispoBtnText}>Mettre à jour</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.pokeBtn}
            onPress={() => {
              console.log("[P2P] Bouton poke pressé → initialisation du canal P2P")

              const channel = new PokeChannel("driver", (payload) => {
                console.log("[P2P] Message brut reçu côté conducteur:", payload)
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
            <Ionicons name="locate-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {!disponibilite && (
          <TouchableOpacity style={styles.initBtn} onPress={toggleDisponibilite}>
            <Text style={styles.dispoBtnText}>Initier une disponibilité</Text>
          </TouchableOpacity>
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
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  statusText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleBtn: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  updateBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  pokeBtn: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  recenterBtn: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initBtn: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    alignSelf: 'center',
    marginTop: 8,
  },
  dispoBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#FF3B30',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  popup: {
    position: 'absolute',
    top: '40%',
    left: '10%',
    right: '10%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 6,
  },
  popupText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  popupActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  acceptBtn: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 24,
  },
  rejectBtn: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 24,
  },

})

