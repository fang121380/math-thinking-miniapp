function versionParts(version) {
  return String(version || '').split('.').map(Number).filter(Number.isFinite);
}

function isNewerVersion(candidate, current) {
  const next = versionParts(candidate);
  const base = versionParts(current);
  if (!next.length || !base.length) return false;
  const length = Math.max(next.length, base.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (next[index] || 0) - (base[index] || 0);
    if (difference) return difference > 0;
  }
  return false;
}

function isCompatible(minimumAppVersion, appVersion) {
  return !minimumAppVersion || !isNewerVersion(minimumAppVersion, appVersion);
}

function decideContentUpdate(bundled, remote, appVersion) {
  if (!remote || typeof remote !== 'object' || !remote.contentUrl) return { action: 'bundled' };
  if (!isCompatible(remote.minimumAppVersion, appVersion)) return { action: 'bundled' };
  if (!isNewerVersion(remote.version, bundled.version)) return { action: 'bundled' };
  return { action: 'available', version: remote.version, url: remote.contentUrl };
}

function checkContentUpdate({ wxApi = wx, bundledManifest, appVersion = '1.0.0', onAvailable = () => {} }) {
  const endpoint = bundledManifest && bundledManifest.updateEndpoint;
  if (!endpoint || !/^https:\/\//.test(endpoint) || !wxApi || typeof wxApi.request !== 'function') return;
  wxApi.request({
    url: endpoint,
    method: 'GET',
    timeout: 5000,
    success(response) {
      const decision = decideContentUpdate(bundledManifest, response.data, appVersion);
      if (decision.action === 'available') onAvailable(decision);
    },
    fail() {
      // Keep the bundled offline bank when the update endpoint is unavailable.
    },
  });
}

module.exports = { isNewerVersion, decideContentUpdate, checkContentUpdate };
