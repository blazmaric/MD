import { MapPin, Navigation, Satellite } from 'lucide-react';
import type { Snapshot } from '../types';

interface GpsMapProps {
  snapshot: Snapshot | null;
}

export default function GpsMap({ snapshot }: GpsMapProps) {
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
            <MapPin className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">📍 GPS Lokacija</h3>
          </div>
          {hasGps && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              SIGNAL
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {!hasGps ? (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 mb-2">GPS signal ni na voljo</p>
            {snapshot && (
              <div className="text-xs text-slate-500 dark:text-slate-500 space-y-1">
                {snapshot.gps_satellites !== null && snapshot.gps_satellites !== undefined && (
                  <p className="flex items-center justify-center gap-2">
                    <Satellite className="w-3 h-3" />
                    {snapshot.gps_satellites} satelitov
                  </p>
                )}
                <p>Status: {snapshot.gps_valid ? 'Fixing...' : 'No fix'}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg p-4 border border-blue-200 dark:border-slate-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Širina</p>
                  <p className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {snapshot.gps_latitude?.toFixed(6)}°
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Dolžina</p>
                  <p className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {snapshot.gps_longitude?.toFixed(6)}°
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Višina</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {snapshot.gps_altitude != null ? `${snapshot.gps_altitude.toFixed(1)} m` : 'N/A'}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Hitrost</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {snapshot.gps_speed != null ? `${snapshot.gps_speed.toFixed(1)} km/h` : 'N/A'}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-1">
                  <Satellite className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">Sateliti</p>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {snapshot.gps_satellites ?? 'N/A'}
                </p>
              </div>
            </div>

            {snapshot.gps_datetime_fix && (
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Fix: {snapshot.gps_datetime_fix}
              </div>
            )}

            <button
              onClick={openInMaps}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              Odpri v Google Maps
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
