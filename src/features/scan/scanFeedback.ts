// Odozva pri skenovaní: pípnutie (Web Audio) a vibrácia podľa výsledku – v hluku pri nakladaní netreba pozerať
// na displej. iPhone vibráciu z prehliadača nepodporuje, tam je len zvuk.

export type ScanOutcome = 'ok' | 'error' | 'info'

/** Výsledok podľa správy: ✓ = v poriadku, ✗ alebo cudzí QR = chyba, inak informácia. */
export function scanOutcome(message: string | void, notOurs: string): ScanOutcome {
  const text = (message ?? '').trim()
  if (!text) return 'ok'
  if (text.startsWith('✓')) return 'ok'
  if (text.startsWith('✗') || text === notOurs) return 'error'
  return 'info'
}

const SOUND_KEY = 'rigtrack.scan.sound'

export function readScanSound() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveScanSound(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    // Bez úložiska sa voľba len nezapamätá.
  }
}

let audio: AudioContext | null = null

/** Zvuk treba „odomknúť“ ťuknutím (prehliadače bez neho nepípnu); volá sa pri otvorení skenera a pri ťuknutí. */
export function unlockScanAudio() {
  try {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Context) return
    audio ??= new Context()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

function beep(frequency: number, start: number, length: number) {
  if (!audio) return
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = 'square'
  oscillator.frequency.value = frequency
  const at = audio.currentTime + start
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.15, at + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  oscillator.connect(gain).connect(audio.destination)
  oscillator.start(at)
  oscillator.stop(at + length + 0.02)
}

/** Pípnutie a vibrácia podľa výsledku. */
export function scanFeedback(outcome: ScanOutcome, sound: boolean) {
  try {
    navigator.vibrate?.(outcome === 'ok' ? 60 : outcome === 'error' ? [90, 60, 90] : 25)
  } catch {
    // Vibrácia nie je všade.
  }
  if (!sound || outcome === 'info') return
  try {
    if (audio?.state === 'suspended') void audio.resume()
    if (outcome === 'ok') beep(1320, 0, 0.09)
    else {
      beep(220, 0, 0.14)
      beep(180, 0.19, 0.18)
    }
  } catch {
    // Zvuk nie je dostupný.
  }
}
