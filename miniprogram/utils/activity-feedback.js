const MESSAGES = {
  load_failed: '题目加载失败，请点重试',
  save_failed: '进度保存失败，请再试一次',
  navigation_failed: '页面没打开，请再点一次',
  hint_unavailable: '暂时算不出提示，请重来一局',
  invalid_puzzle_move: '只能移动空格旁边的数字',
  pattern_unselected: '先选一个答案，再检查',
  pattern_wrong: '再观察一下相邻数字的变化',
  selected_disconnected: '选中的格子要连在一起',
  remaining_disconnected: '没选的格子也要连在一起',
  audio_failed: '音效暂时不可用，不影响答题',
  game_round_replaced: '上次游戏和当前年级不匹配，已换成新一局；如果题目没有显示，请点重新加载。',
  game_review_round: '这一局是已完成关卡的复习版，换个方法再挑战一次吧。',
  construct_unfinished: '先从下方选几个令牌摆进托盘。',
  construct_wrong: '再检查令牌的顺序和运算符，改好后再试。',
  matching_wrong: '这两张还不是一对，重新找有相同结果的卡。',
  route_wrong: '这一关还没走通，重新观察条件再选一次。',
};

function activityMessage(code, context = {}) {
  if (code === 'partition_count') {
    const difference = Number(context.difference) || 0;
    if (difference > 0) return `还要选 ${difference} 格`;
    if (difference < 0) return `多选了 ${Math.abs(difference)} 格`;
    return '请重新检查选中的格子';
  }
  return MESSAGES[code] || '这一步没有完成，请再试一次';
}

module.exports = { activityMessage };
