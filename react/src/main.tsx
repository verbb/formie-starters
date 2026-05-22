import { createRoot } from 'react-dom/client'
import './index.css'
import '@verbb/formie-browser/css/formie-base.css'
import '@verbb/formie-browser/css/formie-theme.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <App />,
)
