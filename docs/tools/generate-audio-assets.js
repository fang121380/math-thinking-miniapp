const fs = require('node:fs');
const path = require('node:path');

const SAMPLE_RATE = 22050;

function oscillator(frequency, time, shape) {
  const phase = (frequency * time) % 1;
  if (shape === 'square') return phase < 0.5 ? 0.7 : -0.7;
  if (shape === 'triangle') return 1 - 4 * Math.abs(Math.round(phase) - phase);
  return Math.sin(2 * Math.PI * phase);
}

function appendNote(samples, frequency, duration, volume, shape = 'triangle') {
  const count = Math.floor(SAMPLE_RATE * duration);
  for (let index = 0; index < count; index += 1) {
    const progress = index / count;
    const envelope = Math.min(1, progress * 24) * Math.max(0, 1 - progress) ** 1.7;
    samples.push(oscillator(frequency, index / SAMPLE_RATE, shape) * envelope * volume);
  }
}

function writeWav(filename, samples) {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2));
  fs.writeFileSync(path.join(output, filename), buffer);
}

function makeEffect(notes, shape = 'triangle', volume = 0.24, duration = 0.075) {
  const samples = [];
  notes.forEach((frequency) => {
    appendNote(samples, frequency, duration, volume, shape);
    for (let index = 0; index < SAMPLE_RATE * 0.012; index += 1) samples.push(0);
  });
  return samples;
}

const output = path.join(__dirname, '../../miniprogram/assets/audio');
fs.mkdirSync(output, { recursive: true });
writeWav('tap.wav', makeEffect([1046.5], 'square', 0.16, 0.035));
writeWav('move.wav', makeEffect([659.25, 880], 'triangle', 0.2, 0.045));
writeWav('correct.wav', makeEffect([783.99, 1046.5], 'triangle', 0.27, 0.065));
writeWav('wrong.wav', makeEffect([261.63, 220], 'triangle', 0.18, 0.08));
writeWav('complete.wav', makeEffect([523.25, 659.25, 783.99, 1046.5], 'square', 0.2, 0.07));
writeWav('streak.wav', makeEffect([1046.5, 1318.51, 1567.98], 'triangle', 0.22, 0.06));
writeWav('navigate.wav', makeEffect([880, 1174.66], 'triangle', 0.16, 0.035));
writeWav('setting.wav', makeEffect([698.46, 1046.5], 'square', 0.12, 0.03));
