const fs = require('node:fs');

const [input, output, rawLimit] = process.argv.slice(2);
const limit = Number(rawLimit);
if (!input || !output || !Number.isInteger(limit) || limit < 1024) throw new Error('Usage: node trim-mp3.js <input> <output> <max-bytes>');

const source = fs.readFileSync(input);
let offset = 0;
if (source.subarray(0, 3).toString('ascii') === 'ID3') {
  const size = ((source[6] & 0x7f) << 21) | ((source[7] & 0x7f) << 14) | ((source[8] & 0x7f) << 7) | (source[9] & 0x7f);
  offset = 10 + size;
}

const bitrateTable = {
  3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const sampleRates = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

function frameLength(position) {
  if (position + 4 > source.length || source[position] !== 0xff || (source[position + 1] & 0xe0) !== 0xe0) return 0;
  const version = (source[position + 1] >> 3) & 3;
  const layer = (source[position + 1] >> 1) & 3;
  const bitrateIndex = source[position + 2] >> 4;
  const rateIndex = (source[position + 2] >> 2) & 3;
  const padding = (source[position + 2] >> 1) & 1;
  if (layer !== 1 || version === 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return 0;
  const bitrate = bitrateTable[version === 3 ? 3 : 2][bitrateIndex] * 1000;
  const sampleRate = sampleRates[version][rateIndex];
  return Math.floor((version === 3 ? 144 : 72) * bitrate / sampleRate) + padding;
}

while (!frameLength(offset) && offset < source.length - 4) offset += 1;
let end = offset;
while (true) {
  const length = frameLength(end);
  if (!length || end + length > limit || end + length > source.length) break;
  end += length;
}
if (end <= offset) throw new Error('No MP3 frames found before size limit');
fs.writeFileSync(output, source.subarray(0, end));
