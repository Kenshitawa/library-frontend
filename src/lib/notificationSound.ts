let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const AudioContextConstructor = window.AudioContext
    if (!AudioContextConstructor) throw new Error('This browser does not support notification sounds.')
    audioContext = new AudioContextConstructor()
  }
  return audioContext
}

export async function enableNotificationSound(): Promise<void> {
  const context = getAudioContext()
  if (context.state === 'suspended') await context.resume()
  playNotificationSound()
}

export function playNotificationSound(): void {
  const context = getAudioContext()
  if (context.state !== 'running') return

  const start = context.currentTime
  ;[880, 1174].forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const time = start + index * 0.12
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, time)
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(0.12, time + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(time)
    oscillator.stop(time + 0.19)
  })
}
