import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@manifest-app/ui/styles.css'
import './app.css'
import { App } from './app.js'
import { ErrorBoundary } from './error-boundary.js'
import { createPlatform } from './platform/api.js'

const root = document.getElementById('root')
if (root === null) throw new Error('index.html has no #root')

// A browser sends its own cookie and Origin: the platform is asked on the page's own origin.
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App platform={createPlatform({ origin: window.location.origin })} />
    </ErrorBoundary>
  </StrictMode>,
)
