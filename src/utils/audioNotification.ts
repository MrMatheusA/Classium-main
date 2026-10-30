/**
 * CLASSIUM ENTERPRISE AUDIO NOTIFICATION ENGINE
 * Web Audio API synthesized sound generator with multi-category acoustics,
 * SpeechSynthesis voice alerts, deduplication guard, and persistent preferences.
 */

export interface AudioPreferences {
  masterMuted: boolean;
  voiceEnabled: boolean;
  urgentVolume: number;      // 0.0 to 1.0
  signatureVolume: number;   // 0.0 to 1.0
  convocationVolume: number; // 0.0 to 1.0
  infoVolume: number;        // 0.0 to 1.0
}

const STORAGE_KEY = 'classium_audio_preferences';

const defaultPreferences: AudioPreferences = {
  masterMuted: false,
  voiceEnabled: true,
  urgentVolume: 0.8,
  signatureVolume: 0.7,
  convocationVolume: 0.65,
  infoVolume: 0.5
};

function loadStoredPreferences(): AudioPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultPreferences, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('[AudioEngine] Could not load stored preferences:', err);
  }
  return { ...defaultPreferences };
}

let currentPreferences: AudioPreferences = loadStoredPreferences();
let audioCtx: AudioContext | null = null;
const playedNotificationIds = new Set<string>();

export function getAudioPreferences(): AudioPreferences {
  return { ...currentPreferences };
}

export function updateAudioPreferences(updates: Partial<AudioPreferences>): AudioPreferences {
  currentPreferences = { ...currentPreferences, ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPreferences));
  } catch (err) {
    console.warn('[AudioEngine] Failed to save preferences:', err);
  }
  return currentPreferences;
}

export function isAudioMuted(): boolean {
  return currentPreferences.masterMuted;
}

export function setAudioMuted(muted: boolean): void {
  updateAudioPreferences({ masterMuted: muted });
}

export function markNotificationSoundPlayed(id: string): void {
  if (id) {
    playedNotificationIds.add(id);
  }
}

export function hasNotificationSoundBeenPlayed(id: string): boolean {
  if (!id) return false;
  return playedNotificationIds.has(id);
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Ensure audio context unlocks on first user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

/**
 * 1. COMUNICAÇÃO URGENTE: Som intenso, não agressivo, duração de ~3 a 3.5 segundos
 * Sequência polifônica de advertência em 3 pulsos harmônicos com decay suave.
 */
export function playUrgentSound(forceVolume?: number): void {
  if (currentPreferences.masterMuted) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const vol = forceVolume ?? currentPreferences.urgentVolume;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.35, now);
    masterGain.connect(ctx.destination);

    // 3 pulses over 3.2 seconds
    const pulses = [0, 1.0, 2.0];
    pulses.forEach((pulseOffset) => {
      const pStart = now + pulseOffset;

      // Dual harmonic oscillators
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const pulseGain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      // Sweep from 587.33 (D5) to 880 (A5) then resolve
      osc1.frequency.setValueAtTime(659.25, pStart); // E5
      osc1.frequency.exponentialRampToValueAtTime(987.77, pStart + 0.35); // B5
      osc1.frequency.exponentialRampToValueAtTime(659.25, pStart + 0.7);

      osc2.frequency.setValueAtTime(329.63, pStart); // E4
      osc2.frequency.exponentialRampToValueAtTime(493.88, pStart + 0.35); // B4
      osc2.frequency.exponentialRampToValueAtTime(329.63, pStart + 0.7);

      pulseGain.gain.setValueAtTime(0.001, pStart);
      pulseGain.gain.linearRampToValueAtTime(1.0, pStart + 0.1);
      pulseGain.gain.exponentialRampToValueAtTime(0.001, pStart + 0.85);

      osc1.connect(pulseGain);
      osc2.connect(pulseGain);
      pulseGain.connect(masterGain);

      osc1.start(pStart);
      osc1.stop(pStart + 0.9);
      osc2.start(pStart);
      osc2.stop(pStart + 0.9);
    });
  } catch (err) {
    console.warn('[AudioEngine] Urgent sound play error:', err);
  }
}

/**
 * 2. ASSINATURAS: Som distinto de chancela/termo digital + voz opcional
 * Chime cristalino descendente e ascendente (~1.2s) + TTS opcional
 */
export function playSignatureSound(forceVolume?: number, forceVoice?: boolean): void {
  if (currentPreferences.masterMuted) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const vol = forceVolume ?? currentPreferences.signatureVolume;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.3, now);
    masterGain.connect(ctx.destination);

    // Major 7th chord arpeggio (C5 -> E5 -> G5 -> B5 -> C6)
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
    notes.forEach((freq, idx) => {
      const nStart = now + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, nStart);

      gain.gain.setValueAtTime(0.001, nStart);
      gain.gain.linearRampToValueAtTime(0.8, nStart + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, nStart + 0.6);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(nStart);
      osc.stop(nStart + 0.65);
    });

    // Voice announcement if enabled
    const shouldVoice = forceVoice !== undefined ? forceVoice : currentPreferences.voiceEnabled;
    if (shouldVoice && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setTimeout(() => {
        try {
          window.speechSynthesis.cancel(); // cancel previous speech
          const utterance = new SpeechSynthesisUtterance('Você recebeu um documento importante para assinatura digital.');
          utterance.lang = 'pt-BR';
          utterance.rate = 1.05;
          utterance.pitch = 1.0;
          utterance.volume = Math.min(1, vol);
          window.speechSynthesis.speak(utterance);
        } catch (vErr) {
          console.warn('[AudioEngine] Speech synthesis error:', vErr);
        }
      }, 700);
    }
  } catch (err) {
    console.warn('[AudioEngine] Signature sound play error:', err);
  }
}

/**
 * 3. CONVOCAÇÕES: Som de agenda/chamada institucional (~1.4s)
 * Campanela harmônica dupla elegante com ressonância metálica.
 */
export function playConvocationSound(forceVolume?: number): void {
  if (currentPreferences.masterMuted) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const vol = forceVolume ?? currentPreferences.convocationVolume;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.28, now);
    masterGain.connect(ctx.destination);

    // Agenda bell tones (G4, D5, G5)
    const tones = [
      { f: 392.00, t: 0.0, d: 0.7 },
      { f: 587.33, t: 0.2, d: 0.8 },
      { f: 783.99, t: 0.45, d: 0.95 }
    ];

    tones.forEach(tone => {
      const tStart = now + tone.t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(tone.f, tStart);

      gain.gain.setValueAtTime(0.001, tStart);
      gain.gain.linearRampToValueAtTime(0.85, tStart + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, tStart + tone.d);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(tStart);
      osc.stop(tStart + tone.d + 0.05);
    });
  } catch (err) {
    console.warn('[AudioEngine] Convocation sound error:', err);
  }
}

/**
 * 4. INFORMATIVOS: Som suave, moderno e não intrusivo (~0.5s)
 * Duplo toque marimba suave.
 */
export function playInfoSound(forceVolume?: number): void {
  if (currentPreferences.masterMuted) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const vol = forceVolume ?? currentPreferences.infoVolume;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.22, now);
    masterGain.connect(ctx.destination);

    // 2 soft tones
    const tones = [
      { f: 523.25, t: 0.0, d: 0.3 }, // C5
      { f: 659.25, t: 0.12, d: 0.4 }  // E5
    ];

    tones.forEach(tone => {
      const tStart = now + tone.t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.f, tStart);

      gain.gain.setValueAtTime(0.001, tStart);
      gain.gain.linearRampToValueAtTime(0.7, tStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, tStart + tone.d);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(tStart);
      osc.stop(tStart + tone.d + 0.05);
    });
  } catch (err) {
    console.warn('[AudioEngine] Info sound error:', err);
  }
}

/**
 * Generic notification dispatcher according to category
 */
export function playNotificationChime(
  type: 'urgency' | 'urgent' | 'convocation' | 'signature' | 'info' | string = 'info',
  notificationId?: string
): void {
  if (notificationId) {
    if (hasNotificationSoundBeenPlayed(notificationId)) {
      return; // Already played for this record
    }
    markNotificationSoundPlayed(notificationId);
  }

  const normalized = (type || '').toLowerCase();
  if (normalized === 'urgency' || normalized === 'urgent' || normalized === 'emergência' || normalized === 'emergencia') {
    playUrgentSound();
  } else if (normalized === 'signature' || normalized === 'assinatura' || normalized === 'assinaturas') {
    playSignatureSound();
  } else if (normalized === 'convocation' || normalized === 'convocação' || normalized === 'convocacoes') {
    playConvocationSound();
  } else {
    playInfoSound();
  }
}

/**
 * Plays infraction acoustic notification according to level
 */
export function playInfractionSound(severity: 'leve' | 'media' | 'gravissima' | 'green' | 'yellow' | 'red' | string): void {
  if (currentPreferences.masterMuted) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const normalized = (severity || '').toLowerCase();

    if (normalized === 'leve' || normalized === 'green' || normalized === 'elogio') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (normalized === 'media' || normalized === 'yellow' || normalized === 'disciplinar') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440.00, now);
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.15);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      const beeps = [0, 0.22, 0.44];
      beeps.forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(783.99, now + offset);
        osc.frequency.exponentialRampToValueAtTime(523.25, now + offset + 0.14);

        gain.gain.setValueAtTime(0.32, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.16);
      });
    }
  } catch (err) {
    console.warn('[AudioEngine] Infraction sound error:', err);
  }
}
