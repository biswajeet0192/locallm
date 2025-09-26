import React, { useState, useEffect } from 'react';
import ChatBox from './components/ChatBox';
import ModelSelector from './components/ModelSelector';
import ServerStatus from './components/ServerStatus';
import { useChat } from './hooks/useChat';
import { apiService } from './services/api';

function App() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [serverRunning, setServerRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const {
    messages,
    isGenerating,
    sendMessage,
    clearChat
  } = useChat(selectedModel);

  // Check server status and load models on component mount
  useEffect(() => {
    checkServerStatus();
    loadModels();
  }, []);

  const checkServerStatus = async () => {
    try {
      const status = await apiService.getServerStatus();
      setServerRunning(status.running);
    } catch (error) {
      console.error('Error checking server status:', error);
      setServerRunning(false);
    }
    setLoading(false);
  };

  const loadModels = async () => {
    try {
      const modelList = await apiService.getModels();
      setModels(modelList);
      if (modelList.length > 0 && !selectedModel) {
        setSelectedModel(modelList[0]);
      }
    } catch (error) {
      console.error('Error loading models:', error);
      setModels([]);
    }
  };

  const handleStartServer = async () => {
    try {
      await apiService.startServer();
      // Wait a moment then check status and reload models
      setTimeout(() => {
        checkServerStatus();
        loadModels();
      }, 2000);
    } catch (error) {
      console.error('Error starting server:', error);
    }
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
  };

  const handleSendMessage = (message) => {
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }
    sendMessage(message);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Ollama Chatbot</h1>
              <ServerStatus 
                isRunning={serverRunning} 
                onStartServer={handleStartServer}
              />
            </div>
            <div className="flex items-center space-x-4">
              <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onModelSelect={handleModelSelect}
                onRefresh={loadModels}
                disabled={!serverRunning}
              />
              <button
                onClick={clearChat}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Interface */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm h-[calc(100vh-200px)]">
          <ChatBox
            messages={messages}
            isGenerating={isGenerating}
            onSendMessage={handleSendMessage}
            disabled={!serverRunning || !selectedModel}
          />
        </div>
      </main>
    </div>
  );
}

export default App;