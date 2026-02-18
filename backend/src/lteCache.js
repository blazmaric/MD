let lteCache = {
  connected: null,
  lastChecked: null,
  checkInProgress: false
};

const CACHE_TTL_MS = 30000;

export function getLteCache() {
  if (!lteCache.lastChecked) return null;

  const age = Date.now() - lteCache.lastChecked;
  if (age > CACHE_TTL_MS) return null;

  return {
    connected: lteCache.connected,
    age,
    cached: true
  };
}

export function setLteCache(connected) {
  lteCache = {
    connected,
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
    checkInProgress: false
  };
}
