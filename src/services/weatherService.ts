// CLASSIUM WEATHER INTEGRATION SERVICE
// Integrates with Open-Meteo Free API (External Meteorological Provider)
// Note: As specified in Phase 2, this is an external weather API and NOT stored in Supabase.

interface WeatherData {
  city: string;
  temp: number;
  description: string;
  source: string;
}

const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'sao paulo': { lat: -23.5505, lon: -46.6333 },
  'são paulo': { lat: -23.5505, lon: -46.6333 },
  'contagem': { lat: -19.9317, lon: -44.0536 },
  'belo horizonte': { lat: -19.9167, lon: -43.9345 },
  'rio de janeiro': { lat: -22.9068, lon: -43.1729 },
  'brasilia': { lat: -15.7975, lon: -47.8919 },
  'brasília': { lat: -15.7975, lon: -47.8919 },
  'curitiba': { lat: -25.4284, lon: -49.2733 },
  'salvador': { lat: -12.9777, lon: -38.5016 },
  'fortaleza': { lat: -3.7319, lon: -38.5267 },
  'recife': { lat: -8.0476, lon: -34.8770 },
  'porto alegre': { lat: -30.0346, lon: -51.2177 }
};

const cache = new Map<string, { data: WeatherData; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

function mapWeatherCode(code: number): string {
  switch (code) {
    case 0:
      return 'Ensolarado';
    case 1:
      return 'Céu Limpo';
    case 2:
      return 'Parcialmente Nublado';
    case 3:
      return 'Nublado';
    case 45:
    case 48:
      return 'Nevoeiro';
    case 51:
    case 53:
    case 55:
      return 'Garoa Leve';
    case 61:
    case 63:
    case 65:
      return 'Chuvoso';
    case 80:
    case 81:
    case 82:
      return 'Pancadas de Chuva';
    case 95:
    case 96:
    case 99:
      return 'Tempestade';
    default:
      return 'Tempo Estável';
  }
}

export async function fetchLiveWeather(city: string = 'São Paulo'): Promise<WeatherData> {
  const normalizedCity = (city || 'São Paulo').trim().toLowerCase();

  // Check cache
  const cached = cache.get(normalizedCity);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let coords = CITY_COORDINATES[normalizedCity];

  // If coordinates not pre-mapped, try Open-Meteo Geocoding API
  if (!coords) {
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          coords = {
            lat: geoData.results[0].latitude,
            lon: geoData.results[0].longitude
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  // Fallback coords to São Paulo if lookup failed
  if (!coords) {
    coords = { lat: -23.5505, lon: -46.6333 };
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`
    );
    if (!res.ok) throw new Error('Falha ao consultar API Open-Meteo');

    const json = await res.json();
    const current = json.current_weather;
    const temp = Math.round(current?.temperature ?? 22);
    const desc = mapWeatherCode(current?.weathercode ?? 0);

    const result: WeatherData = {
      city: city || 'São Paulo',
      temp,
      description: desc,
      source: 'Open-Meteo API'
    };

    cache.set(normalizedCity, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn('[WeatherService] Falha ao carregar clima externo via Open-Meteo:', err);
    return {
      city: city || 'São Paulo',
      temp: 22,
      description: 'Clima Indisponível',
      source: 'Open-Meteo API (Offline)'
    };
  }
}
