function item({ id, term, unit, knowledgePoint, ability, type, difficulty, prompt, answer, options = [], hint, summary, steps, commonMistakes }) {
  return {
    id,
    grade: 4,
    term,
    unit,
    knowledgePoint,
    ability,
    type,
    difficulty,
    prompt,
    answer: String(answer),
    options,
    hint,
    solution: { summary, steps },
    commonMistakes,
  };
}

function fillGroup({ prefix, term, unit, knowledgePoint, ability, summary, mistakes, rows }) {
  return rows.map(([prompt, answer, hint, steps], index) => item({
    id: `p-fill-${prefix}-${index + 1}`,
    term,
    unit,
    knowledgePoint,
    ability,
    type: 'fill',
    difficulty: index < 2 ? 1 : index === 2 ? 2 : 3,
    prompt,
    answer,
    hint,
    summary,
    steps,
    commonMistakes: mistakes,
  }));
}

function choiceGroup({ prefix, term, unit, knowledgePoint, ability, summary, mistakes, rows }) {
  return rows.map(([prompt, options, answer, hint, steps], index) => item({
    id: `p-choice-${prefix}-${index + 1}`,
    term,
    unit,
    knowledgePoint,
    ability,
    type: 'choice',
    difficulty: index < 2 ? 1 : index === 2 ? 2 : 3,
    prompt,
    options,
    answer,
    hint,
    summary,
    steps,
    commonMistakes: mistakes,
  }));
}

function problemGroup({ prefix, term, unit, knowledgePoint, ability, summary, mistakes, rows }) {
  return rows.map(([prompt, answer, hint, steps], index) => item({
    id: `p-problem-${prefix}-${index + 1}`,
    term,
    unit,
    knowledgePoint,
    ability,
    type: 'problem',
    difficulty: index < 2 ? 1 : index === 2 ? 2 : 3,
    prompt,
    answer,
    hint,
    summary,
    steps,
    commonMistakes: mistakes,
  }));
}

const supplementalPracticeQuestions = [
  ...fillGroup({
    prefix: 'division-refresh', term: '上册', unit: '除数是两位数的除法', knowledgePoint: 'division_exact', ability: 'calculation',
    summary: '利用乘法检查除法结果。', mistakes: ['missing_zero', 'calculation_error'],
    rows: [
      ['1440 ÷ 36 = ____。', '40', '先算 36×4，再把结果扩大 10 倍。', ['36×4=144。', '36×40=1440，所以商是 40。']],
    ],
  }),
  ...fillGroup({
    prefix: 'large-number', term: '上册', unit: '大数的认识', knowledgePoint: 'large_number_place_value', ability: 'calculation',
    summary: '先看清数字所在的数位，再确定这个数字表示的数值。', mistakes: ['place_value', 'missing_zero'],
    rows: [
      ['4 050 070 中，5 在 ____ 位上。', '万', '从右向左每四位一级。', ['4 050 070 读作四百零五万零七十。', '5 在万位上。']],
      ['三百零六万零八写作 ____。', '3060008', '万级后面要补足四位。', ['三百零六万是 3060000。', '再加 8，得到 3060008。']],
      ['7 020 000 中，2 表示 ____。', '20000', '2 在万位，万位的计数单位是 10000。', ['2 在万位。', '2 个万是 20000。']],
      ['把 5 098 000 四舍五入到万位约是 ____。', '5100000', '看万位后面的千位。', ['千位是 8，满 5 向前一位进 1。', '得到 5100000。']],
    ],
  }),
  ...choiceGroup({
    prefix: 'angle-measure', term: '上册', unit: '角的度量', knowledgePoint: 'angle_measure', ability: 'geometry',
    summary: '用角的度数判断角的大小。', mistakes: ['angle_unit', 'right_angle_confusion'],
    rows: [
      ['下面哪个角是直角？', ['45°', '90°', '135°', '180°'], '90°', '直角固定是 90°。', ['直角等于 90°。']],
      ['一个平角等于多少度？', ['90°', '120°', '180°', '360°'], '180°', '平角像一条直线。', ['平角等于 180°。']],
      ['比 90° 大、比 180° 小的角是？', ['锐角', '直角', '钝角', '周角'], '钝角', '先比较角的度数范围。', ['钝角大于 90°且小于 180°。']],
      ['一个周角里有几个直角？', ['2', '3', '4', '5'], '4', '周角是 360°。', ['360÷90=4。', '一个周角有 4 个直角。']],
    ],
  }),
  ...fillGroup({
    prefix: 'line-relationship', term: '上册', unit: '平行四边形和梯形', knowledgePoint: 'line_relationship', ability: 'geometry',
    summary: '根据直线是否相交和交角判断位置关系。', mistakes: ['parallel_perpendicular_confusion', 'right_angle_confusion'],
    rows: [
      ['同一平面内，两条永不相交的直线叫 ____ 线。', '平行', '想一想铁轨的两条边。', ['永不相交的两条直线互相平行。']],
      ['两条直线相交成直角时，这两条直线互相 ____。', '垂直', '直角是 90°。', ['相交成直角的两条直线互相垂直。']],
      ['长方形相邻的两条边互相 ____。', '垂直', '长方形的四个角都是直角。', ['相邻边交成直角。', '所以相邻边互相垂直。']],
      ['梯形只有一组对边互相 ____。', '平行', '注意是“只有一组”。', ['梯形的一组对边平行。']],
    ],
  }),
  ...problemGroup({
    prefix: 'multiplication', term: '上册', unit: '三位数乘两位数', knowledgePoint: 'multiplication_exact', ability: 'calculation',
    summary: '把两位数拆开，分别相乘后再相加。', mistakes: ['place_value', 'calculation_error'],
    rows: [
      ['图书馆买了 24 包贴纸，每包 36 张，一共有多少张？', '864', '把 36 看成 30 和 6。', ['24×30=720。', '24×6=144。', '720+144=864（张）。']],
      ['运动会有 32 个小组，每组 25 人，一共有多少人？', '800', '25×4=100，可以凑整。', ['32×25=8×100。', '一共有 800 人。']],
      ['一盒彩笔 48 支，学校买了 15 盒，一共有多少支？', '720', '把 15 拆成 10 和 5。', ['48×10=480。', '48×5=240。', '480+240=720（支）。']],
      ['果园有 36 行苹果树，每行 28 棵，一共有多少棵？', '1008', '先算 36×20，再算 36×8。', ['36×20=720。', '36×8=288。', '720+288=1008（棵）。']],
    ],
  }),
  ...fillGroup({
    prefix: 'multiplication-check', term: '上册', unit: '三位数乘两位数', knowledgePoint: 'multiplication_exact', ability: 'calculation',
    summary: '利用分配律拆分因数进行笔算检查。', mistakes: ['place_value', 'calculation_error'],
    rows: [
      ['125 × 8 = ____。', '1000', '125×4=500。', ['125×8=125×4×2。', '500×2=1000。']],
      ['46 × 20 = ____。', '920', '先算 46×2，再在末尾添 1 个 0。', ['46×2=92。', '46×20=920。']],
      ['108 × 35 = ____。', '3780', '把 108 分成 100 和 8。', ['100×35=3500。', '8×35=280。', '3500+280=3780。']],
      ['240 × 16 = ____。', '3840', '把 16 分成 10 和 6。', ['240×10=2400。', '240×6=1440。', '2400+1440=3840。']],
    ],
  }),
  ...choiceGroup({
    prefix: 'operation-order', term: '下册', unit: '四则运算', knowledgePoint: 'operation_order_problem', ability: 'problem',
    summary: '有括号先算括号，乘除优先于加减。', mistakes: ['wrong_operation_order', 'missing_parentheses'],
    rows: [
      ['计算 18+24÷6，第一步算什么？', ['18+24', '24÷6', '18÷6', '24-6'], '24÷6', '没有括号时先算乘除。', ['先算 24÷6。']],
      ['下面算式中，结果等于 9 的是？', ['(18+36)÷6', '18+36÷6', '18÷(36÷6)', '18-36÷6'], '(18+36)÷6', '逐项按运算顺序计算。', ['(18+36)÷6=54÷6=9。']],
      ['把“72 减去 18 与 3 的商”列成算式是？', ['(72-18)÷3', '72-18÷3', '72÷18-3', '72-(18×3)'], '72-18÷3', '“18 与 3 的商”要先算。', ['18÷3 表示 18 与 3 的商。', '再用 72 减去它，所以列式是72-18÷3。']],
      ['计算 (45-15)×4，结果是？', ['30', '60', '120', '180'], '120', '先计算括号。', ['45-15=30。', '30×4=120。']],
    ],
  }),
  ...choiceGroup({
    prefix: 'triangle-sides', term: '下册', unit: '三角形', knowledgePoint: 'triangle_sides', ability: 'geometry',
    summary: '任意两边的和必须大于第三边。', mistakes: ['triangle_inequality', 'random_guess'],
    rows: [
      ['哪三根小棒能围成三角形？', ['2厘米、3厘米、6厘米', '3厘米、4厘米、5厘米', '1厘米、2厘米、3厘米', '2厘米、2厘米、5厘米'], '3厘米、4厘米、5厘米', '比较较短两边的和。', ['3+4>5。', '所以3厘米、4厘米、5厘米可以围成三角形。']],
      ['三角形两边长 5 厘米和 7 厘米，第三边可能是？', ['2厘米', '3厘米', '8厘米', '12厘米'], '8厘米', '第三边要大于两边之差、小于两边之和。', ['7-5<第三边<7+5。', '8厘米符合条件。']],
      ['4 厘米、4 厘米、8 厘米的小棒能围成三角形吗？', ['能，组成锐角三角形', '不能', '能，组成直角三角形', '能，组成钝角三角形'], '不能', '两边和不能等于第三边。', ['4+4=8。', '两边和等于第三边，三根小棒只能排成一条线段，不能围成三角形。']],
      ['一个等边三角形的三条边长度怎样？', ['都相等', '有两条相等', '都不相等', '有一条最长'], '都相等', '“等边”说明三边相等。', ['等边三角形三条边都相等。']],
    ],
  }),
  ...fillGroup({
    prefix: 'angle-type', term: '上册', unit: '角的度量', knowledgePoint: 'angle_type', ability: 'geometry',
    summary: '根据度数范围判断角的类型。', mistakes: ['angle_unit', 'right_angle_confusion'],
    rows: [
      ['一个角是 35°，它是 ____ 角。', '锐', '小于 90° 的角是锐角。', ['35°小于90°。', '所以是锐角。']],
      ['一个角是 90°，它是 ____ 角。', '直', '直角等于 90°。', ['90°是直角。']],
      ['一个角是 150°，它是 ____ 角。', '钝', '大于90°小于180°。', ['150°在 90° 和 180° 之间。', '所以是钝角。']],
      ['一个角是 360°，它是 ____ 角。', '周', '绕一点转一整圈。', ['360°是周角。']],
    ],
  }),
  ...problemGroup({
    prefix: 'rectangle-perimeter', term: '下册', unit: '平行四边形和梯形', knowledgePoint: 'rectangle_perimeter', ability: 'geometry',
    summary: '长方形周长等于两条长和两条宽的和。', mistakes: ['perimeter_area_confusion', 'calculation_error'],
    rows: [
      ['一张长方形卡纸长 18 厘米、宽 12 厘米，四周贴彩带需要多少厘米？', '60', '周长要把长和宽各算两次。', ['(18+12)×2=60（厘米）。']],
      ['操场花坛长 35 米、宽 15 米，围一圈护栏需要多少米？', '100', '先求长加宽。', ['35+15=50。', '50×2=100（米）。']],
      ['长方形相框长 26 厘米、宽 14 厘米，边框长多少厘米？', '80', '边框长度就是周长。', ['(26+14)×2=80（厘米）。']],
      ['一块长方形布长 40 分米、宽 18 分米，锁边一周需要多少分米？', '116', '用周长公式。', ['40+18=58。', '58×2=116（分米）。']],
    ],
  }),
  ...choiceGroup({
    prefix: 'number-pattern', term: '上册', unit: '数学广角——优化', knowledgePoint: 'number_pattern', ability: 'pattern',
    summary: '先比较相邻两项的变化，再验证整个规律。', mistakes: ['single_difference', 'guess_pattern'],
    rows: [
      ['3、6、12、24，下一项是？', ['30', '36', '48', '60'], '48', '每次都是前一项的 2 倍。', ['24×2=48。']],
      ['1、4、9、16，下一项是？', ['20', '24', '25', '36'], '25', '这些数分别是连续自然数的平方。', ['1²、2²、3²、4²。', '下一项是 5²=25。']],
      ['81、27、9、3，下一项是？', ['0', '1', '2', '6'], '1', '每次除以 3。', ['3÷3=1。']],
      ['2、5、10、17，下一项是？', ['24', '25', '26', '27'], '26', '相邻两项增加 3、5、7。', ['下一次增加 9。', '17+9=26。']],
    ],
  }),
  ...fillGroup({
    prefix: 'data-difference', term: '下册', unit: '平均数与条形统计图', knowledgePoint: 'data_difference', ability: 'data',
    summary: '比较数据时用较大数减去较小数。', mistakes: ['sum_error', 'compare_wrong_boundary'],
    rows: [
      ['甲组收集 36 个瓶盖，乙组收集 52 个，乙组比甲组多 ____ 个。', '16', '求“多多少”用减法。', ['52-36=16。']],
      ['两天读书页数分别是 45 页和 68 页，相差 ____ 页。', '23', '用大数减小数。', ['68-45=23。']],
      ['条形图中第一组是 72 人，第二组是 59 人，相差 ____ 人。', '13', '先找较大的数据。', ['72-59=13。']],
      ['小丽跳了 86 下，小红跳了 94 下，小红多跳 ____ 下。', '8', '比较两个数量。', ['94-86=8。']],
    ],
  }),
  ...problemGroup({
    prefix: 'arrangement', term: '上册', unit: '数学广角——优化', knowledgePoint: 'arrangement_strategy', ability: 'pattern',
    summary: '安排事情时让能同时进行的事情同时进行。', mistakes: ['sequential_thinking', 'ignore_parallel_tasks'],
    rows: [
      ['小敏洗杯子 2 分钟、烧水 6 分钟、泡茶 1 分钟。先洗杯子再烧水，泡茶要等水开，至少几分钟？', '9', '不能同时进行的步骤要相加。', ['洗杯子 2 分钟。', '烧水 6 分钟。', '泡茶 1 分钟。', '共 2+6+1=9 分钟。']],
      ['一口锅一次能煮 3 个玉米，每锅要 12 分钟。煮 7 个玉米至少几分钟？', '36', '要煮几锅？', ['7 个玉米需要 3 锅。', '3×12=36 分钟。']],
      ['小军同时洗 4 双袜子，每双都要 5 分钟。洗 4 双袜子至少几分钟？', '5', '可以同时洗。', ['4 双袜子同时洗。', '只需要 5 分钟。']],
      ['烤箱一次烤 6 个面包，烤一盘需 15 分钟。烤 14 个面包至少几分钟？', '45', '先确定盘数。', ['14 个面包需要 3 盘。', '3×15=45 分钟。']],
    ],
  }),
  ...choiceGroup({
    prefix: 'view-direction', term: '下册', unit: '观察物体（二）', knowledgePoint: 'view_from_direction', ability: 'geometry',
    summary: '从不同方向观察时，只画这个方向能看到的轮廓。', mistakes: ['wrong_view', 'count_hidden_faces'],
    rows: [
      ['两个小正方体前后摆放，从正面看会看到几个正方形？', ['1个', '2个', '3个', '4个'], '1个', '前面的会挡住后面的。', ['从正面只有前面的正方体可见，所以答案是1个。']],
      ['三个小正方体横着排成一行，从上面看会看到几个正方形？', ['1个', '2个', '3个', '4个'], '3个', '从上面能看到每个位置。', ['三个正方体占三个位置，所以答案是3个。']],
      ['两个小正方体上下叠放，从左面看会看到几个正方形？', ['1个', '2个', '3个', '4个'], '2个', '上下两层都能看到。', ['左面轮廓是上下两个正方形，所以答案是2个。']],
      ['四个小正方体摆成 2 行 2 列的一层，从上面看是什么图形？', ['4个正方形排成2行2列', '4个正方形排成1行', '1个正方形', '2个正方形'], '4个正方形排成2行2列', '俯视图保留平面摆放位置。', ['四个正方体占 2×2 个格子，所以答案是4个正方形排成2行2列。']],
    ],
  }),
  ...problemGroup({
    prefix: 'average', term: '下册', unit: '平均数与条形统计图', knowledgePoint: 'average', ability: 'data',
    summary: '平均数等于总数除以份数。', mistakes: ['divide_by_wrong_count', 'sum_error'],
    rows: [
      ['四天收集树叶数是 18、22、26、30 片，平均每天收集多少片？', '24', '先求四天总数。', ['18+22+26+30=96。', '96÷4=24（片）。']],
      ['三次口算得分是 84、90、96 分，平均分是多少？', '90', '总分除以次数。', ['84+90+96=270。', '270÷3=90（分）。']],
      ['五个小组分别得到 12、16、18、20、24 颗星，平均每组多少颗？', '18', '共有 5 个小组。', ['12+16+18+20+24=90。', '90÷5=18（颗）。']],
      ['四辆车运书本数是 35、40、45、50 本，平均每辆运多少本？', '42.5', '先求总本数。', ['35+40+45+50=170。', '170÷4=42.5（本）。']],
    ],
  }),
  ...fillGroup({
    prefix: 'decimal', term: '下册', unit: '小数的加法和减法', knowledgePoint: 'decimal_calculation', ability: 'calculation',
    summary: '小数点要对齐，再按整数加减法计算。', mistakes: ['decimal_alignment', 'calculation_error'],
    rows: [
      ['3.6 + 2.4 = ____。', '6', '个位和十分位要对齐。', ['3.6+2.4=6.0。', '答案写作 6。']],
      ['8.5 - 3.2 = ____。', '5.3', '先对齐小数点。', ['8.5-3.2=5.3。']],
      ['12.7 + 0.8 = ____。', '13.5', '0.8 的个位是 0。', ['12.7+0.8=13.5。']],
      ['20 - 6.75 = ____。', '13.25', '把 20 写成 20.00。', ['20.00-6.75=13.25。']],
      ['9.08 - 4.6 = ____。', '4.48', '4.6 可以写成 4.60。', ['9.08-4.60=4.48。']],
      ['7.35 + 2.65 = ____。', '10', '百分位也要对齐。', ['7.35+2.65=10.00。', '答案写作 10。']],
    ],
  }),
];

module.exports = { supplementalPracticeQuestions };
