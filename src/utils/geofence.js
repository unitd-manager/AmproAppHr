let OFFICE_LAT;
let OFFICE_LNG;
let GEOFENCE_RADIUS;

export function setGeofenceValues(lat, lng, radius) {
  OFFICE_LAT = lat;
  OFFICE_LNG = lng;
  GEOFENCE_RADIUS = radius;
}

// Function to fetch geofence data from API
export async function fetchGeofenceData() {
  try {
    const response = await fetch('http://66.29.149.122:2001/api/geofence'); // Replace with your actual API endpoint
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Geofence API Response:", result);

    // ✅ Fix: extract from result.data
    const { latitude, longitude, radius } = result.data;

    setGeofenceValues(latitude, longitude, radius);

    return { latitude, longitude, radius };
  } catch (error) {
    console.error("Error fetching geofence data:", error);
    Alert.alert(
      "Network Error",
      "Failed to connect to geofence API. Please check your internet connection."
    );
    return null;
  }
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

export function isInsideGeofence(lat, lng, officeLat, officeLng, geofenceRadius) {
  if (!officeLat || !officeLng || !geofenceRadius) {
    console.log("Geofence data missing:", { officeLat, officeLng, geofenceRadius });
    return false;
  }

  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat - officeLat);
  const dLng = toRad(lng - officeLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(officeLat)) *
      Math.cos(toRad(lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  console.log("Geofence Center (Lat, Lng, Radius):", officeLat, officeLng, geofenceRadius);
  console.log("Calculated Distance:", distance);

  return distance <= geofenceRadius;
}
