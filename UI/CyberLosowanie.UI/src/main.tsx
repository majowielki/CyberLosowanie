import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import store, { persistor } from './app/store'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { StrictMode } from 'react'
import { useTranslation } from '@/shared/i18n'

// Rendered inside the Provider, so the hook works; before rehydration the
// store holds the default language (pl), which matches most users.
function PersistLoading() {
  const { t } = useTranslation()
  return <div>{t('common.action.loading')}</div>
}

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <PersistGate loading={<PersistLoading />} persistor={persistor}>
      <StrictMode>
        <App />
      </StrictMode>
    </PersistGate>
  </Provider>
)
