import * as Location from "expo-location";

export const getCityFromCoord = async (latitude : number, longitude : number) => {
  try {
    const address = await Location.reverseGeocodeAsync({
      latitude,
      longitude
    });
    return address[0].city || "Unknown City";
  } catch (error) {
    console.error("Error fetching city:", error);
    return "Unknown City";
  }
}