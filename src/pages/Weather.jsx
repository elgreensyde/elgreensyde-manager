import React, { useState, useEffect } from 'react';
import { CloudSun, CloudLightning, Droplets, ThermometerSun, Wind, AlertTriangle, ShieldCheck, Sun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow } from 'lucide-react';
import weatherService from '../services/weatherService';

// Map icon strings to actual React components
const IconMap = {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning
};

function Weather() {
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState(null);
  const [hourly, setHourly] = useState(null);
  const [diseaseRisk, setDiseaseRisk] = useState({ riskLevel: 'UNKNOWN', trigger: 'Loading...' });
  const [currentVpd, setCurrentVpd] = useState('0.00');
  const [currentTemp, setCurrentTemp] = useState('--');
  const [currentHum, setCurrentHum] = useState('--');

  useEffect(() => {
    async function loadWeather() {
      try {
        const [dailyData, hourlyData] = await Promise.all([
          weatherService.getForecast(),
          weatherService.getHourlyForecast()
        ]);
        
        setDaily(dailyData);
        setHourly(hourlyData);

        if (hourlyData) {
          // Calculate Disease Risk
          const risk = weatherService.analyzeDiseaseRisk(hourlyData);
          setDiseaseRisk(risk);

          // Get Current Conditions for VPD
          // OpenMeteo hourly.time is an array of ISO strings e.g. "2023-01-01T00:00"
          const now = new Date();
          let closestIdx = 0;
          let minDiff = Infinity;
          
          if (hourlyData.time && hourlyData.time.length > 0) {
            hourlyData.time.forEach((timeStr, idx) => {
              const diff = Math.abs(new Date(timeStr) - now);
              if (diff < minDiff) {
                minDiff = diff;
                closestIdx = idx;
              }
            });
            
            const temp = hourlyData.temperature_2m[closestIdx];
            const hum = hourlyData.relative_humidity_2m[closestIdx];
            setCurrentTemp(temp);
            setCurrentHum(hum);
            
            if (temp !== undefined && hum !== undefined) {
               setCurrentVpd(weatherService.calculateVPD(temp, hum));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load detailed weather", err);
      }
      setLoading(false);
    }
    loadWeather();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner mx-auto" />
      </div>
    );
  }

  const isCritical = diseaseRisk.riskLevel === 'CRITICAL';

  return (
    <div className="page-enter flex flex-col h-screen overflow-hidden">
      <div className="px-5 pt-6 pb-2 shrink-0 border-b border-white/5">
        <h1 className="text-2xl font-display font-bold text-themed-heading flex items-center gap-2">
          <CloudSun className="text-blue-500" /> Weather Intelligence
        </h1>
        <p className="text-sm mt-1 text-themed-muted">
          Agronomic conditions & disease thresholds
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        
        {/* TOP METRICS: Disease Risk & VPD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* VPD Monitor */}
          <div className="glass-card p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ThermometerSun size={64} />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Droplets size={16} className="text-blue-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-themed-muted">Transpiration Potential</h2>
            </div>
            <p className="text-3xl font-display font-bold text-blue-500 my-2">{currentVpd} <span className="text-sm font-normal text-themed-muted">kPa</span></p>
            <div className="flex items-center gap-4 text-xs font-mono text-themed-muted">
               <span>{currentTemp}°C Temp</span>
               <span>{currentHum}% RH</span>
            </div>
          </div>

          {/* Disease Risk Radar */}
          <div className={`glass-card p-5 rounded-2xl relative overflow-hidden border-2 ${isCritical ? 'border-red-500/50 bg-red-500/5' : 'border-emerald-500/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              {isCritical ? <AlertTriangle size={16} className="text-red-500" /> : <ShieldCheck size={16} className="text-emerald-500" />}
              <h2 className="text-xs font-bold uppercase tracking-wider text-themed-muted">Disease Risk Radar</h2>
            </div>
            <p className={`text-2xl font-display font-bold my-2 ${isCritical ? 'text-red-500' : 'text-emerald-500'}`}>
              {diseaseRisk.riskLevel}
            </p>
            <p className={`text-xs ${isCritical ? 'text-red-400 font-bold' : 'text-themed-muted'}`}>
              Trigger: {diseaseRisk.trigger}
            </p>
            {isCritical && (
              <div className="mt-3 inline-block bg-red-500 text-white text-[10px] font-bold uppercase px-2 py-1 rounded">
                Action: Scout beds immediately
              </div>
            )}
          </div>
        </div>

        {/* 7-DAY FORECAST GRID */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-themed-heading mb-4 flex items-center gap-2 mt-4">
            <CloudLightning size={16} className="text-amber-500" /> 7-Day Agronomic Forecast
          </h2>
          
          <div className="flex flex-col gap-3">
            {!daily ? (
               <div className="text-center p-4 text-themed-muted border border-dashed border-gray-600/40 rounded-xl">No forecast data</div>
            ) : daily.time.map((dateStr, i) => {
              const code = daily.weathercode[i];
              const desc = weatherService.getWeatherInfo(code);
              const IconComp = IconMap[desc.icon] || Cloud;
              
              const dateObj = new Date(dateStr);
              const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              
              const tMax = daily.temperature_2m_max[i];
              const tMin = daily.temperature_2m_min[i];
              const precip = daily.precipitation_probability_max[i];
              const wind = daily.windspeed_10m_max[i];

              return (
                <div key={dateStr} className="glass-card p-4 rounded-xl flex items-center justify-between transition-transform hover:scale-[1.01]">
                   {/* Left Col: Day and Icon */}
                   <div className="flex items-center gap-4 w-[40%]">
                      <div className="w-12 h-12 rounded-full bg-black/10 dark:bg-white/5 flex items-center justify-center shrink-0">
                         <IconComp size={24} style={{ color: desc.color }} />
                      </div>
                      <div>
                         <h3 className="font-bold text-themed-heading text-sm sm:text-base">{dayName}</h3>
                         <p className="text-[10px] sm:text-xs text-themed-muted pr-2">{desc.label}</p>
                      </div>
                   </div>

                   {/* Right Col: Metrics */}
                   <div className="flex items-center justify-end gap-3 sm:gap-6 w-[60%] border-l border-white/5 pl-4">
                      {/* Temp */}
                      <div className="flex flex-col w-12 text-right">
                         <span className="font-bold text-themed-heading text-sm">{Math.round(tMax)}°</span>
                         <span className="text-[10px] text-themed-muted">{Math.round(tMin)}°</span>
                      </div>
                      
                      {/* Rain */}
                      <div className="flex flex-col items-center w-12">
                         <Droplets size={14} className={precip > 50 ? 'text-blue-500' : 'text-gray-400'} />
                         <span className={`text-[10px] font-bold mt-1 ${precip > 50 ? 'text-blue-500' : 'text-themed-muted'}`}>{precip}%</span>
                      </div>

                      {/* Wind */}
                      <div className="flex flex-col items-center w-12 hidden sm:flex">
                         <Wind size={14} className={wind > 20 ? 'text-amber-500' : 'text-gray-400'} />
                         <span className="text-[10px] text-themed-muted mt-1">{wind} <span className="text-[8px]">km/h</span></span>
                      </div>
                   </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Weather;
