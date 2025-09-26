// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import ChatBox from './components/ChatBox';
import ModelSelector from './components/ModelSelector';
import ServerStatus from './components/ServerStatus';
import SessionSidebar from './components/SessionSidebar';
import { useChat } from './hooks/useChat';
import { apiService } from './services/api';

function App() {
  const [models, setModels] = useState([]);
  const [serverRunning, setServerRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const {
    messages,
    isGenerating,
    sendMessage,
    sessions,
    currentSession,
    createNewSession,
    switchToSession,
    deleteSession,
    loadSessions,
    selectedModel,
    setSelectedModel,
    startNewChat,
    clearCurrentChat
  } = useChat();

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
    // If we're starting a new chat and no current session, create one
    if (!currentSession && messages.length === 0) {
      // Will be created automatically when first message is sent
    }
  };

  const handleSendMessage = (message) => {
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }
    sendMessage(message);
  };

  const handleSessionSelect = async (sessionId) => {
    try {
      await switchToSession(sessionId);
    } catch (error) {
      console.error('Error switching session:', error);
      alert('Failed to load chat session');
    }
  };

  const handleSessionDelete = async (sessionId) => {
    try {
      await deleteSession(sessionId);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete chat session');
    }
  };

  const handleNewSession = async (model) => {
    try {
      await startNewChat(model);
    } catch (error) {
      console.error('Error starting new chat:', error);
      alert('Failed to start new chat');
    }
  };

  const handleClearChat = () => {
    clearCurrentChat();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <SessionSidebar
        sessions={sessions}
        currentSession={currentSession}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
        onNewSession={handleNewSession}
        selectedModel={selectedModel}
        isCollapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  Ollama Chatbot
                </h1>
                <ServerStatus 
                  isRunning={serverRunning} 
                  onStartServer={handleStartServer}
                />
                {currentSession && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>•</span>
                    <span className="font-medium">{currentSession.title}</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {currentSession.model}
                    </span>
                  </div>
                )}
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
                  onClick={handleClearChat}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Clear Chat
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Chat Interface */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="bg-white rounded-lg shadow-sm h-full">
            <ChatBox
              messages={messages}
              isGenerating={isGenerating}
              onSendMessage={handleSendMessage}
              disabled={!serverRunning || !selectedModel}
              currentSession={currentSession}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;