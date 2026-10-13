import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { createBookmarkSource } from './core/adapters/createBookmarkSource.ts'

const source = createBookmarkSource()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App source={source} />
  </StrictMode>,
)
