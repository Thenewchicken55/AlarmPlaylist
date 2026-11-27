export const AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'wma', 'webm'] as const
export type AudioFormat = (typeof AUDIO_FORMATS)[number]

/** Map extension → Howler format name. Returns undefined for unknown/unresolvable URLs. */
export function inferFormat(url: string): AudioFormat | undefined {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase()
  if (!ext) return undefined
  return AUDIO_FORMATS.includes(ext as AudioFormat) ? (ext as AudioFormat) : undefined
}

const MIME_TO_FORMAT: Record<string, AudioFormat> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/opus': 'opus',
  'audio/webm': 'webm',
  'audio/x-ms-wma': 'wma',
  'audio/wma': 'wma',
}

/** Map a MIME type (e.g. `audio/x-m4a; codecs=...`) to a Howler format name. */
export function inferFormatFromMime(mime?: string): AudioFormat | undefined {
  if (!mime) return undefined
  return MIME_TO_FORMAT[mime.split(';')[0].trim().toLowerCase()]
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
