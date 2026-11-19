import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/jetbrains-mono/index.css'
import '@fontsource-variable/pixelify-sans/index.css'
import App from './App'
import { ImageViewerProvider } from './components/ImageViewer'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ImageViewerProvider>
      <App />
    </ImageViewerProvider>
  </React.StrictMode>,
)
