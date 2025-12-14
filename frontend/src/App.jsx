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

// Function to fetch available models for a provider
const fetchProviderModels = async (providerName) => {
  try {
    const response = await fetch('/api/models/provider', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: providerName
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
};

// Function to save API key to server
const saveProviderApiKey = async (provider, apiKey) => {
  try {
    const response = await fetch('/api/keys/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify({
        provider: provider,
        apiKey: apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error saving API key:', error);
    return { success: false, error: error.message };
  }
};

// Function to fetch provider API key from server
const fetchProviderApiKey = async (provider) => {
  try {
    const response = await fetch('/api/keys/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify({
        provider: provider
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.apiKey || null;
  } catch (error) {
    console.error('Error fetching API key:', error);
    return null;
  }
};

function App() {
  const [hasConsented, setHasConsented] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [masterPrompt, setMasterPrompt] = useState('')
  const [activeModels, setActiveModels] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [triggerSend, setTriggerSend] = useState(0)
  
  // New state for modal
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [availableModels, setAvailableModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [selectedModel, setSelectedModel] = useState(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [savingApiKey, setSavingApiKey] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    const consent = localStorage.getItem('apiKeyConsent')
    if (consent === 'true') {
      setHasConsented(true)
    } else {
      setShowConsentModal(true)
    }
  }, [])

  // Load active models from localStorage on mount
  useEffect(() => {
    if (hasConsented) {
      const savedModels = localStorage.getItem('activeModels')
      if (savedModels) {
        try {
          setActiveModels(JSON.parse(savedModels))
        } catch (error) {
          console.error('Error loading saved models:', error)
        }
      }
    }
  }, [hasConsented])

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
    
    if (value.trim() && !isStarted) {
      setIsStarted(true)
    }
  }

  const handleSendMasterPrompt = () => {
    if (masterPrompt.trim()) {
      if (!isStarted) {
        setIsStarted(true)
      }
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
    setSelectedProvider(null)
    setAvailableModels([])
    setSelectedModel(null)
    setApiKeyInput('')
    setSaveMessage('')
  }

  // Handler for when a provider icon is clicked
  const handleIconSelect = async (iconName) => {
    setSelectedProvider(iconName)
    setSelectedModel(null)
    setApiKeyInput('')
    setSaveMessage('')
    setLoadingModels(true)
    
    const models = await fetchProviderModels(iconName)
    setAvailableModels(models)
    setLoadingModels(false)
  }

  // Handler for when a model is selected from the list
  const handleModelSelect = (model) => {
    setSelectedModel(model)
    setApiKeyInput('')
    setSaveMessage('')
  }

  // Handler for saving the API key and adding the model
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setSaveMessage('❌ Please enter an API key')
      return
    }

    if (!selectedModel || !selectedProvider) {
      setSaveMessage('❌ Please select a model')
      return
    }

    setSavingApiKey(true)
    setSaveMessage('⏳ Saving...')

    // Save API key to server
    const saveResult = await saveProviderApiKey(selectedProvider, apiKeyInput)
    
    if (!saveResult.success) {
      setSaveMessage(`❌ Failed to save: ${saveResult.error}`)
      setSavingApiKey(false)
      return
    }

    // Create new model entry
    const modelName = typeof selectedModel === 'string' ? selectedModel : selectedModel.name
    const newModel = {
      id: `${selectedProvider}-${modelName}-${Date.now()}`,
      name: modelName,
      provider: selectedProvider,
      icon: icons.find(i => i.name === selectedProvider)?.path || '',
      url: `/api/chat/${selectedProvider}` // Adjust based on your API structure
    }

    // Add to active models
    const updatedModels = [...activeModels, newModel]
    setActiveModels(updatedModels)
    
    // Save to localStorage
    localStorage.setItem('activeModels', JSON.stringify(updatedModels))

    setSaveMessage('✓ Model added successfully!')
    setSavingApiKey(false)
    
    // Clear form after 1.5 seconds
    setTimeout(() => {
      setApiKeyInput('')
      setSelectedModel(null)
      setSaveMessage('')
    }, 1500)
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
              <li>• Is encrypted before storage</li>
              <li>• Always leaves local device encrypted</li>
              <li>• Isn't stored on the server database</li>
              <li>• Is decrypted only before LM api call</li>
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
        {activeModels.length === 0 ? (
          <div className="noModelsMessage">
            <h2>Add your favourite models using the '+' button on the right of the master input</h2>
          </div>
        ) : (
          activeModels.map((model) => (
            <div className="Chats" key={model.id}>
              <ChatInstance
                modelName={model.name}
                modelIcon={model.icon}
                modelIdentifier={model.id}
                modelUrl={model.url}
                masterPrompt={masterPrompt}
                provider={model.provider}
                hideInputFooter={triggerSend > 0}
                triggerSend={triggerSend}
              />
            </div>
          ))
        )}
      </div>

      <div className="masterInputContainer" style={{ display: (triggerSend > 0 && activeModels.length !== 0) ? 'none' : 'flex' }}>
        <input
          className="masterInput"
          value={masterPrompt}
          onChange={handleMasterPromptChange}
          onKeyDown={handleKeyPress}
          placeholder="This is the master input. Type your message..."
        />
        <button className="masterAddButton" onClick={handleAddModel} title="Add custom model">
          +
        </button>
      </div>

      {showAddModal && (
        <div className="modalOverlay" onClick={handleCloseAddModal}>
          <div className="addModal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Custom Chatbot Instance</h2>
            <div>
              <div className="modalContentGrid">
                
                {/* Left Column: Icon/Category Selector */}
                <div className="modalLeftColumn">
                  <div className="iconSelectorGrid">
                    {icons.map((icon) => (
                      <div 
                        key={icon.name} 
                        className={`iconSelectItem ${selectedProvider === icon.name ? 'selected' : ''}`}
                        onClick={() => handleIconSelect(icon.name)}
                      >
                        <img src={icon.path} alt={icon.name} className="modelIconLarge" />
                        <p>{icon.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Right Column: Model List and API Key Input */}
                <div className="modalRightColumn">
                  <h3>⚙️ Available Models:</h3>
                  <div className="modalWIP">
                    {loadingModels ? (
                      <p className="loadingText">Loading models...</p>
                    ) : selectedProvider ? (
                      availableModels.length > 0 ? (
                        <ul className="modelsList">
                          {availableModels.map((model, index) => {
                            const modelName = typeof model === 'string' ? model : model.name
                            const isSelected = selectedModel && 
                              (typeof selectedModel === 'string' ? selectedModel : selectedModel.name) === modelName
                            return (
                              <li 
                                key={index} 
                                className={`modelItem ${isSelected ? 'selectedModel' : ''}`}
                                onClick={() => handleModelSelect(model)}
                              >
                                {modelName}
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p className="emptyText">No models available for {selectedProvider}</p>
                      )
                    ) : (
                      <p className="emptyText">← Select a provider to view available models</p>
                    )}
                  </div>

                    <div className="apiKeySection">
                      <h3>🔑 API Key:</h3>
                      <input
                        type="password"
                        className="apiKeyInput"
                        placeholder="Enter your API key..."
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        disabled={savingApiKey}
                      />
                      <button 
                        className="saveKeyButton"
                        onClick={handleSaveApiKey}
                        disabled={savingApiKey || !apiKeyInput.trim()}
                      >
                        {savingApiKey ? 'Saving...' : 'Save & Add Model'}
                      </button>
                      {saveMessage && (
                        <p className={`saveMessage ${saveMessage.includes('✓') ? 'success' : 'error'}`}>
                          {saveMessage}
                        </p>
                      )}
                    </div>
                </div>
              </div>
            </div>
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