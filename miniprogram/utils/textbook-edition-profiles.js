const EDITION_GRADE_PROFILES = {
  rjb: [
    null,
    { unit: '数一数与20以内加减法', focus: '用数数和画图理解数量变化', contexts: ['整理图书角', '排队做操', '分发彩色贴纸'], operations: ['add', 'sub'], base: 6 },
    { unit: '表内乘除法与长度', focus: '用乘法口诀表达相同加数', contexts: ['摆小棒', '折纸条', '准备班级绿植'], operations: ['mul', 'div'], base: 3 },
    { unit: '多位数乘除与分数初步', focus: '先估算再列竖式检验', contexts: ['阅读节活动', '图书漂流', '种植观察'], operations: ['mul', 'div'], base: 12 },
    { unit: '四则运算与小数认识', focus: '按顺序计算并判断小数点位置', contexts: ['校园义卖', '班级图书采购', '运动会计分'], operations: ['mul', 'div'], base: 18 },
    { unit: '小数和分数的意义', focus: '联系单位和数量关系', contexts: ['测量课桌', '统计跳绳成绩', '设计花坛'], operations: ['decimalAdd', 'perimeter'], base: 9 },
    { unit: '分数、比与综合应用', focus: '抓住谁和谁相比', contexts: ['配制果汁', '毕业册排版', '校园节水方案'], operations: ['fractionAdd', 'ratio'], base: 4 },
  ],
  bsd: [
    null,
    { unit: '快乐的家园与比较', focus: '从观察中发现数和位置', contexts: ['参观动物园', '布置教室', '整理玩具箱'], operations: ['add', 'sub'], base: 7 },
    { unit: '数一数与乘法的发现', focus: '用图示说明平均分', contexts: ['搭积木', '做水果拼盘', '收集树叶'], operations: ['mul', 'div'], base: 4 },
    { unit: '混合运算与图形周长', focus: '用操作解释运算顺序', contexts: ['设计迷宫', '拼七巧板', '布置展示板'], operations: ['mul', 'perimeter'], base: 11 },
    { unit: '认识更大的数与运算律', focus: '通过估算解释结果合理性', contexts: ['记录科技馆参观人数', '安排春游座位', '设计环保海报'], operations: ['div', 'mul'], base: 16 },
    { unit: '小数除法与图形面积', focus: '用拆分方法表达思路', contexts: ['测量操场', '制作班旗', '规划阅读区'], operations: ['decimalAdd', 'perimeter'], base: 8 },
    { unit: '比例与图形的运动', focus: '借助表格比较对应关系', contexts: ['缩放校园地图', '配制颜料', '设计风车'], operations: ['ratio', 'fractionAdd'], base: 5 },
  ],
  suj: [
    null,
    { unit: '数一数与分一分', focus: '通过分类建立数量关系', contexts: ['分早餐券', '收集笑脸贴', '整理美术材料'], operations: ['add', 'sub'], base: 5 },
    { unit: '有余数的除法与测量', focus: '用剩余量解释除法结果', contexts: ['分小组卡片', '裁彩带', '摆花盆'], operations: ['div', 'mul'], base: 5 },
    { unit: '两三位数乘除与统计', focus: '在表格中找数量关系', contexts: ['图书借阅记录', '午餐配送', '班级投票'], operations: ['mul', 'div'], base: 13 },
    { unit: '升和毫升与解决问题', focus: '用数量关系式解决生活问题', contexts: ['调制酸梅汤', '统计社团人数', '采购实验材料'], operations: ['div', 'mul'], base: 17 },
    { unit: '小数乘法与多边形面积', focus: '把单位转化写清楚', contexts: ['制作桌牌', '计算窗帘布', '记录气温'], operations: ['decimalAdd', 'perimeter'], base: 10 },
    { unit: '分数四则与正反比例', focus: '通过对比判断变化规律', contexts: ['安排志愿服务', '计算用水量', '制作模型'], operations: ['fractionAdd', 'ratio'], base: 6 },
  ],
  qd: [
    null,
    { unit: '海洋世界与数的认识', focus: '从海洋情境提取数学信息', contexts: ['观察贝壳', '数海星贴纸', '整理沙滩玩具'], operations: ['add', 'sub'], base: 8 },
    { unit: '勤劳的小蜜蜂与表内乘法', focus: '从连环画中建立乘除关系', contexts: ['采集花粉', '分装蜂蜜', '观察蝴蝶'], operations: ['mul', 'div'], base: 6 },
    { unit: '风筝厂见闻与两位数乘法', focus: '用信息窗分步解决问题', contexts: ['制作风筝', '统计帆船', '布置海洋展'], operations: ['mul', 'div'], base: 14 },
    { unit: '泰山古树与大数运算', focus: '先筛选信息再列式', contexts: ['测量古树', '登山补给', '记录游客数量'], operations: ['div', 'mul'], base: 19 },
    { unit: '冰激凌盒与小数应用', focus: '在生活情境中理解小数', contexts: ['购买冰激凌', '制作风筝线', '记录潮汐'], operations: ['decimalAdd', 'perimeter'], base: 11 },
    { unit: '啤酒生产与比例问题', focus: '画线段图呈现比例关系', contexts: ['果汁配比', '设计船模', '统计湿地鸟类'], operations: ['ratio', 'fractionAdd'], base: 7 },
  ],
  sh: [
    null,
    { unit: '数的认识与分与合', focus: '通过游戏表达数的组成', contexts: ['地铁站排队', '社区游戏日', '整理文具盒'], operations: ['add', 'sub'], base: 9 },
    { unit: '乘除法与时间', focus: '在活动中说清数量变化', contexts: ['安排值日', '记录公交班次', '制作时钟'], operations: ['mul', 'div'], base: 7 },
    { unit: '整百数与面积初步', focus: '用图形和算式双重验证', contexts: ['设计班级墙报', '拼地砖', '安排阅读角'], operations: ['mul', 'perimeter'], base: 15 },
    { unit: '工作效率与数据整理', focus: '从数据表说明结论', contexts: ['统计社团活动', '安排图书整理', '记录降雨量'], operations: ['div', 'mul'], base: 20 },
    { unit: '小数、方程与几何', focus: '将操作过程转成数学语言', contexts: ['测量身高', '规划菜园', '制作名牌'], operations: ['decimalAdd', 'perimeter'], base: 12 },
    { unit: '百分数与比例尺', focus: '把图上距离和实际距离对应', contexts: ['规划校园路线', '制作城市地图', '统计节能情况'], operations: ['ratio', 'fractionAdd'], base: 8 },
  ],
  xsb: [
    null,
    { unit: '数一数与位置', focus: '通过摆一摆形成数感', contexts: ['摆纽扣', '走方格路线', '整理绘本'], operations: ['add', 'sub'], base: 10 },
    { unit: '表内乘法与方向', focus: '边操作边说出数量关系', contexts: ['拼小方格', '摆桌椅', '制作班级徽章'], operations: ['mul', 'div'], base: 8 },
    { unit: '长方形周长与除法', focus: '用画图辅助推理', contexts: ['围种植箱', '做相框', '设计棋盘'], operations: ['perimeter', 'div'], base: 16 },
    { unit: '多位数运算与条形统计图', focus: '通过动手记录检查结果', contexts: ['统计运动步数', '分配劳动工具', '规划露营物资'], operations: ['mul', 'div'], base: 21 },
    { unit: '小数乘除与多边形面积', focus: '把估算与精算相互验证', contexts: ['裁剪布料', '制作风筝', '布置花园'], operations: ['decimalAdd', 'perimeter'], base: 13 },
    { unit: '圆与比例应用', focus: '在实践任务中选择方法', contexts: ['设计转盘', '配制肥料', '制作比例模型'], operations: ['ratio', 'fractionAdd'], base: 9 },
  ],
  hebei: [
    null,
    { unit: '生活中的数与加减法', focus: '从家庭生活发现数量关系', contexts: ['整理超市小票', '分早餐面包', '记录家务任务'], operations: ['add', 'sub'], base: 11 },
    { unit: '观察物体与表内除法', focus: '把实物操作转成算式', contexts: ['分装种子', '摆放盆栽', '准备运动器材'], operations: ['div', 'mul'], base: 9 },
    { unit: '年月日与两位数乘法', focus: '先画表格再判断关系', contexts: ['制作班级日历', '安排阅读挑战', '统计校园树木'], operations: ['mul', 'div'], base: 17 },
    { unit: '小数与优化问题', focus: '比较多种方法的简便性', contexts: ['规划公交出行', '采购班级用品', '计算活动经费'], operations: ['div', 'mul'], base: 22 },
    { unit: '分数、体积与数据统计', focus: '用单位统一表达数量', contexts: ['装配收纳盒', '记录实验用水', '制作营养表'], operations: ['decimalAdd', 'perimeter'], base: 14 },
    { unit: '比和百分数问题', focus: '解释比例计算的实际含义', contexts: ['设计节水宣传单', '配制消毒液', '统计阅读完成率'], operations: ['ratio', 'fractionAdd'], base: 10 },
  ],
  xiang: [
    null,
    { unit: '数的乐园与加减法', focus: '在规律游戏中认识数量', contexts: ['编数字项链', '收集树叶标本', '搭小火车'], operations: ['add', 'sub'], base: 12 },
    { unit: '乘法口诀与图形', focus: '发现阵列中的规律', contexts: ['摆花瓣图案', '拼正方形', '分发阅读卡'], operations: ['mul', 'div'], base: 10 },
    { unit: '分数与观察物体', focus: '用不同表示方式解释发现', contexts: ['涂色拼图', '制作折纸', '记录实验结果'], operations: ['mul', 'div'], base: 18 },
    { unit: '运算律与数学广角', focus: '寻找规律后再验证', contexts: ['设计密码锁', '安排比赛赛程', '制作数字卡'], operations: ['mul', 'div'], base: 23 },
    { unit: '小数、方程与组合图形', focus: '用列表整理全部可能', contexts: ['设计服装搭配', '制作价格标签', '规划游园路线'], operations: ['decimalAdd', 'perimeter'], base: 15 },
    { unit: '比例、统计与综合实践', focus: '从数据中表达自己的判断', contexts: ['调查垃圾分类', '设计校园导览图', '统计社团投票'], operations: ['ratio', 'fractionAdd'], base: 11 },
  ],
};

function getEditionGradeProfile(textbookId, grade) {
  const profiles = EDITION_GRADE_PROFILES[textbookId] || EDITION_GRADE_PROFILES.rjb;
  const safeGrade = Math.min(6, Math.max(1, Number(grade) || 4));
  const profile = profiles[safeGrade];
  return {
    ...profile,
    textbookId: EDITION_GRADE_PROFILES[textbookId] ? textbookId : 'rjb',
    grade: safeGrade,
    promptFamilies: profile.contexts.map((context, index) => `${textbookId}-g${safeGrade}-${index + 1}-${context}`),
  };
}

const JUNIOR_EDITION_PROFILES = {
  'jr-rjb': { textbookLabel: '人教版初中', unitPrefix: '学习主线', focus: '重视概念建构、符号表达与分步推理', contexts: ['校园测量', '学习小组', '城市出行'], topicLabels: ['数轴观察', '式的表达', '等量建模', '角度探究', '图形分类', '班级数据', '比较关系', '位置描述'], gradeEmphasis: { 7: '从具体数量关系过渡到代数语言。', 8: '让函数表示和几何证明互相支持。', 9: '在综合情境中选择函数和几何模型。' }, unitKeys: { 7: 'concept', 8: 'function-proof', 9: 'comprehensive' } },
  'jr-bsd': { textbookLabel: '北师大版初中', unitPrefix: '探究主题', focus: '重视观察、操作和多种表示之间的转换', contexts: ['折纸实验', '图形拼摆', '数据调查'], topicLabels: ['数的比较', '关系卡片', '平衡操作', '折叠角度', '三角形拼摆', '问卷整理', '范围判断', '方格定位'], gradeEmphasis: { 7: '用操作和图示理解数与式的关系。', 8: '通过变换和图像深化函数与证明。', 9: '从探究记录中提炼综合结论。' }, unitKeys: { 7: 'explore', 8: 'representation', 9: 'inquiry' } },
  'jr-suk': { textbookLabel: '苏科版初中', unitPrefix: '应用单元', focus: '重视数量关系、模型意识和实际应用', contexts: ['社区服务', '环境记录', '运动方案'], topicLabels: ['温度变化', '数量模型', '费用关系', '路线转角', '结构设计', '样本整理', '方案比较', '地图坐标'], gradeEmphasis: { 7: '从生活信息中抽取可计算的数量关系。', 8: '用函数、定理和数据模型解释变化。', 9: '让综合模型服务于实际决策。' }, unitKeys: { 7: 'model', 8: 'application', 9: 'decision' } },
  'jr-huk': { textbookLabel: '沪科版初中', unitPrefix: '思维课题', focus: '重视问题情境、实验观察和数学解释', contexts: ['科学实验', '校园路线', '器材制作'], topicLabels: ['实验读数', '符号记录', '条件列举', '角度实验', '构造观察', '结果分析', '限制条件', '平面定位'], gradeEmphasis: { 7: '在实验与表达之间建立准确对应。', 8: '借助图像和构造发展推理意识。', 9: '用多种证据支撑综合判断。' }, unitKeys: { 7: 'experiment', 8: 'reasoning', 9: 'evidence' } },
  'jr-luj': { textbookLabel: '鲁教版初中', unitPrefix: '实践专题', focus: '重视生活问题、方法选择和结果检验', contexts: ['农田规划', '节水统计', '志愿活动'], topicLabels: ['收支正负', '方案表达', '任务分配', '田间角度', '支架结构', '记录汇总', '预算范围', '区域位置'], gradeEmphasis: { 7: '把生活问题转化为可检验的数学步骤。', 8: '比较不同方法并说明选择理由。', 9: '通过综合实践检验模型是否合理。' }, unitKeys: { 7: 'practice', 8: 'method', 9: 'validation' } },
  'jr-xj': { textbookLabel: '湘教版初中', unitPrefix: '规律研习', focus: '重视规律发现、表达交流和变式思考', contexts: ['图案设计', '游戏规则', '文化活动'], topicLabels: ['正负规律', '图案代数', '规则等式', '线角规律', '三角形规律', '数据趋势', '大小关系', '格点路径'], gradeEmphasis: { 7: '在变化中发现数、式与图形的规律。', 8: '用变式练习巩固函数和证明思路。', 9: '将规律迁移到综合问题中。' }, unitKeys: { 7: 'pattern', 8: 'variation', 9: 'transfer' } },
  'jr-hsd': { textbookLabel: '华师大版初中', unitPrefix: '活动研究', focus: '重视数学活动、合作讨论和说理表达', contexts: ['小组研讨', '项目设计', '调查报告'], topicLabels: ['数轴讨论', '变量记录', '合作建模', '角度说理', '图形论证', '调查结论', '条件讨论', '坐标交流'], gradeEmphasis: { 7: '通过讨论把直观想法说成数学语言。', 8: '在合作活动中规范函数和证明表达。', 9: '用清晰论证完成综合研究任务。' }, unitKeys: { 7: 'activity', 8: 'discussion', 9: 'argument' } },
  'jr-zj': { textbookLabel: '浙教版初中', unitPrefix: '拓展任务', focus: '重视探究建模、逻辑推理和开放问题', contexts: ['工程设计', '出行优化', '模拟实验'], topicLabels: ['数的延伸', '符号建模', '条件推演', '角度推理', '结构探究', '数据推断', '边界分析', '坐标建模'], gradeEmphasis: { 7: '在开放任务中建立稳固的基础模型。', 8: '把几何推理和函数建模用于探究。', 9: '以逻辑链条处理复杂的综合情境。' }, unitKeys: { 7: 'extension', 8: 'modeling', 9: 'logic' } },
};

const JUNIOR_EDITION_MODES = {
  'jr-rjb': { taskMode: 'symbolic', modeLabel: '\u7b26\u53f7\u5efa\u6a21' },
  'jr-bsd': { taskMode: 'table_data', modeLabel: '\u8868\u683c\u4e0e\u6570\u636e' },
  'jr-suk': { taskMode: 'applied_plan', modeLabel: '\u5e94\u7528\u65b9\u6848' },
  'jr-huk': { taskMode: 'measurement_experiment', modeLabel: '\u6d4b\u91cf\u4e0e\u5b9e\u9a8c' },
  'jr-luj': { taskMode: 'practice_decision', modeLabel: '\u5b9e\u8df5\u51b3\u7b56' },
  'jr-xj': { taskMode: 'rule_discovery', modeLabel: '\u89c4\u5f8b\u53d1\u73b0' },
  'jr-hsd': { taskMode: 'discussion_data', modeLabel: '\u8ba8\u8bba\u4e0e\u6570\u636e' },
  'jr-zj': { taskMode: 'constraint_inquiry', modeLabel: '\u7ea6\u675f\u63a2\u7a76' },
};

function getJuniorEditionProfile(textbookId, grade) {
  const safeTextbookId = JUNIOR_EDITION_PROFILES[textbookId] ? textbookId : 'jr-rjb';
  const safeGrade = Math.min(9, Math.max(7, Number(grade) || 7));
  const profile = JUNIOR_EDITION_PROFILES[safeTextbookId];
  return {
    ...profile,
    ...JUNIOR_EDITION_MODES[safeTextbookId],
    textbookId: safeTextbookId,
    grade: safeGrade,
    promptFamilies: profile.contexts.map((context, index) => `${safeTextbookId}-g${safeGrade}-${index + 1}-${context}`),
  };
}

module.exports = {
  EDITION_GRADE_PROFILES,
  JUNIOR_EDITION_PROFILES,
  JUNIOR_EDITION_MODES,
  getEditionGradeProfile,
  getJuniorEditionProfile,
};
