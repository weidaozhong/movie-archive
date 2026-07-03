import { mkdirSync, writeFileSync } from 'node:fs';

const sampleRate = 22050;
const seconds = 12;
const samples = sampleRate * seconds;
const data = Buffer.alloc(samples * 2);
const chords = [
  [196, 246.94, 293.66],
  [174.61, 220, 261.63],
  [164.81, 207.65, 246.94],
  [185, 233.08, 277.18]
];
const melody = [392, 440, 369.99, 329.63, 293.66, 329.63, 369.99, 440];

function envelope(local, length) {
  const attack = 0.08;
  const release = 0.35;
  if (local < attack) return local / attack;
  if (local > length - release) return Math.max(0, (length - local) / release);
  return 1;
}

function tone(freq, t, softness = 1) {
  return Math.sin(2 * Math.PI * freq * t) * 0.75 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.18 * softness;
}

for (let i = 0; i < samples; i += 1) {
  const t = i / sampleRate;
  const bar = Math.floor(t / 3) % chords.length;
  const barT = t % 3;
  const noteIndex = Math.floor(t / 1.5) % melody.length;
  const noteT = t % 1.5;
  const masterFade = Math.min(1, t / 1.2, (seconds - t) / 1.2);
  const pad = chords[bar].reduce((sum, freq) => sum + tone(freq, t, 0.25), 0) / 3;
  const bell = tone(melody[noteIndex], t, 0.1) * envelope(noteT, 1.5);
  const sample = (pad * 0.10 + bell * 0.045) * masterFade;
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

mkdirSync('public/audio', { recursive: true });
writeFileSync('public/audio/bgm.wav', Buffer.concat([header, data]));
