function item({ id, term, unit, knowledgePoint, ability, type, difficulty, prompt, answer, options = [], hint, summary, steps, commonMistakes, taskType, representation, reasoningDepth, misconception, calculationExpression, roundingTarget }) {
  const resolvedRoundingTarget = roundingTarget
    || (knowledgePoint === 'division_estimation' ? 'tens' : '')
    || (knowledgePoint === 'multiply_estimation' ? 'strategy' : '');
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
    ...(calculationExpression ? { calculationExpression } : {}),
    ...(resolvedRoundingTarget ? { roundingTarget: resolvedRoundingTarget } : {}),
    ...(taskType ? { taskType } : {}),
    ...(representation ? { representation } : {}),
    ...(reasoningDepth ? { reasoningDepth } : {}),
    ...(misconception ? { misconception } : {}),
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

const thinkingUnits = {
  division_estimation: '除数是两位数的除法',
  multiply_estimation: '三位数乘两位数',
  division_exact: '两位数除法',
};

function thinkingItem(config) {
  return item({
    term: '上册',
    unit: thinkingUnits[config.knowledgePoint],
    ability: 'calculation',
    ...config,
  });
}

const thinkingPracticeQuestions = [
  thinkingItem({ id: 'p-thinking-g4-division-estimate-explain-1', knowledgePoint: 'division_estimation', type: 'choice', difficulty: 2, taskType: 'estimate_explain', calculationExpression: '287 ÷ 6', prompt: '287 ÷ 6 的商最接近哪个整十数？', options: ['30', '40', '50', '60'], answer: '50', hint: '先想 6×40 和 6×50 分别是多少。', summary: '先判断商所在的两个整十数，再比较距离。', steps: ['287÷6≈47.8。', '47.8 离 50 更近，所以商最接近 50。'], commonMistakes: ['round_only_dividend', 'read_quotient_as_exact'] }),
  thinkingItem({ id: 'p-thinking-g4-division-estimate-explain-2', knowledgePoint: 'division_estimation', type: 'fill', difficulty: 2, taskType: 'estimate_explain', calculationExpression: '398 ÷ 8', prompt: '398 ÷ 8 的商最接近 ____（填整十数）。', answer: '50', hint: '8×50=400，和 398 很接近。', summary: '用接近的乘法检验估算结果。', steps: ['8×50=400。', '398 与 400 相差 2，所以商最接近 50。'], commonMistakes: ['ignore_divisor', 'treat_estimate_as_exact'] }),
  thinkingItem({ id: 'p-thinking-g4-division-estimate-explain-3', knowledgePoint: 'division_estimation', type: 'problem', difficulty: 2, taskType: 'estimate_explain', prompt: '有 725 本书，平均放进 9 个书架。先估一估：每个书架大约放多少本？', answer: '80', hint: '想一想 9×80 和 9×90。', summary: '先估计每架书的本数，再用乘法检查范围。', steps: ['725÷9≈80.6。', '80.6 最接近 80，所以每个书架大约放 80 本。'], commonMistakes: ['round_only_dividend', 'ignore_context'] }),
  thinkingItem({ id: 'p-thinking-g4-division-method-compare-1', knowledgePoint: 'division_estimation', type: 'choice', difficulty: 3, taskType: 'method_compare', prompt: '估算 287 ÷ 6，下面哪种方法得到的结果最接近实际商？（估到整十数）', options: ['300÷6=50', '280÷7=40', '200÷6≈30', '287÷10≈30'], answer: '300÷6=50', hint: '先比较每种方法得到的数与 287÷6 的距离。', summary: '估算方法要同时考虑被除数和除数。', steps: ['287÷6≈47.8。', '50 比 40、30 都更接近 47.8，所以 300÷6=50 更合理。'], commonMistakes: ['choose_unchecked_method', 'round_both_numbers_randomly'] }),
  thinkingItem({ id: 'p-thinking-g4-division-method-compare-2', knowledgePoint: 'division_estimation', type: 'fill', difficulty: 3, taskType: 'method_compare', prompt: '小明把 462 ÷ 9 估成 500 ÷ 10=50。这个估算方法得到的商最接近 ____（估到整十数）。', answer: '50', hint: '先判断 500÷10 是否容易计算，再说明它为什么接近原题。', summary: '估算可以把两个数变成好算的数，但要保持商的数量级。', steps: ['500÷10=50。', '462÷9≈51.3，所以估算结果 50 合理。'], commonMistakes: ['round_both_numbers_randomly', 'ignore_magnitude'] }),
  thinkingItem({ id: 'p-thinking-g4-division-method-compare-3', knowledgePoint: 'division_estimation', type: 'problem', difficulty: 3, taskType: 'method_compare', prompt: '学校要把 598 本练习册平均分给 7 个班。小林估成 600÷7，小华估成 560÷7。谁的估算最接近原题？', answer: '小林', hint: '比较 598 与 600、560 的距离。', summary: '比较估算方法时，要看改动后的数离原数有多远。', steps: ['598 离 600 只有 2，离 560 有 38。', '所以小林的估算更接近原题。'], commonMistakes: ['choose_unchecked_method', 'compare_divisors_only'] }),
  thinkingItem({ id: 'p-thinking-g4-division-error-1', knowledgePoint: 'division_estimation', type: 'choice', difficulty: 3, taskType: 'error_analysis', prompt: '小强说：“863÷21 的商最接近 90，因为 863 最接近 900。”他的错误是？', options: ['只估了被除数，没有考虑除数', '把商写成了余数', '把 21 看成了 12', '把整十数写成了整百数'], answer: '只估了被除数，没有考虑除数', hint: '除法估算要同时关注被除数和除数。', summary: '不能只把被除数变整，还要检查除数和商的关系。', steps: ['863÷21≈41。', '只把 863 看成 900，不能直接得到商 90。'], commonMistakes: ['round_only_dividend', 'ignore_divisor'] }),
  thinkingItem({ id: 'p-thinking-g4-division-error-2', knowledgePoint: 'division_estimation', type: 'fill', difficulty: 3, taskType: 'error_analysis', prompt: '有人认为“742÷8≈90”不合理，实际上商最接近 ____。', answer: '90', hint: '90 仍然可能是最接近的整十数，再检查“≈”表示什么。', summary: '估算结果要用乘法范围检查，不能因为不是精确商就判错。', steps: ['8×90=720，8×100=800。', '742 在两者之间且更靠近 720，所以仍最接近 90。'], commonMistakes: ['read_quotient_as_exact', 'ignore_approximation'] }),
  thinkingItem({ id: 'p-thinking-g4-division-error-3', knowledgePoint: 'division_estimation', type: 'problem', difficulty: 3, taskType: 'error_analysis', prompt: '小东说“417÷6 的商大约是 70”。这个估计合理吗？', answer: '合理', hint: '比较 6×70 与 417。', summary: '先用乘法反向检查估算结果，再决定是否需要调整。', steps: ['6×70=420，和 417 只差 3。', '所以 417÷6≈70 是合理的。'], commonMistakes: ['round_only_dividend', 'skip_multiplication_check'] }),
  thinkingItem({ id: 'p-thinking-g4-division-reverse-1', knowledgePoint: 'division_estimation', type: 'choice', difficulty: 3, taskType: 'reverse_reasoning', prompt: '一个数除以 7，商大约是 40。按“除数×估算的商”来估计，这个数大约是多少？', options: ['28', '47', '280', '470'], answer: '280', hint: '用 7 乘估算的商 40。', summary: '已知商的近似值和除数，可以估计被除数，但不能确定精确值。', steps: ['7×40=280。', '按这种方法估计，被除数大约是 280，不一定恰好等于 280。'], commonMistakes: ['reverse_operation_confusion', 'place_value'] }),
  thinkingItem({ id: 'p-thinking-g4-division-reverse-2', knowledgePoint: 'division_estimation', type: 'fill', difficulty: 3, taskType: 'reverse_reasoning', prompt: '一个数除以 8，商大约是 60。按 8×60 估计，这个数大约是 ____。', answer: '480', hint: '除数×估算的商≈被除数。', summary: '从商的近似值和除数只能估计被除数，不能确定精确值。', steps: ['8×60=480。', '按这种方法估计，被除数大约是 480，不一定恰好等于 480。'], commonMistakes: ['reverse_operation_confusion', 'place_value'] }),
  thinkingItem({ id: 'p-thinking-g4-division-reverse-3', knowledgePoint: 'division_estimation', type: 'problem', difficulty: 3, taskType: 'reverse_reasoning', prompt: '平均每个书架放 30 本书，共有 9 个书架。书的总数大约是多少？', answer: '270', hint: '用每架书的本数乘书架数。', summary: '估算也可以从每份数量和份数反推总量。', steps: ['30×9=270。', '所以书的总数大约是 270 本。'], commonMistakes: ['ignore_range', 'reverse_operation_confusion'] }),

  thinkingItem({ id: 'p-thinking-g4-multiply-estimate-explain-1', knowledgePoint: 'multiply_estimation', type: 'choice', difficulty: 2, taskType: 'estimate_explain', calculationExpression: '398 × 21', prompt: '398 × 21 的积最接近哪个整百数？', options: ['8 200', '8 300', '8 400', '8 500'], answer: '8 400', hint: '先算出准确积，再比较相邻的两个整百数。', summary: '要找最接近的整百数，先确定准确积落在哪两个整百数之间。', steps: ['398×21=8 358。', '8 358 离 8 400 更近，所以积最接近 8 400。'], commonMistakes: ['round_wrong_place', 'ignore_magnitude'] }),
  thinkingItem({ id: 'p-thinking-g4-multiply-estimate-explain-2', knowledgePoint: 'multiply_estimation', type: 'fill', difficulty: 2, taskType: 'estimate_explain', calculationExpression: '603 × 48', prompt: '603 × 48 的积最接近 ____（填整百数）。', answer: '28 900', hint: '先算出准确积，再比较 28 900 和 29 000。', summary: '最接近的整百数由准确积与相邻整百数的距离决定。', steps: ['603×48=28 944。', '28 944 离 28 900 相差 44，离 29 000 相差 56，所以最接近 28 900。'], commonMistakes: ['round_wrong_place', 'treat_estimate_as_exact'] }),
  thinkingItem({ id: 'p-thinking-g4-multiply-estimate-explain-3', knowledgePoint: 'multiply_estimation', type: 'problem', difficulty: 2, taskType: 'estimate_explain', prompt: '一场活动有 197 排座位，每排 32 个。先估一估，大约能坐多少人？', answer: '6000', hint: '把 197 看成 200，把 32 看成 30。', summary: '估算乘积时先确定数量级，再选择合适的整数量。', steps: ['197≈200，32≈30。', '200×30=6 000，所以大约能坐 6 000 人。'], commonMistakes: ['ignore_magnitude', 'round_wrong_place'] }),
  thinkingItem({ id: 'p-thinking-g4-multiply-method-compare-1', knowledgePoint: 'multiply_estimation', type: 'choice', difficulty: 3, taskType: 'method_compare', prompt: '估算 398×21，哪种方法更合适？', options: ['400×20', '300×20', '400×2', '40×20'], answer: '400×20', hint: '比较每个估算因数和原数相差多少。', summary: '合理估算要检查两个因数离原数的距离和积的数量级。', steps: ['398 离 400 差 2，离 300 差 98；21 离 20 差 1。', '400×20=8 000，比其他选项更接近原积 8 358。'], commonMistakes: ['round_wrong_place', 'ignore_magnitude'] }),
  thinkingItem({ id: 'p-thinking-g4-multiply-method-compare-2', knowledgePoint: 'multiply_estimation', type: 'fill', difficulty: 3, taskType: 'method_compare', prompt: '小林估算 497×19 时写成 500×20=10 000。他把两个因数分别估成 ____ 和 ____。', answer: '500和20', hint: '观察 497、19 分别接近哪个整十或整百数。', summary: '说清每个因数怎样变化，才能检查估算过程。', steps: ['497 接近 500。', '19 接近 20，所以写成 500 和 20。'], commonMistakes: ['round_only_one_factor', 'omit_reason'] }),
  thinkingItem({ id: 'p-thinking-g4-multiply-method-compare-3', knowledgePoint: 'multiply_estimation', type: 'problem', difficulty: 3, taskType: 'method_compare', prompt: '仓库有 49 箱货物，每箱 198 件。小王估成 50×200，小李估成 40×200。谁的估算结果更接近原题的积？', answer: '小王', hint: '比较 49 与 50、40 的距离。', summary: '比较估算方法时，要检查两个因数的改变量。', steps: ['49 离 50 只差 1，离 40 差 9。', '所以小王的估算更接近原题。'], commonMistakes: ['ignore_magnitude', 'compare_only_product'] }),
  thinkingItem({ id: 'p-thinking-g4-multiply-error-1', knowledgePoint: 'multiply_estimation', type: 'choice', difficulty: 3, taskType: 'error_analysis', prompt: '小华把 602×39 的精确积写成 600×39=23 400。他的错误是？', options: ['把估算结果当成了精确积', '把 39 错看成了 93', '把乘法算成了除法', '把积的单位写错了'], answer: '把估算结果当成了精确积', hint: '600×39 可以帮助估算，但不能代替 602×39 的准确计算。', summary: '近似因数得到的是估算结果，不能直接标成精确积。', steps: ['600×39=23 400 是估算结果。', '602×39=23 478，所以不能把 23 400 写成精确积。'], commonMistakes: ['round_only_one_factor', 'treat_estimate_as_exact'] }),
  thinkingItem({ id: 'p-thinking-g4-multiply-error-2', knowledgePoint: 'multiply_estimation', type: 'fill', difficulty: 3, taskType: 'error_analysis', prompt: '小华估算 309×28，写成“309×28≈300×30=900”。乘积少写了一个 ____。', answer: '0', hint: '先算 3×3，再数 300 和 30 末尾的零。', summary: '估算后仍要检查积的数位和数量级。', steps: ['309≈300，28≈30。', '300×30=9 000，900 少写了一个 0。'], commonMistakes: ['place_value', 'ignore_magnitude'] }),
  thinkingItem({ id: 'p-thinking-g4-multiply-error-3', knowledgePoint: 'multiply_estimation', type: 'problem', difficulty: 3, taskType: 'error_analysis', prompt: '小东估算 198×31，写成 200×3=600。正确的估算结果约是多少？', answer: '6000', hint: '31 应该接近 30，而不是 3。', summary: '估算时不能漏掉十位的数量级。', steps: ['198≈200，31≈30。', '200×30=6 000，所以正确的估算结果约是 6 000。'], commonMistakes: ['round_wrong_place', 'place_value'] }),
  thinkingItem({ id: 'p-thinking-g4-multiply-reverse-1', knowledgePoint: 'multiply_estimation', type: 'choice', difficulty: 3, taskType: 'reverse_reasoning', prompt: '一个因数约是 200，积约是 6 000，另一个因数大约是多少？', options: ['3', '30', '300', '3 000'], answer: '30', hint: '用积除以已知因数。', summary: '已知积和一个因数，可以用除法反推另一个因数。', steps: ['6 000÷200=30。', '所以另一个因数大约是 30。'], commonMistakes: ['reverse_operation_confusion', 'place_value'] }),
  thinkingItem({ id: 'p-thinking-g4-multiply-reverse-2', knowledgePoint: 'multiply_estimation', type: 'fill', difficulty: 3, taskType: 'reverse_reasoning', prompt: '一个数乘 20 的积约是 4 000，这个数约是 ____。', answer: '200', hint: '用积除以因数。', summary: '已知积和一个因数，可以用除法反推另一个因数。', steps: ['4 000÷20=200。', '所以这个数约是 200。'], commonMistakes: ['reverse_operation_confusion', 'place_value'] }),
  thinkingItem({ id: 'p-thinking-g4-multiply-reverse-3', knowledgePoint: 'multiply_estimation', type: 'problem', difficulty: 3, taskType: 'reverse_reasoning', prompt: '全场约有 760 个座位，共有 19 排。平均每排大约有多少个座位？', answer: '40', hint: '用座位总数除以排数。', summary: '已知近似总量和份数，可以用除法反推每份数量。', steps: ['760÷19=40。', '所以平均每排大约有 40 个座位。'], commonMistakes: ['reverse_operation_confusion', 'ignore_range'] }),

  thinkingItem({ id: 'p-thinking-g4-division-exact-explain-1', knowledgePoint: 'division_exact', type: 'choice', difficulty: 2, taskType: 'condition_reasoning', prompt: '计算 624 ÷ 24 时，可以用哪道乘法检验？', options: ['24×26=624', '24×24=576', '26×26=676', '624×24'], answer: '24×26=624', hint: '除数×商=被除数。', summary: '除法可以用乘法关系检查商。', steps: ['624÷24=26。', '24×26=624，所以这道乘法可以检验。'], commonMistakes: ['quotient_place_value', 'reverse_operation_confusion'] }),
  thinkingItem({ id: 'p-thinking-g4-division-exact-explain-2', knowledgePoint: 'division_exact', type: 'fill', difficulty: 2, taskType: 'condition_reasoning', prompt: '如果 35×18=630，那么 630÷35=____。', answer: '18', hint: '被除数和商的位置互相对应。', summary: '乘法和除法互为逆运算。', steps: ['35×18=630。', '所以 630÷35=18。'], commonMistakes: ['quotient_place_value', 'reverse_operation_confusion'] }),
  thinkingItem({ id: 'p-thinking-g4-division-exact-explain-3', knowledgePoint: 'division_exact', type: 'problem', difficulty: 2, taskType: 'condition_reasoning', prompt: '624 本书平均放在 24 个书架上，每个书架放多少本？', answer: '26', hint: '先做除法，再用乘法检查。', summary: '平均分问题可以用除法解决，再用乘法验算。', steps: ['624÷24=26。', '用 24×26=624 检查，结果正确。'], commonMistakes: ['ignore_remainder', 'skip_check'] }),
  thinkingItem({ id: 'p-thinking-g4-division-exact-method-1', knowledgePoint: 'division_exact', type: 'choice', difficulty: 3, taskType: 'method_compare', prompt: '计算 936÷24=39 后，下面哪种方法能直接验算商？', options: ['检查24×39=936', '只看936的个位', '计算936+24', '计算39÷24'], answer: '检查24×39=936', hint: '除数×商应该等于被除数。', summary: '用除数乘商，能直接检查是否回到被除数。', steps: ['936÷24=39。', '24×39=936，所以商 39 通过验算。'], commonMistakes: ['quotient_place_value', 'skip_check'] }),
  thinkingItem({ id: 'p-thinking-g4-division-exact-method-2', knowledgePoint: 'division_exact', type: 'fill', difficulty: 3, taskType: 'condition_reasoning', prompt: '把 745 个苹果平均装进 24 箱，每箱 31 个，还剩 ____ 个。', answer: '1', hint: '先算 24×31，再用总数减去已经装的。', summary: '有余数的除法要同时关注商和余数。', steps: ['24×31=744。', '745-744=1，所以还剩 1 个。'], commonMistakes: ['ignore_remainder', 'remainder_ge_divisor'] }),
  thinkingItem({ id: 'p-thinking-g4-division-exact-method-3', knowledgePoint: 'division_exact', type: 'problem', difficulty: 3, taskType: 'method_compare', prompt: '有 936 张卡片，每 24 张装一盒。小丽先算 936÷6，再算结果÷4。这样做可以吗？', answer: '可以', hint: '24=6×4，连续除以 6 再除以 4 等于除以 24。', summary: '比较计算方法时，要说明分解因数是否保持等价。', steps: ['24=6×4。', '936÷6÷4=936÷24，所以这种方法可以。'], commonMistakes: ['divide_wrong_quantity', 'ignore_factor_relation'] }),
  thinkingItem({ id: 'p-thinking-g4-division-exact-error-1', knowledgePoint: 'division_exact', type: 'choice', difficulty: 3, taskType: 'error_analysis', prompt: '小明算 864÷24=3。下面哪个检验能直接说明商不对？', options: ['计算24×3，看是否等于864', '只看864的个位是否是4', '计算24+3，看是否等于864', '计算864+24，看是否等于3'], answer: '计算24×3，看是否等于864', hint: '用除数乘小明得到的商，应等于被除数。', summary: '用乘法验算商，同时注意商的位数。', steps: ['24×3=72，不等于 864，所以商不是 3。', '24×36=864，正确的商是 36。'], commonMistakes: ['quotient_place_value', 'skip_estimate'] }),
  thinkingItem({ id: 'p-thinking-g4-division-exact-error-2', knowledgePoint: 'division_exact', type: 'fill', difficulty: 3, taskType: 'error_analysis', representation: 'numeric', reasoningDepth: 3, misconception: 'ignore_remainder', prompt: '“745÷24=31……24”中的余数应改为 ____。', answer: '1', hint: '余数必须比除数小。', summary: '用被除数=除数×商+余数检查余数。', steps: ['24×31=744。', '745-744=1，余数应为 1。'], commonMistakes: ['ignore_remainder', 'remainder_ge_divisor'] }),
  thinkingItem({ id: 'p-thinking-g4-division-exact-error-3', knowledgePoint: 'division_exact', type: 'problem', difficulty: 3, taskType: 'error_analysis', representation: 'context', reasoningDepth: 3, misconception: 'remainder_ge_divisor', prompt: '小东说“98 个球每 12 个装一盒，可以装 8 盒还剩 14 个”。实际装满 8 盒后还剩几个球？', answer: '2', hint: '先算 12×8，再从 98 里减去装好的球。', summary: '用除数×商+余数检验，余数必须小于除数。', steps: ['12×8=96。', '98-96=2，余数是 2，不是 14。'], commonMistakes: ['remainder_ge_divisor', 'ignore_remainder'] }),
  thinkingItem({ id: 'p-thinking-g4-division-exact-reverse-1', knowledgePoint: 'division_exact', type: 'choice', difficulty: 3, taskType: 'reverse_reasoning', representation: 'numeric', reasoningDepth: 3, misconception: 'reverse_operation_confusion', calculationExpression: '□ ÷ 18 = 24', prompt: '□÷18=24，□里应填多少？', options: ['42', '216', '432', '486'], answer: '432', hint: '被除数=除数×商。', summary: '根据除法各部分关系反推被除数。', steps: ['18×24=432。', '所以□里填 432。'], commonMistakes: ['reverse_operation_confusion', 'place_value'] }),
  thinkingItem({ id: 'p-thinking-g4-division-exact-reverse-2', knowledgePoint: 'division_exact', type: 'fill', difficulty: 3, taskType: 'reverse_reasoning', representation: 'numeric', reasoningDepth: 3, misconception: 'reverse_operation_confusion', calculationExpression: '□ ÷ 27 = 24', prompt: '□÷27=24，□里应填 ____。', answer: '648', hint: '被除数=除数×商。', summary: '根据除法各部分关系反推被除数。', steps: ['27×24=648。', '所以□里填 648。'], commonMistakes: ['reverse_operation_confusion', 'quotient_place_value'] }),
  thinkingItem({ id: 'p-thinking-g4-division-exact-reverse-3', knowledgePoint: 'division_exact', type: 'problem', difficulty: 3, taskType: 'reverse_reasoning', representation: 'context', reasoningDepth: 3, misconception: 'reverse_operation_confusion', prompt: '一批书平均分给 16 个班，每班 28 本。这批书一共有多少本？', answer: '448', hint: '平均分问题已知每份和份数，用乘法求总数。', summary: '已知每份数量和份数，可以用乘法反推总数。', steps: ['28×16=448。', '这批书一共有 448 本。'], commonMistakes: ['reverse_operation_confusion', 'divide_when_multiply_needed'] }),
];

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

module.exports = { supplementalPracticeQuestions, thinkingPracticeQuestions };
