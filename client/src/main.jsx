import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './config'
import App from './App.jsx'
import './pwa'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
