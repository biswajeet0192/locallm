// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import ChatBox from './components/ChatBox';
import ModelSelector from './components/ModelSelector';
import ServerStatus from './components/ServerStatus';
import SessionSidebar from './components/SessionSidebar';
import { useChat } from './hooks/useChat';
import { apiService } from './services/api';
import { useTheme } from './context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

function App() {
  const [models, setModels] = useState([]);
  const [serverRunning, setServerRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  
  const {
    messages,
    isGenerating,
    sendMessage,
    stopGeneration,
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

  const handleSendMessage = (message, images = [], webSearch = false) => {
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }
    sendMessage(message, images, webSearch);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
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
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Ollama Chatbot
                </h1>
                <ServerStatus 
                  isRunning={serverRunning} 
                  onStartServer={handleStartServer}
                />
                {currentSession && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>•</span>
                    <span className="font-medium">{currentSession.title}</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Clear Chat
                </button>
                <button
                  onClick={toggleTheme}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Chat Interface */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full">
            <ChatBox
              messages={messages}
              isGenerating={isGenerating}
              onSendMessage={handleSendMessage}
              onStopGeneration={stopGeneration}
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