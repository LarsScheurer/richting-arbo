import { Location } from '../types';
import { richtingLocatiesService } from '../services/firebase';

export const getGoogleMapsLink = (loc: Location) => {
  const query = encodeURIComponent(`${loc.address}, ${loc.city}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

export const geocodeAddress = async (address: string, city: string): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const fullAddress = `${address}, ${city}, Nederland`;
    // Gebruik een gratis geocoding service (Nominatim OpenStreetMap)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&countrycodes=nl`,
      {
        headers: {
          'User-Agent': 'Richting-Kennisbank/1.0 (contact@richting.nl)' // Vereist door Nominatim - specifiekere User-Agent
        }
      }
    );
    
    if (!response.ok) {
      console.warn('Geocoding service response niet OK:', response.status);
      // Probeer alleen met stad als fallback
      if (city) {
        const cityResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Nederland')}&limit=1&countrycodes=nl`,
          {
            headers: {
              'User-Agent': 'Richting-Kennisbank/1.0 (contact@richting.nl)'
            }
          }
        );
        if (cityResponse.ok) {
          const cityData = await cityResponse.json();
          if (cityData && cityData.length > 0) {
            return {
              latitude: parseFloat(cityData[0].lat),
              longitude: parseFloat(cityData[0].lon)
            };
          }
        }
      }
      return null;
    }
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
    
    // Fallback: probeer alleen met stad
    if (city) {
      const cityResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Nederland')}&limit=1&countrycodes=nl`,
        {
          headers: {
            'User-Agent': 'Richting-Kennisbank/1.0 (contact@richting.nl)'
          }
        }
      );
      if (cityResponse.ok) {
        const cityData = await cityResponse.json();
        if (cityData && cityData.length > 0) {
          return {
            latitude: parseFloat(cityData[0].lat),
            longitude: parseFloat(cityData[0].lon)
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// Haversine formule: bereken afstand tussen twee GPS coordinaten in kilometers
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Vind dichtstbijzijnde Richting locatie op basis van GPS coordinaten
export const findNearestRichtingLocation = async (
  latitude: number, 
  longitude: number
): Promise<{ id: string; naam: string; distance: number } | null> => {
  try {
    const allRichtingLocaties = await richtingLocatiesService.getAllLocaties();
    
    // Filter locaties met coordinaten
    const locatiesMetCoordinaten = allRichtingLocaties.filter(
      rl => rl.latitude !== undefined && rl.longitude !== undefined
    );
    
    if (locatiesMetCoordinaten.length === 0) {
      return null;
    }
    
    // Bereken afstand naar alle locaties en vind de dichtstbijzijnde
    let nearest: { id: string; naam: string; distance: number } | null = null;
    let minDistance = Infinity;
    
    for (const rl of locatiesMetCoordinaten) {
      if (rl.latitude && rl.longitude) {
        const distance = calculateDistance(latitude, longitude, rl.latitude, rl.longitude);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = {
            id: rl.id,
            naam: rl.vestiging,
            distance: Math.round(distance * 10) / 10 // Afronden op 1 decimaal
          };
        }
      }
    }
    
    return nearest;
  } catch (error) {
    console.error('Error finding nearest Richting location:', error);
    return null;
  }
};

