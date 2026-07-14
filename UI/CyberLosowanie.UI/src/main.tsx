import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import store, { persistor } from './app/store'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { StrictMode } from 'react'

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
      <StrictMode>
        <App />
      </StrictMode>
    </PersistGate>
  </Provider>
)
