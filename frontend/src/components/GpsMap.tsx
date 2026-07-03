import { useRef, useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Satellite, Mountain, Gauge, Crosshair, ZoomIn, ZoomOut } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import type { Snapshot } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component that auto-recenters the map when coordinates change
function MapController({ lat, lng, autoRecenter, onMapReady }: { lat: number; lng: number; autoRecenter: boolean; onMapReady: (map: L.Map) => void }) {
  const map = useMap();
  const prevCoords = useRef({ lat, lng });

  useEffect(() => {
    // Notify parent of map instance
    onMapReady(map);
  }, [map, onMapReady]);

  useEffect(() => {
    if (!autoRecenter) return;

    // Only recenter if coordinates actually changed (more than ~1 meter)
    const latDiff = Math.abs(lat - prevCoords.current.lat);
    const lngDiff = Math.abs(lng - prevCoords.current.lng);

    if (latDiff > 0.00001 || lngDiff > 0.00001) {
      map.setView([lat, lng], map.getZoom(), { animate: true, duration: 0.5 });
      prevCoords.current = { lat, lng };
    }
  }, [lat, lng, map, autoRecenter]);

  return null;
}

const createShipIcon = (lat: number, lng: number) => L.divIcon({
  html: `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener noreferrer" style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none;">
    <div style="position: absolute; width: 56px; height: 56px; background: linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(59, 130, 246, 0.15)); border-radius: 50%; animation: pulse 2s infinite;"></div>
    <div style="position: relative; z-index: 1; background: linear-gradient(135deg, #2563eb, #3b82f6); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4), 0 0 0 3px rgba(255, 255, 255, 0.9);">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
        <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
        <path d="M12 10v4"/>
        <path d="M12 2v3"/>
      </svg>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.3);
          opacity: 0.3;
        }
      }
    </style>
  </a>`,
  className: 'ship-marker',
  iconSize: [56, 56],
  iconAnchor: [28, 28],
  popupAnchor: [0, -28],
});

interface GpsMapProps {
  snapshot: Snapshot | null;
}


export default function GpsMap({ snapshot }: GpsMapProps) {
  const { t } = useLanguage();
  const mapRef = useRef<L.Map | null>(null);
  const [autoRecenter, setAutoRecenter] = useState(true);

  function toNumber(value?: number | string | null): number | null {
    if (value == null || value === '') return null;
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? null : num;
  }

  const lat = toNumber(snapshot?.gps_latitude);
  const lng = toNumber(snapshot?.gps_longitude);
  const alt = toNumber(snapshot?.gps_altitude);
  const speed = toNumber(snapshot?.gps_speed);
  const sats = toNumber(snapshot?.gps_satellites);

  const hasGps = snapshot?.gps_valid && lat != null && lng != null;

  const handleRecenter = () => {
    if (mapRef.current && lat != null && lng != null) {
      mapRef.current.setView([lat, lng], 18, { animate: true });
      setAutoRecenter(true);
    }
  };

  // Disable auto-recenter when user interacts with map
  const handleMapInteraction = useCallback(() => {
    setAutoRecenter(false);
  }, []);

  // Handle map ready callback
  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
    // Disable auto-recenter when user drags the map
    map.on('dragstart', handleMapInteraction);
  }, [handleMapInteraction]);

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('gpsLocation')}</h3>
          </div>
          {hasGps && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRecenter}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  autoRecenter
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                }`}
                title={autoRecenter ? 'Auto-recenter is ON' : 'Click to enable auto-recenter'}
              >
                <Crosshair className={`w-3.5 h-3.5 ${autoRecenter ? 'animate-pulse' : ''}`} />
                {autoRecenter ? t('recenterMap') : t('enableTracking')}
              </button>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                autoRecenter
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${autoRecenter ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                {autoRecenter ? t('gpsSignal') : t('trackingDisabled')}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {!hasGps ? (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 mb-2">{t('gpsNotAvailable')}</p>
            {snapshot && (
              <div className="text-xs text-slate-500 dark:text-slate-500 space-y-1">
                {sats != null && (
                  <p className="flex items-center justify-center gap-2">
                    <Satellite className="w-3 h-3" />
                    {sats} {t('satellitesCount')}
                  </p>
                )}
                <p>Status: {snapshot.gps_valid ? 'Fixing...' : 'No fix'}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-96 rounded-lg overflow-hidden border-2 border-green-200 dark:border-green-800 shadow-lg relative z-0">
              <MapContainer
                center={[lat!, lng!]}
                zoom={18}
                maxZoom={19}
                minZoom={3}
                className="h-full w-full z-0"
                zoomControl={false}
              >
                <MapController lat={lat!} lng={lng!} autoRecenter={autoRecenter && hasGps} onMapReady={handleMapReady} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat!, lng!]} icon={createShipIcon(lat!, lng!)}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">Current Location</p>
                      <p className="text-xs">{lat?.toFixed(6)}°, {lng?.toFixed(6)}°</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>

              <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
                <button
                  onClick={handleZoomIn}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 transition-colors"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 transition-colors"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{t('latitude')}</p>
                </div>
                <p className="text-lg font-bold font-mono text-blue-900 dark:text-blue-100">
                  {lat?.toFixed(6)}°
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-xs font-medium text-purple-700 dark:text-purple-300">{t('longitude')}</p>
                </div>
                <p className="text-lg font-bold font-mono text-purple-900 dark:text-purple-100">
                  {lng?.toFixed(6)}°
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-700 shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <Mountain className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{t('altitude')}</p>
                </div>
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                  {alt != null ? `${alt.toFixed(1)} m` : 'N/A'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/30 rounded-lg p-3 border border-amber-200 dark:border-amber-700 shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <Gauge className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{t('speed')}</p>
                </div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                  {speed != null ? `${speed.toFixed(1)} km/h` : 'N/A'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/30 rounded-lg p-3 border border-cyan-200 dark:border-cyan-700 shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <Satellite className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  <p className="text-xs font-medium text-cyan-700 dark:text-cyan-300">{t('satellitesLabel')}</p>
                </div>
                <p className="text-sm font-bold text-cyan-900 dark:text-cyan-100">
                  {sats ?? 'N/A'}
                </p>
              </div>
            </div>

            {snapshot.gps_datetime_fix && (
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-1">
                {t('fix')}: {(() => {
                  try {
                    const date = new Date(snapshot.gps_datetime_fix);
                    return date.toLocaleString('sl-SI', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                      timeZone: 'Europe/Ljubljana'
                    });
                  } catch {
                    return snapshot.gps_datetime_fix;
                  }
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
