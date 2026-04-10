export const SOUND_MODE = {
  OFF: 'off',
  ON: 'on',
  REVERB: 'reverb',
} as const;

export type SoundMode = (typeof SOUND_MODE)[keyof typeof SOUND_MODE];

export const DEFAULT_SOUND_MODE: SoundMode = SOUND_MODE.ON;

const SOUND_MODE_CYCLE: SoundMode[] = [SOUND_MODE.OFF, SOUND_MODE.ON, SOUND_MODE.REVERB];

export function getNextSoundMode(mode: SoundMode): SoundMode {
  const currentIndex = SOUND_MODE_CYCLE.indexOf(mode);
  return SOUND_MODE_CYCLE[(currentIndex + 1) % SOUND_MODE_CYCLE.length] ?? DEFAULT_SOUND_MODE;
}

export function isValidSoundMode(value: unknown): value is SoundMode {
  return value === SOUND_MODE.OFF || value === SOUND_MODE.ON || value === SOUND_MODE.REVERB;
}

export function isSoundModeEnabled(mode: SoundMode): boolean {
  return mode !== SOUND_MODE.OFF;
}
