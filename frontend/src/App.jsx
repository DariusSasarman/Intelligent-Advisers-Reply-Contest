import { useState, useEffect } from 'react'
import './App.css'
import ChatInstance from './ChatInstance'

// Import all SVG files from assets folder
const iconModules = import.meta.glob('./assets/*.svg', { eager: true })

// Create icons array from imported SVGs
const icons = Object.entries(iconModules).map(([path, module]) => {
  const fileName = path.split('/').pop().replace('.svg', '')
  return {
    path: module.default,
    name: fileName
  }
})

// Temporary models for testing - will be replaced with user-selected models
const TEMP_MODELS = [
  {
    id: 'temp-1',
    name: 'Model Alpha',
    icon: icons[0]?.path || '🤖',
    url: 'https://example.com/alpha',
    apiKey: 'temp-key-1'
  },
  {
    id: 'temp-2',
    name: 'Model Beta',
    icon: icons[1]?.path || '🤖',
    url: 'https://example.com/beta',
    apiKey: 'temp-key-2'
  },
  {
    id: 'temp-3',
    name: 'Model Gamma',
    icon: icons[2]?.path || '🤖',
    url: 'https://example.com/gamma',
    apiKey: 'temp-key-3'
  }
]

function App() {
  const [hasConsented, setHasConsented] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [masterPrompt, setMasterPrompt] = useState('')
  const [activeModels, setActiveModels] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [triggerSend, setTriggerSend] = useState(0)

  useEffect(() => {
    // Check if user has consented before
    const consent = localStorage.getItem('apiKeyConsent')
    if (consent === 'true') {
      setHasConsented(true)
    } else {
      setShowConsentModal(true)
    }
  }, [])

  const handleConsent = () => {
    localStorage.setItem('apiKeyConsent', 'true')
    setHasConsented(true)
    setShowConsentModal(false)
  }

  const handleReject = () => {
    localStorage.removeItem('apiKeyConsent')
    window.location.reload()
  }

  const handleMasterPromptChange = (e) => {
    const value = e.target.value
    setMasterPrompt(value)
    
    // Start showing chat instances when user starts typing
    if (value.trim() && !isStarted) {
      setIsStarted(true)
      // Load temporary models (will be user-selected models later)
      setActiveModels(TEMP_MODELS)
    }
  }

  const handleSendMasterPrompt = () => {
    if (masterPrompt.trim()) {
      if (!isStarted) {
        setIsStarted(true)
        setActiveModels(TEMP_MODELS)
      }
      // Trigger send in all ChatInstances by incrementing counter
      setTriggerSend(prev => prev + 1)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSendMasterPrompt()
    }
  }

  const handleAddModel = () => {
    setShowAddModal(true)
  }

  const handleCloseAddModal = () => {
    setShowAddModal(false)
  }

  if (showConsentModal) {
    return (
      <div className="consentOverlay">
        <div className="consentModal">
          <h2>🔒 Data Storage Consent</h2>
          <div className="consentContent">
            <p><strong>This application needs to store encrypted API keys in your browser.</strong></p>
            <p>We will store:</p>
            <ul>
              <li>✓ Encrypted API keys for AI models</li>
              <li>✓ Your chatbot preferences</li>
              <li>✓ Session data</li>
            </ul>
            <p><strong>Your data:</strong></p>
            <ul>
              <li>• Stays in YOUR browser only</li>
              <li>• Is encrypted before storage</li>
              <li>• Never leaves your device</li>
              <li>• Can be cleared anytime</li>
            </ul>
            <p className="warningText">⚠️ We use browser localStorage. This is required for the app to function.</p>
          </div>
          <div className="consentButtons">
            <button className="consentButton acceptButton" onClick={handleConsent}>
              ✓ I Accept
            </button>
            <button className="consentButton rejectButton" onClick={handleReject}>
              ✕ Reject & Reload
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!hasConsented) {
    return null
  }

  return (
    <div className="app">
      <div className="welcomeScreen" style={{ display: isStarted ? 'none' : 'flex' }}>
        <h1 className="welcomeTitle">Ready when you are.</h1>
        
        <div className="iconGrid">
          {icons.slice(0, 10).map((icon, index) => (
            <div key={index} className="iconWrapper">
              <img src={icon.path} alt={icon.name} className="modelIcon" />
            </div>
          ))}
        </div>
      </div>

      <div className="chatGrid" style={{ display: isStarted ? 'flex' : 'none' }}>
        {activeModels.map((model) => (
          <ChatInstance
            key={model.id}
            modelName={model.name}
            modelIcon={model.icon}
            modelIdentifier={model.id}
            modelUrl={model.url}
            masterPrompt={masterPrompt}
            encryptedApiKey={model.apiKey}
            hideInputFooter={triggerSend > 0}
            triggerSend={triggerSend}
          />
        ))}
      </div>

      <div className="masterInputContainer" style={{ display: triggerSend > 0 ? 'none' : 'flex' }}>
        <input
          className="masterInput"
          value={masterPrompt}
          onChange={handleMasterPromptChange}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
        />
        <button className="masterAddButton" onClick={handleAddModel} title="Add custom model">
          +
        </button>
      </div>

      {showAddModal && (
        <div className="modalOverlay" onClick={handleCloseAddModal}>
          <div className="addModal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Custom Chatbot Instance</h2>
            <p className="modalPlaceholder">
              Custom model configuration will go here...
            </p>
            <button className="closeModalButton" onClick={handleCloseAddModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App