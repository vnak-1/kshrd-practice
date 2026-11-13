import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
// Loaded second on purpose: theme.css holds colour and motion, and it is
// meant to win over the layout rules in styles.css.
import './theme.css'

const host = document.getElementById('root')
if (host) {
  createRoot(host).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
