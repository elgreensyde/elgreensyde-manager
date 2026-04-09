import supabase from '../lib/supabase';

/**
 * Weather Service for Elgreensyde Farm
 * Specifically calibrated for Valencia City, Bukidnon (7.9059, 125.0936)
 */

const LAT = 7.9059;
const LON = 125.0936;
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 Hours

// WMO Weather interpretation codes (WW)
// https://open-meteo.com/en/docs
const WEATHER_ICONS = {
  0: { label: 'Clear Sky', icon: 'Sun', color: '#f39c12' },
  1: { label: 'Mainly Clear', icon: 'Sun', color: '#f39c12' },
  2: { label: 'Partly Cloudy', icon: 'CloudSun', color: '#3498db' },
  3: { label: 'Overcast', icon: 'Cloud', color: '#7f8c8d' },
  45: { label: 'Foggy', icon: 'CloudFog', color: '#95a5a6' },
  48: { label: 'Rime Fog', icon: 'CloudFog', color: '#95a5a6' },
  51: { label: 'Light Drizzle', icon: 'CloudDrizzle', color: '#3498db' },
  53: { label: 'Drizzle', icon: 'CloudDrizzle', color: '#3498db' },
  55: { label: 'Heavy Drizzle', icon: 'CloudDrizzle', color: '#3498db' },
  61: { label: 'Light Rain', icon: 'CloudRain', color: '#2980b9' },
  63: { label: 'Rain', icon: 'CloudRain', color: '#2980b9' },
  65: { label: 'Heavy Rain', icon: 'CloudRain', color: '#2c3e50' },
  71: { label: 'Light Snow', icon: 'CloudSnow', color: '#ecf0f1' },
  80: { label: 'Rain Showers', icon: 'CloudRain', color: '#3498db' },
  95: { label: 'Thunderstorm', icon: 'CloudLightning', color: '#8e44ad' },
};

const weatherService = {
  async getForecast() {
    try {
      // 1. Check DB Cache first for cross-device consistency
      const { data: cache, error } = await supabase
        .from('weather_cache')
        .select('*')
        .eq('lat', LAT)
        .eq('lon', LON)
        .maybeSingle();

      if (cache && new Date(cache.expires_at) > new Date()) {
        console.log('Using cached weather data (Valencia City)');
        return cache.data;
      }

      // 2. Refresh from Open-Meteo if expired or missing
      console.log('Fetching fresh weather for Valencia City...');
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,relative_humidity_2m&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,relative_humidity_2m_max&timezone=Asia%2FManila`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather API unreachable');
      
      const rawData = await response.json();
      if (!rawData.daily) throw new Error('Invalid weather data format');

      const expiresAt = new Date(Date.now() + CACHE_DURATION_MS).toISOString();

      // 3. Force push to DB cache (save the entire rawObject to preserve both daily and hourly)
      await supabase.from('weather_cache').upsert({
        lat: LAT,
        lon: LON,
        data: rawData,
        updated_at: new Date().toISOString(),
        expires_at: expiresAt
      }, { onConflict: 'lat,lon' });

      return rawData.daily;
    } catch (err) {
      console.error('weatherService.getForecast():', err.message);
      // Fallback for offline or API issues
      return null;
    }
  },

  async getHourlyForecast() {
    try {
      const { data: cache } = await supabase.from('weather_cache').select('data').eq('lat', LAT).eq('lon', LON).maybeSingle();
      if (cache && cache.data && cache.data.hourly) return cache.data.hourly;
      
      // trigger fetch
      await this.getForecast();
      const { data: cache2 } = await supabase.from('weather_cache').select('data').eq('lat', LAT).eq('lon', LON).maybeSingle();
      return cache2?.data?.hourly || null;
    } catch(err) {
      console.error('getHourlyForecast error', err);
      return null;
    }
  },

  getWeatherInfo(code) {
    return WEATHER_ICONS[code] || { label: 'Unknown', icon: 'Cloud', color: '#7f8c8d' };
  },

  /**
   * Evaluates if a date is safe for a specific task 
   * @param {string} category - 'Harvest', 'Transplant', 'Sow', 'Fertilize', 'Pest/Disease'
   * @param {Object} dailyForecast - Forecast data for a specific day
   * @param {Object} crop - Full crop object for overrides
   */
  evaluateSafety(category, dailyForecast, crop = null) {
    if (!dailyForecast) return { safe: true, reason: 'No weather data' };

    const rainProb = dailyForecast.precipitation_probability_max || 0;
    const windSpeed = dailyForecast.windspeed_10m_max || 0;
    const tempMax = dailyForecast.temperature_2m_max || 0;
    const humMax = dailyForecast.relative_humidity_2m_max || 0;

    // 1. Crop-Specific Overrides (e.g. Pechay higher rain tolerance)
    const overrides = crop?.weather_thresholds || {};
    const rainThreshold = overrides.rain_threshold || 70;
    const tempThreshold = overrides.temp_threshold || 32;
    const humThreshold = overrides.hum_threshold || 85;
    const windThreshold = overrides.wind_threshold || 30;

    // 2. Conflict Checks
    
    // Rain Check (Universal vs Override)
    if (rainProb > rainThreshold) {
      return { 
        safe: false, 
        risk: 'Rain',
        severity: 'High',
        reason: `High rain probability (${rainProb}%) exceeds ${crop?.common_name || 'standard'} threshold (${rainThreshold}%).` 
      };
    }

    // Temperature Check (Transplant/Sow sensitivity)
    if ((category === 'Transplant' || category === 'Sow') && tempMax > tempThreshold) {
      return {
        safe: false, 
        risk: 'Heat',
        severity: 'Medium',
        reason: `High heat (${tempMax}°C) exceeds ${crop?.common_name || 'safe'} transplant threshold (${tempThreshold}°C).`
      };
    }

    // Humidity Check (Harvest disease risk)
    if (category === 'Harvest' && humMax > humThreshold) {
      return {
        safe: false, 
        risk: 'Humidity',
        severity: 'Medium',
        reason: `High humidity (${humMax}%) increases disease risk during harvest.`
      };
    }

    // Wind Check (Spray drift risk)
    if (category === 'Pest/Disease' && windSpeed > windThreshold) {
      return {
        safe: false,
        risk: 'Wind',
        severity: 'High',
        reason: `Wind speed (${windSpeed} km/h) exceeds safe spraying threshold (${windThreshold} km/h).`
      };
    }

    return { safe: true };
  },

  calculateVPD(tempC, humidityPct) {
    // SVP = Saturation Vapor Pressure in kPa
    const svp = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    // AVP = Actual Vapor Pressure
    const avp = svp * (humidityPct / 100);
    return Math.max(0, svp - avp).toFixed(2); // VPD in kPa
  },

  analyzeDiseaseRisk(hourlyData) {
    if (!hourlyData || !hourlyData.relative_humidity_2m) return { riskLevel: 'LOW', trigger: 'No Data' };
    
    let consecutiveHours = 0;
    const humidityArr = hourlyData.relative_humidity_2m;
    const tempArr = hourlyData.temperature_2m;

    for (let i = 0; i < humidityArr.length; i++) {
       const rh = humidityArr[i];
       const temp = tempArr ? tempArr[i] : null;

       // Formula: RH >= 85 for >7.5 hours (we use 8 hours). AND temp between 15 and 25
       if (rh >= 85 && (temp === null || (temp >= 15 && temp <= 25))) {
          consecutiveHours++;
          if (consecutiveHours >= 8) {
             return { riskLevel: 'CRITICAL', trigger: 'Prolonged Leaf Wetness (>85% RH for 8+ hrs)' };
          }
       } else {
          consecutiveHours = 0;
       }
    }

    return { riskLevel: 'LOW', trigger: 'Safe' };
  }
};

export default weatherService;
