import { memo } from 'react'
import { Music } from 'lucide-react'

interface AlbumArtProps {
  size?: 'sm' | 'lg'
}

function AlbumArtComponent({ size = 'lg' }: AlbumArtProps) {
  const isLg = size === 'lg'
  const dim = isLg ? 'h-64 w-64 sm:h-72 sm:w-72' : 'h-10 w-10'

  return (
    <div
      className={`${dim} flex flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 shadow-lg`}
    >
      <Music size={isLg ? 48 : 20} className="text-indigo-400/60" />
    </div>
  )
}

const AlbumArt = memo(AlbumArtComponent)
export default AlbumArt
