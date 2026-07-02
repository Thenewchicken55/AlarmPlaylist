import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Trash2, FolderOpen, FileText } from 'lucide-react'
import TrackList from '../components/playlist/TrackList'
import Button from '../components/ui/Button'
import { usePlaylistStore } from '../stores/playlistStore'
import { usePlayerStore } from '../stores/playerStore'
import type { Track } from '../types'
import { toast } from 'sonner'
import { pluralize } from '../utils/format'
import { parseM3U, parsePLS } from '../utils/playlistParser'
import { storeAudioFile, getAudioUrl } from '../db/audioStorage'
import { getAudioDuration } from '../utils/audio'

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const m3uInputRef = useRef<HTMLInputElement>(null)

  const playlists = usePlaylistStore((s) => s.playlists)
  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists)
  const addTrack = usePlaylistStore((s) => s.addTrack)
  const removeTrack = usePlaylistStore((s) => s.removeTrack)
  const reorderTracks = usePlaylistStore((s) => s.reorderTracks)
  const importLocalFiles = usePlaylistStore((s) => s.importLocalFiles)
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist)

  const playQueue = usePlayerStore((s) => s.playQueue)
  const playTrack = usePlayerStore((s) => s.playTrack)
  const currentTrack = usePlayerStore((s) => s.currentTrack)

  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

  const found = playlists.find((p) => p.id === id)
  if (!found) {
    return (
      <div className="flex items-center justify-center p-6" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
        <p className="text-slate-500">Playlist not found</p>
      </div>
    )
  }

  const playlist = found

  async function handleDelete() {
    if (confirm('Delete this playlist and all its tracks?')) {
      await deletePlaylist(playlist.id)
      toast.info('Playlist deleted')
      navigate('/playlists')
    }
  }

  async function handleImport(files: FileList) {
    try {
      await importLocalFiles(playlist.id, files)
      toast.success(`Imported ${files.length} ${pluralize(files.length, 'file')}`)
    } catch {
      toast.error('Failed to import files')
    }
  }

  async function handleImportFolder() {
    try {
      const handle = await (window as any).showDirectoryPicker()
      const entries: File[] = []
      const audioExts = new Set(['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus', '.wma'])
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && audioExts.has(entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase())) {
          const file = await entry.getFile()
          entries.push(file)
        }
      }
      if (entries.length === 0) {
        toast.info('No audio files found in folder')
        return
      }
      await importLocalFiles(playlist.id, entries as any)
      toast.success(`Imported ${entries.length} files from folder`)
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.name !== 'SecurityError') {
        toast.error('Failed to import folder')
      }
    }
  }

  async function handleImportM3U(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const ext = file.name.split('.').pop()?.toLowerCase()
      const tracks = ext === 'pls' ? parsePLS(text, file.name) : parseM3U(text, file.name)

      if (tracks.length === 0) {
        toast.info('No valid tracks found in playlist file')
        return
      }

      for (const track of tracks) {
        if (track.url && !track.url.startsWith('http')) {
          try {
            const response = await fetch(track.url)
            const blob = await response.blob()
            const audioFile = new File([blob], track.title + '.mp3', { type: blob.type })
            const blobId = await storeAudioFile(audioFile)
            track.blobId = blobId
            track.url = await getAudioUrl(blobId)
            track.duration = await getAudioDuration(audioFile)
          } catch {
            track.url = undefined
          }
        }
        await addTrack(playlist.id, track)
      }

      toast.success(`Imported ${tracks.length} tracks from ${file.name}`)
    } catch {
      toast.error('Failed to parse playlist file')
    }
    e.target.value = ''
  }

  function handlePlayAll() {
    if (playlist.tracks.length > 0) {
      playQueue(playlist.tracks, 0)
      navigate('/player')
    }
  }

  function handlePlayTrack(track: Track, index: number) {
    playTrack(track, playlist.tracks, index)
    navigate('/player')
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/playlists')}
          className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: playlist.color + '20' }}
          >
            <Play size={28} style={{ color: playlist.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-100">{playlist.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {playlist.tracks.length} {pluralize(playlist.tracks.length, 'track')}
              {' · '}
              <span className="capitalize">{playlist.source}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={handlePlayAll} disabled={playlist.tracks.length === 0}>
                <Play size={16} />
                Play All
              </Button>
              {'showDirectoryPicker' in window && (
                <Button variant="secondary" size="sm" onClick={handleImportFolder}>
                  <FolderOpen size={16} />
                  Folder
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => m3uInputRef.current?.click()}>
                <FileText size={16} />
                Import .m3u
              </Button>
              <input
                ref={m3uInputRef}
                type="file"
                accept=".m3u,.pls"
                className="hidden"
                onChange={handleImportM3U}
              />
              <Button variant="ghost" size="sm" onClick={handleDelete}>
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <TrackList
        tracks={playlist.tracks}
        playlistId={playlist.id}
        currentTrackId={currentTrack?.id}
        onPlay={handlePlayTrack}
        onRemove={(trackId) => removeTrack(playlist.id, trackId)}
        onReorder={(from, to) => reorderTracks(playlist.id, from, to)}
        onImportFiles={handleImport}
      />
    </div>
  )
}
