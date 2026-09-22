module.exports = {
  version: '2026.09.22.2',
  updatedAt: '2026-09-22',
  minimumAppVersion: '1.0.0',
  updateEndpoint: '',
  releaseNote: {
    version: '2026.09.22.2',
    title: '基础题提示更可操作',
    copy: '把周长、平均数、分批处理和直线关系题的提示改为明确的计算步骤。',
  },
  edition: { id: 'multi', label: '八版本教材' },
  enabledGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  supportedTerms: ['上册', '下册'],
  provenance: {
    type: 'original-local',
    statement: '题目由本项目重新编写，按八种常用教材的一至六年级知识蓝图标注，并参考课程标准及全国公开试题的常见考法，不照搬商业试卷。',
    referenceBasis: ['义务教育数学课程标准（2022年版）', '各教材公开目录与单元侧重', '全国公开真题和模拟题的题型结构'],
  },
  externalCommercialContent: false,
  catalog: { diagnostic: 5088, practice: 10746, juniorScopes: 24, juniorDiagnosticPerScope: 5, juniorPracticePerScope: 216 },
  updatePolicy: '人工审校后按版本发布；新增题目必须通过结构、答案和题型覆盖测试。',
};
