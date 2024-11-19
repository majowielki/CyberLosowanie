import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { store }from './features/index.ts'
import { Provider } from 'react-redux'
import { StrictMode } from 'react'

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <StrictMode>
      <App />
    </StrictMode>
  </Provider>
)
