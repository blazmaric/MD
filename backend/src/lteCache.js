let lteCache = {
  connected: null,
  lastChecked: null,
  checkInProgress: false,
  pingSuccess: null  // Added for periodic ping test result
};

const CACHE_TTL_MS = 30000;

export function getLteCache() {
  if (!lteCache.lastChecked) return null;

  const age = Date.now() - lteCache.lastChecked;
  if (age > CACHE_TTL_MS) return null;

  return {
    connected: lteCache.connected,
    pingSuccess: lteCache.pingSuccess,
    age,
    cached: true
  };
}

export function setLteCache(connected, pingSuccess = null) {
  lteCache = {
    connected,
    pingSuccess,
    lastChecked: Date.now(),
    checkInProgress: false
  };
}

export function isLteCheckInProgress() {
  return lteCache.checkInProgress;
}

export function setLteCheckInProgress(inProgress) {
  lteCache.checkInProgress = inProgress;
}

export function clearLteCache() {
  lteCache = {
    connected: null,
    lastChecked: null,
    checkInProgress: false,
    pingSuccess: null
  };
}
