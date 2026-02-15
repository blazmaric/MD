import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Navigation, Satellite, Mountain, Gauge } from 'lucide-react';
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

interface GpsMapProps {
  snapshot: Snapshot | null;
}

function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}

export default function GpsMap({ snapshot }: GpsMapProps) {
  const { t } = useLanguage();
  const hasGps = snapshot?.gps_valid && snapshot?.gps_latitude && snapshot?.gps_longitude;

  const openInMaps = () => {
    if (hasGps) {
      const url = `https://www.google.com/maps?q=${snapshot.gps_latitude},${snapshot.gps_longitude}`;
      window.open(url, '_blank');
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
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              {t('gpsSignal')}
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
                {snapshot.gps_satellites !== null && snapshot.gps_satellites !== undefined && (
                  <p className="flex items-center justify-center gap-2">
                    <Satellite className="w-3 h-3" />
                    {snapshot.gps_satellites} {t('satellitesCount')}
                  </p>
                )}
                <p>Status: {snapshot.gps_valid ? 'Fixing...' : 'No fix'}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-64 rounded-lg overflow-hidden border-2 border-green-200 dark:border-green-800 shadow-lg">
              <MapContainer
                center={[snapshot.gps_latitude!, snapshot.gps_longitude!]}
                zoom={13}
                className="h-full w-full"
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[snapshot.gps_latitude!, snapshot.gps_longitude!]}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">Current Location</p>
                      <p className="text-xs">{snapshot.gps_latitude?.toFixed(6)}°, {snapshot.gps_longitude?.toFixed(6)}°</p>
                    </div>
                  </Popup>
                </Marker>
                <MapUpdater lat={snapshot.gps_latitude!} lng={snapshot.gps_longitude!} />
              </MapContainer>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{t('latitude')}</p>
                </div>
                <p className="text-lg font-bold font-mono text-blue-900 dark:text-blue-100">
                  {snapshot.gps_latitude?.toFixed(6)}°
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-xs font-medium text-purple-700 dark:text-purple-300">{t('longitude')}</p>
                </div>
                <p className="text-lg font-bold font-mono text-purple-900 dark:text-purple-100">
                  {snapshot.gps_longitude?.toFixed(6)}°
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
                  {snapshot.gps_altitude != null ? `${snapshot.gps_altitude.toFixed(1)} m` : 'N/A'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/30 rounded-lg p-3 border border-amber-200 dark:border-amber-700 shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <Gauge className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{t('speed')}</p>
                </div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                  {snapshot.gps_speed != null ? `${snapshot.gps_speed.toFixed(1)} km/h` : 'N/A'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/30 rounded-lg p-3 border border-cyan-200 dark:border-cyan-700 shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <Satellite className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  <p className="text-xs font-medium text-cyan-700 dark:text-cyan-300">{t('satellitesLabel')}</p>
                </div>
                <p className="text-sm font-bold text-cyan-900 dark:text-cyan-100">
                  {snapshot.gps_satellites ?? 'N/A'}
                </p>
              </div>
            </div>

            {snapshot.gps_datetime_fix && (
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-1">
                {t('fix')}: {snapshot.gps_datetime_fix}
              </div>
            )}

            <button
              onClick={openInMaps}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 dark:from-green-500 dark:to-emerald-500 dark:hover:from-green-600 dark:hover:to-emerald-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              {t('openInMaps')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
