const { createProgressStore } = require('./utils/storage');
const { syncBackgroundMusic } = require('./utils/background-music');
const questionBankManifest = require('./utils/question-bank-manifest');
const { checkContentUpdate } = require('./utils/content-update');

function readSafeTop() {
  const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
  return Math.max(36, Number(info.statusBarHeight || 24) + 8);
}

App({
  onLaunch() {
    this.globalData.safeTop = readSafeTop();
    const store = createProgressStore();
    const progress = store.save(store.load());
    syncBackgroundMusic(progress.bgmEnabled, progress.bgmTrackIndex);
    this.checkMiniProgramUpdate();
    checkContentUpdate({
      bundledManifest: questionBankManifest,
      onAvailable: (update) => console.info('[content-update] available', update.version),
    });
  },
  checkMiniProgramUpdate() {
    if (!wx.getUpdateManager) return;
    const updateManager = wx.getUpdateManager();
    updateManager.onCheckForUpdate(() => {});
    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: 'New version',
        content: 'A new version is ready. Restart to use the latest content.',
        showCancel: false,
        success: () => updateManager.applyUpdate(),
      });
    });
    updateManager.onUpdateFailed(() => console.warn('[mini-program-update] failed'));
  },
  globalData: {
    safeTop: 36,
    appName: '梵数学',
  },
});
