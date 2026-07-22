const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let googleMapsPromise = null;

export const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const isValidLngLat = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return false;

  const lng = toNumber(coords[0]);
  const lat = toNumber(coords[1]);

  if (lng === null || lat === null) return false;
  if (lng === 0 && lat === 0) return false;
  if (lng < -180 || lng > 180) return false;
  if (lat < -90 || lat > 90) return false;

  return true;
};

export const makePointLocation = (lng, lat) => ({
  type: "Point",
  coordinates: [Number(lng), Number(lat)],
});

/**
 * Improved browser location:
 * - enableHighAccuracy true
 * - multiple readings leta hai
 * - best accuracy wali location return karta hai
 */
export const getBrowserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser geolocation is not supported."));
      return;
    }

    let bestPosition = null;
    let watchId = null;
    let completed = false;

    const finish = () => {
      if (completed) return;
      completed = true;

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      if (!bestPosition) {
        reject(new Error("Unable to get current location."));
        return;
      }

      const { latitude, longitude, accuracy } = bestPosition.coords;

      const finalCoords = {
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy: Number(accuracy || 0),
      };

      console.log("PHARMACY BEST GPS COORDS =>", finalCoords);

      resolve(finalCoords);
    };

    const saveBestPosition = (position) => {
      if (!position?.coords) return;

      const accuracy = Number(position.coords.accuracy || 999999);

      if (
        !bestPosition ||
        accuracy < Number(bestPosition.coords.accuracy || 999999)
      ) {
        bestPosition = position;
      }

      // Agar location kaafi accurate ho jaye to immediately finish
      if (accuracy <= 50) {
        finish();
      }
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        saveBestPosition(position);
      },
      (error) => {
        console.log("Initial geolocation error:", error.message);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        saveBestPosition(position);
      },
      (error) => {
        console.log("Watch geolocation error:", error.message);

        if (!bestPosition && !completed) {
          reject(error);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );

    // 8 seconds tak best reading ka wait karo
    setTimeout(() => {
      finish();
    }, 8000);
  });
};

export const loadGoogleMaps = () => {
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(
      new Error("VITE_GOOGLE_MAPS_API_KEY is missing in frontend .env")
    );
  }

  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      "script[data-google-maps='true']"
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google));
      existingScript.addEventListener("error", () =>
        reject(new Error("Google Maps script failed to load"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY
    )}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";

    script.onload = () => resolve(window.google);
    script.onerror = () =>
      reject(new Error("Google Maps script failed to load"));

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

export const reverseGeocodeCoords = async ({ latitude, longitude }) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Invalid coordinates for reverse geocoding.");
  }

  try {
    const google = await loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();

    const result = await geocoder.geocode({ location: { lat, lng } });
    const first = result?.results?.[0];

    if (first?.formatted_address) return first.formatted_address;
  } catch (error) {
    console.log("Google reverse geocode failed:", error.message);
  }

  try {
    const bigDataUrl =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${lat}&longitude=${lng}&localityLanguage=en`;

    const res = await fetch(bigDataUrl);
    const data = await res.json();

    const parts = [
      data?.locality,
      data?.city,
      data?.principalSubdivision,
      data?.countryName,
    ].filter(Boolean);

    if (parts.length > 0) return [...new Set(parts)].join(", ");
  } catch (error) {
    console.log("BigDataCloud reverse geocode failed:", error.message);
  }

  return "Address not available";
};

export const geocodeAddress = async (address) => {
  const safeAddress = String(address || "").trim();
  if (!safeAddress) throw new Error("Address is required.");

  const google = await loadGoogleMaps();
  const geocoder = new google.maps.Geocoder();

  const result = await geocoder.geocode({
    address: safeAddress,
    componentRestrictions: { country: "PK" },
  });

  const first = result?.results?.[0];
  const loc = first?.geometry?.location;

  if (!loc) throw new Error("Could not find coordinates for this address.");

  const lat = loc.lat();
  const lng = loc.lng();

  return {
    address: first.formatted_address || safeAddress,
    latitude: lat,
    longitude: lng,
    location: makePointLocation(lng, lat),
  };
};

export const getPlaceSuggestions = async (input) => {
  const text = String(input || "").trim();
  if (text.length < 2) return [];

  const google = await loadGoogleMaps();
  const service = new google.maps.places.AutocompleteService();

  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input: text,
        componentRestrictions: { country: "pk" },
        types: ["geocode"],
      },
      (predictions, status) => {
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !predictions
        ) {
          resolve([]);
          return;
        }

        resolve(
          predictions.map((p) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || "",
          }))
        );
      }
    );
  });
};

export const getPlaceDetails = async (placeId) => {
  if (!placeId) throw new Error("placeId is required.");

  const google = await loadGoogleMaps();
  const container = document.createElement("div");
  const service = new google.maps.places.PlacesService(container);

  return new Promise((resolve, reject) => {
    service.getDetails(
      {
        placeId,
        fields: ["formatted_address", "geometry", "name"],
      },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          reject(new Error("Could not fetch selected place details."));
          return;
        }

        const loc = place.geometry?.location;
        if (!loc) {
          reject(new Error("Selected place has no coordinates."));
          return;
        }

        const lat = loc.lat();
        const lng = loc.lng();

        resolve({
          address: place.formatted_address || place.name || "Selected location",
          latitude: lat,
          longitude: lng,
          location: makePointLocation(lng, lat),
        });
      }
    );
  });
};