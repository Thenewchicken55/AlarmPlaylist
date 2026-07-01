import { createContext, useContext } from 'react'

export interface AudioPlayerHandle {
  seek: (percent: number) => void
}

const AudioPlayerContext = createContext<AudioPlayerHandle>({
  seek: () => {},
})

export function useAudioSeek(): (percent: number) => void {
  return useContext(AudioPlayerContext).seek
}

export default AudioPlayerContext
