import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StyleSheet } from "react-native";
import { router } from "expo-router";

// ─── Fallback dummy data (shown when server / GMaps API is unavailable) ────────
const FALLBACK_DATA = {
  results: [
    {
      name: "The Grand Spice Kitchen",
      type: "restaurant",
      rating: 4.5,
      address: "12 Flavor Lane, Downtown",
      coordinatesDto: { lat: 28.6139, lng: 77.209 },
    },
    {
      name: "Zen Brew Cafe",
      type: "cafe",
      rating: 4.3,
      address: "7 Brew Street, Midtown",
      coordinatesDto: { lat: 28.617, lng: 77.212 },
    },
    {
      name: "Urban Fitness Hub",
      type: "gym",
      rating: 4.7,
      address: "99 Wellness Ave, Northside",
      coordinatesDto: { lat: 28.621, lng: 77.205 },
    },
    {
      name: "Central Park Market",
      type: "grocery",
      rating: 4.1,
      address: "3 Market Square, West End",
      coordinatesDto: { lat: 28.609, lng: 77.198 },
    },
    {
      name: "Luminary Lounge",
      type: "bar",
      rating: 4.6,
      address: "21 Night Row, East Quarter",
      coordinatesDto: { lat: 28.615, lng: 77.22 },
    },
  ],
};

const getSimilarityPercentage = (item: any) => {
  // normalize all scores to 0–1 range
  const score =
    item.geminiSimilarity * 0.5 +
    (item.similarity_score / 100) * 0.2 +
    (1 - item.distance_score / 100) * 0.2 +
    (item.density_score / 100) * 0.1;

  const similarityPercentage = Math.min(
    Math.round(score * 100),
    100
  );
  return similarityPercentage;
};


export default function recommendations() {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    const prepareAndSendPayload = async () => {
      try {
        setLoading(true);
        setError(null);
        const [
          storedPrevCity,
          storedCurrCity,
          storedPlaces,
        ] = await Promise.all([
          AsyncStorage.getItem("previous_city"),
          AsyncStorage.getItem("current_city"),
          AsyncStorage.getItem("frequent-places"),
        ]);

        const prevCity = storedPrevCity ? JSON.parse(storedPrevCity) : null;
        const currCity = storedCurrCity ? JSON.parse(storedCurrCity) : null;
        const preferencePlaces = storedPlaces ? JSON.parse(storedPlaces) : [];

        // 2️⃣ Build payload (EXACT backend format)
        const payload = {
          previous_city: {
            name: prevCity?.name ?? "unknown",
            coordinates: {
              lat: prevCity?.coordinates?.lat ?? 0,
              lng: prevCity?.coordinates?.lng ?? 0,
            },
          },

          current_city: {
            name: currCity?.name ?? "unknown",
            coordinates: {
              lat: currCity?.coordinates?.lat ?? 0,
              lng: currCity?.coordinates?.lng ?? 0,
            },
          },

          source_places: preferencePlaces.map((p: any) => ({
            type: p.category?.toLowerCase() || "restaurant",
            name: p.name || "unknown",
            coordinates: {
              lat: p.latitude,
              lng: p.longitude,
            },
          })),
        };

        console.log("Sending payload:", JSON.stringify(payload, null, 2));

        // 3️⃣ Send to backend — retry once before falling back
        let response: Response | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch("https://city-relocator-app.onrender.com/api/relocate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(8000),
            });
            if (res.ok) { response = res; break; }
            console.warn(`Attempt ${attempt + 1}: HTTP ${res.status}`);
          } catch (err) {
            console.warn(`Attempt ${attempt + 1} failed:`, err);
          }
        }

        // 4️⃣ If both attempts failed — serve fallback dummy data
        let data: any;
        if (!response?.ok) {
          console.warn("Both attempts failed — using fallback data.");
          setUsedFallback(true);
          data = FALLBACK_DATA;
        } else {
          const text = await response.text();
          console.log("📥 Raw response body:", text);
          data = text ? JSON.parse(text) : null;
        }

        const extracted = data?.results?.map((place: any) => ({
            name: place.name,
            type: place.type,
            rating: place.rating ?? 0,
            address: place.address ?? "",
            latitude: place.coordinatesDto?.lat ?? 0,
            longitude: place.coordinatesDto?.lng ?? 0,
          })) ?? [];

          if (extracted.length === 0) {
            setError("No recommendations found. Please try again later.");
          }

          setPlaces(extracted);
      } catch (error: any) {
        console.error("Error:", error);
        setError("Failed to load recommendations. Please try again.");
      }
      finally {
        setLoading(false);
      }
    };
    prepareAndSendPayload();
  }, []);


  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Finding best places for you…</Text>
      </View>
    );
  }

  if (error) {
  return (
    <View style={styles.center}>
      <Text style={{ color: 'red', fontSize: 16 }}>{error}</Text>
      <TouchableOpacity onPress={() => router.back()} style={[styles.button, { marginTop: 20 }]}>
         <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

  return (
  <>
    {usedFallback && (
      <View style={styles.fallbackBanner}>
        <Text style={styles.fallbackIcon}>⚠️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.fallbackTitle}>Showing Sample Results</Text>
          <Text style={styles.fallbackSub}>
            Live data is unavailable (network timeout or Maps API issue). These are demonstration results only.
          </Text>
        </View>
      </View>
    )}
  <FlatList
    data={places}
    keyExtractor={(_, index) => index.toString()}
    contentContainerStyle={{ padding: 12 }}
    renderItem={({ item }) => (
      <View style={styles.card}>

        {/* TYPE BADGE */}
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{item.type}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.address}>{item.address}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.rating}>Rating: {item.rating} ⭐</Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              router.push({
                pathname: '/',
                params: {
                  mode: 'place',
                  lat: String(item.latitude),
                  lng: String(item.longitude),
                  returnTo: '/recommendations',
                },
              });
            }}
          >
            <Text style={styles.buttonText}>View on Map</Text>
          </TouchableOpacity>
        </View>

      </View>
    )}
  />
  </>
);}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  image: {
    height: 160,
    width: '100%',
  },

  scoreBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#0f766e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  scoreText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  content: {
    padding: 14,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#444',
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 7,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  rating: {
    fontSize: 13,
    color: '#444',
  },

  distance: {
    fontSize: 13,
    color: '#666',
  },

  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },

  proTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  conTag: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  tagText: {
    fontSize: 11,
    color: '#333',
  },

  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  prosConsText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  address: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },
  fallbackBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    margin: 12,
    marginBottom: 0,
    padding: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 10,
  },
  fallbackIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  fallbackTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 2,
  },
  fallbackSub: {
    fontSize: 12,
    color: "#B45309",
    lineHeight: 17,
  },
  finalRecommendation: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },

  finalRecommendationText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },

});