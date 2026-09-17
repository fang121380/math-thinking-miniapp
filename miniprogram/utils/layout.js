function getSafeTop() {
  const app = getApp();
  return Math.max(36, Number(app.globalData.safeTop || 36));
}

module.exports = { getSafeTop };
