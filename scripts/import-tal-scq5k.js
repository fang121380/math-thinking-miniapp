const fs = require('node:fs');
const path = require('node:path');

const TAL_SOURCE_URL = 'https://github.com/math-eval/TAL-SCQ5K';

function textOfOption(option) {
  if (!Array.isArray(option) || !option[0]) return '';
  return String(option[0].content || '').trim();
}

function createTalReviewCandidate(record = {}) {
  const sourceId = String(record.queId || record.qid || '').trim();
  if (!sourceId) throw new Error('TAL record is missing queId');

  return {
    sourceType: 'licensed-external',
    sourceName: 'TAL-SCQ5K-CN',
    sourceUrl: TAL_SOURCE_URL,
    sourceId,
    sourceLicense: 'MIT',
    sourceRightsEvidence: TAL_SOURCE_URL,
    sourceAttribution: 'TAL-SCQ5K-CN, TAL Education Group, MIT License.',
    sourceDatasetVersion: String(record.dataset_version || '').trim(),
    sourceKnowledgeRoute: Array.isArray(record.knowledge_point_routes)
      ? record.knowledge_point_routes.filter(Boolean)
      : [],
    sourceDifficulty: String(record.difficulty || '').trim(),
    prompt: String(record.problem || '').trim(),
    options: (record.answer_option_list || []).map(textOfOption).filter(Boolean),
    answer: String(record.answer_value || '').trim(),
    solution: Array.isArray(record.answer_analysis)
      ? record.answer_analysis.filter(Boolean).join('\n')
      : String(record.answer_analysis || '').trim(),
    reviewStatus: 'pending-manual-mapping',
    reviewedAt: new Date().toISOString().slice(0, 10),
  };
}

function parseTalRecords(raw) {
  const records = [];
  const rejected = [];
  let buffer = '';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (const char of String(raw || '')) {
    if (!depth && char !== '{') continue;
    if (!depth && char === '{') buffer = '';

    if (inString && (char === '\n' || char === '\r')) {
      buffer += '\\n';
      escaped = false;
      continue;
    }

    buffer += char;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (!depth) {
        try {
          records.push(JSON.parse(buffer));
        } catch (error) {
          rejected.push({ record: records.length + rejected.length + 1, message: error.message });
        }
        buffer = '';
      }
    }
  }

  if (buffer.trim()) rejected.push({ record: records.length + rejected.length + 1, message: 'incomplete_record' });
  return { records, rejected };
}

function importTalJsonl(inputPath, outputPath) {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const parsed = parseTalRecords(raw);
  const candidates = parsed.records.map(createTalReviewCandidate);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${candidates.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8');
  return { imported: candidates.length, rejected: parsed.rejected };
}

function parseCliArguments(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (args[index].startsWith('--')) values[args[index].slice(2)] = args[index + 1];
  }
  return values;
}

if (require.main === module) {
  const args = parseCliArguments(process.argv.slice(2));
  if (!args.input || !args.output) {
    console.error('Usage: node scripts/import-tal-scq5k.js --input <source.jsonl> --output <review.jsonl>');
    process.exitCode = 1;
  } else {
    const result = importTalJsonl(args.input, args.output);
    console.log(`Imported ${result.imported} TAL-SCQ5K review candidates; skipped ${result.rejected.length} malformed records.`);
  }
}

module.exports = {
  TAL_SOURCE_URL,
  createTalReviewCandidate,
  parseTalRecords,
  importTalJsonl,
};
