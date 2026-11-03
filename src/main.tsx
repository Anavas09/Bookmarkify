import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { createBookmarkSource } from './core/adapters/createBookmarkSource.ts'
import { createLinkChecker } from './core/adapters/createLinkChecker.ts'

const source = createBookmarkSource()
const checker = createLinkChecker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App source={source} checker={checker} />
  </StrictMode>,
)
