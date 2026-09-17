const SHARE_CARD = Object.freeze({
  title: '梵数学：每天一题，练出数学思路',
  path: '/pages/intro/intro',
  imageUrl: '/assets/app-icon-1024.png',
});

function buildShareMessage() {
  return { ...SHARE_CARD };
}

module.exports = { buildShareMessage };
