import { useParams } from 'react-router-dom'

export default function PlaylistDetailPage() {
  const { id } = useParams()
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Playlist</h2>
      <p className="mt-2 text-slate-400">ID: {id}</p>
    </div>
  )
}
