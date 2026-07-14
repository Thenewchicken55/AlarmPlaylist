export const AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'wma', 'webm'] as const
export type AudioFormat = (typeof AUDIO_FORMATS)[number]

/** Map extension → Howler format name. Returns undefined for unknown/unresolvable URLs. */
export function inferFormat(url: string): AudioFormat | undefined {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase()
  if (!ext) return undefined
  return AUDIO_FORMATS.includes(ext as AudioFormat) ? (ext as AudioFormat) : undefined
}

/** Check whether a file extension (with or without dot prefix) is a supported audio format. */
export function isAudioExtension(ext: string): boolean {
  const clean = ext.startsWith('.') ? ext.slice(1).toLowerCase() : ext.toLowerCase()
  return AUDIO_FORMATS.includes(clean as AudioFormat)
}

export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.src = url

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration)
    })

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load audio metadata'))
    })
  })
}
