/* eslint-disable */
const socket = io();

const sfxBase = 'sound/';
const ttsBase = window.location.origin + '/api/tts';

const soundCache = new Map();
const events = new EventEmitter3();
const queue = {
  isPlaying: false,
  list: [],
  currentlyPlaying: null,
};

const audioCtx = new AudioContext();
const audioGain = audioCtx.createGain();
audioGain.gain.value = 1;
audioGain.connect(audioCtx.destination);

/**
 *
 * @param {string} location
 * @param {boolean} [dontCache=false]
 */
async function loadSound(location, dontCache = false) {
  if (!dontCache) {
    const sound = soundCache.get(location);
    if (sound) {
      return sound;
    }
  }
  let audioBuf;
  try {
    const res = await fetch(location);

    if (res.status !== 200) {
      // Message has been filtered or request to TTS engine returns error code
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    audioBuf = await audioCtx.decodeAudioData(arrayBuf);
  } catch {
    console.error(`Failed to load sound at: "${location}"`);
    return null;
  }
  if (!dontCache) {
    soundCache.set(location, audioBuf);
  }
  return audioBuf;
}

function loadSoundNoCache(location) {
  return loadSound(location, true);
}

function playSound(audio) {
  return new Promise((resolve, reject) => {
    // If audio or audio.buffer is null/empty
    if (!audio || !audio.buffer) return resolve();
    const source = audioCtx.createBufferSource();
    source.buffer = audio.buffer;
    audioGain.gain.value = audio.volume || 1;
    source.connect(audioGain);
    source.start(audioCtx.currentTime);
    source.onended = () => {
      queue.currentlyPlaying = null;
      resolve();
    };
    queue.currentlyPlaying = {
      stop() {
        source.stop();
        resolve();
      },
    };
  });
}

function once(emitter, name) {
  return new Promise((resolve, reject) => {
    const onceError = name === 'error';
    const listener = onceError
      ? resolve
      : (...args) => {
          emitter.removeListener('error', error);
          resolve(args);
        };
    emitter.once(name, listener);
    if (onceError) return;
    const error = (err) => {
      emitter.removeListener(name, listener);
      reject(err);
    };
    emitter.once('error', error);
  });
}

async function playQueue() {
  if (!queue.list.length) {
    return;
  } else if (queue.isPlaying) {
    return once(events, 'queue-next').then(playQueue);
  }
  queue.isPlaying = true;
  const item = queue.list.shift();
  await playSound(item);
  queue.isPlaying = false;
  events.emit('queue-next');
}

/**
 * @typedef QueueObject
 * @property {string | undefined} location
 * @property {number} volume
 * @property {'sfx' | 'tts'} sound
 */

/**
 * @param {QueueObject} param0
 */
async function addToQueue({ location, volume, sound }) {
  if (!location) return;
  if (sound === 'sfx') {
    const item = {
      buffer: await loadSound(location),
      volume,
    };
    queue.list.push(item);
  } else {
    const item = { buffer: location, volume };
    queue.list.push(item);
  }
  playQueue();
}

socket.on('tts', async ({ text, volume = 0.75 }) => {
  const qs = new URLSearchParams({ text });
  addToQueue({
    location: await loadSoundNoCache(`${ttsBase}?${qs}`),
    volume: volume,
    sound: 'tts',
  });
});

socket.on('sfx', ({ file, volume = 1 }) => {
  const location = sfxBase + file;
  addToQueue({ location, volume, sound: 'sfx' });
});

socket.on('skip', () => {
  if (queue.currentlyPlaying) {
    queue.currentlyPlaying.stop();
  }
});
