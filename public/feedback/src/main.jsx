import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/styles.css'

// Renderiza o app React no elemento #root
const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Expõe funções globais para o site principal controlar o React
window.renderFeedbacksApp = () => {
  console.log('✅ Feedbacks App renderizado')
}

window.unmountFeedbacksApp = () => {
  console.log('✅ Feedbacks App desmontado')
}