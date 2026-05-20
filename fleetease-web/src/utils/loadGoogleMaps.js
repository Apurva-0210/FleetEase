import { GOOGLE_MAPS_API_KEY } from '../config/env';

export const loadGoogleMaps = (apiKey) => {
  return new Promise((resolve) => {
    if (!apiKey) {
      console.warn('Google Maps API key missing');
      resolve(null);
      return;
    }

    if (window.google && window.google.maps) {
      resolve(window.google.maps);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      resolve(window.google.maps);
    };
    script.onerror = () => {
      console.error('Error loading Google Maps API');
      resolve(null);
    };
    document.head.appendChild(script);
  });
};

export const loadGoogleMapsPlaces = async () => {
  const maps = await loadGoogleMaps(GOOGLE_MAPS_API_KEY);
  if (!maps || !(window.google && window.google.maps && window.google.maps.places)) {
    throw new Error('Google Maps Places library not available');
  }
  return maps;
};

export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          reject(error);
        }
      );
    }
  });
};
