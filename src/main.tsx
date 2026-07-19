import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { revokeAllAudioUrls } from './db/audioStorage'
import './index.css'

// Revoke any outstanding object URLs on tab close so we don't leak blob
// references that keep the parsed audio file pinned in memory.
window.addEventListener('beforeunload', revokeAllAudioUrls)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
