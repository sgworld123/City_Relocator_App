import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StyleSheet } from "react-native";
import { router } from "expo-router";

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

        // 3️⃣ Send to backend
        const response = await fetch("http://nami-hdya.onrender.com/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });


        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        console.log("📥 Raw response body:", text);
        const data = text ? JSON.parse(text) : null;

        const extracted =
          data?.results?.flatMap((item: any) =>
            item.recommended_places_near_current_city.map((place: any) => ({
              name: place.name,
              rating: place.rating ?? 0,
              address: place.address ?? "",
              drivingDistanceKm: place.driving_distance_from_current_city_km ?? 0,
              geminiSimilarity: place.similarity?.gemini_similarity ?? 0,
              similarity_score: place.similarity?.similarity_score ?? 0,
              distance_score: place.similarity?.distance_score ?? 0,
              latitude: place.coordinates?.lat ?? 0,
              longitude: place.coordinates?.lng ?? 0,
              density_score: place.similarity?.density_score ?? 0,
              resoning: place.similarity?.reasoning ?? {},
              pros: place.similarity?.pros ?? [],
              cons: place.similarity?.cons ?? [],
            }))
          ) ?? [];

        if (extracted.length === 0) {
          setError("No recommendations found. Please try again later.");
        }

        setPlaces(extracted);
      } catch (error: any) {
        console.error("Error:", error);
        // Show an alert so you can debug in production
        alert(`Error fetching data: ${error.message}`);
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
    <FlatList
      data={places}
      keyExtractor={(_, index) => index.toString()}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => {
        const similarity = getSimilarityPercentage(item);

        return (
          <View style={styles.card}>
            {/* IMAGE */}
            {/* <Image source={{ uri: item.image }} style={styles.image} /> */}

            {/* SCORE BADGE */}
            <View style={[styles.scoreBadge, { backgroundColor: similarity > 75 ? '#16a34a' : similarity > 50 ? '#eab308' : '#dc2626' }]}>
              <Text style={[styles.scoreText]}>
                {similarity}%
              </Text>
            </View>

            {/* CONTENT */}
            <View style={styles.content}>
              <Text style={styles.title}>{item.name}</Text>

              <Text style={styles.address}>{item.address}</Text>

              <View style={styles.metaRow}>
                <Text style={styles.rating}>Rating : {item.rating}⭐</Text>
                <Text style={styles.distance}>Distance : {item.drivingDistanceKm} km</Text>
              </View>

              {/* PROS / CONS */}
              <Text style={styles.prosConsText}>Pros and Cons</Text>
              <View style={styles.tagRow}>
                {item.pros.slice(0, 2).map((p: string, i: number) => (
                  <View key={i} style={styles.proTag}>
                    <Text style={styles.tagText}>{p}</Text>
                  </View>
                ))}
                {item.cons.slice(0, 1).map((c: string, i: number) => (
                  <View key={i} style={styles.conTag}>
                    <Text style={styles.tagText}>{c}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.finalRecommendation}>
                <Text style={styles.finalRecommendationText}>
                  Final AI Recommendation: {item.resoning}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  router.push({
                    pathname: '/',
                    params: {
                      mode: 'place',
                      lat: String(item.latitude) || '19.075983',
                      lng: String(item.longitude) || '72.877655',
                      returnTo: '/recommendations',
                    },
                  });
                }}
              >
                <Text style={styles.buttonText}>View on Map</Text>
              </TouchableOpacity>
            </View>
          </View>

        );
      }}
    />
  );

}

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
