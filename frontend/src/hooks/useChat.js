// frontend/src/hooks/useChat.js
import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/api';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');

  // Load sessions on hook initialization
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const sessionList = await apiService.getSessions();
      setSessions(sessionList);
      
      // If we have a current session but it's not in the list, clear it
      if (currentSession && !sessionList.find(s => s.id === currentSession.id)) {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
    }
  }, [currentSession]);

  const createNewSession = useCallback(async (model, title = null) => {
    try {
      const newSession = await apiService.createSession(model, title);
      await loadSessions();
      setCurrentSession(newSession);
      setMessages([]);
      setSelectedModel(model);
      return newSession;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }, [loadSessions]);

  const switchToSession = useCallback(async (sessionId) => {
    try {
      const session = await apiService.getSession(sessionId);
      const sessionMessages = await apiService.getSessionMessages(sessionId);
      
      setCurrentSession(session);
      setSelectedModel(session.model);
      
      // Convert database messages to frontend format
      const formattedMessages = sessionMessages.map(msg => ({
        type: msg.role === 'user' ? 'user' : 'ai',
        content: msg.content,
        timestamp: msg.timestamp
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error switching session:', error);
      throw error;
    }
  }, []);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      await apiService.deleteSession(sessionId);
      await loadSessions();
      
      // If we deleted the current session, clear it
      if (currentSession && currentSession.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
        setSelectedModel('');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }, [currentSession, loadSessions]);

  const sendMessage = useCallback(
    async (content) => {
      if (!selectedModel || !content.trim()) return;

      let sessionId = currentSession?.id;

      // Create new session if none exists
      if (!sessionId) {
        try {
          const newSession = await createNewSession(
            selectedModel, 
            `Chat - ${new Date().toLocaleString()}`
          );
          sessionId = newSession.id;
        } catch (error) {
          console.error('Error creating session:', error);
          return;
        }
      }

      const userMessage = {
        type: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      // Add user message to UI
      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);

      // Placeholder AI message
      const aiMessage = {
        type: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      try {
        let aiResponse = '';

        await apiService.generateResponse(
          content.trim(),
          selectedModel,
          sessionId,
          (chunk) => {
            aiResponse += chunk;
            setMessages((prev) => {
              // Update the last message (AI response)
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                ...aiMessage,
                content: aiResponse,
              };
              return newMessages;
            });
          }
        );

        // Refresh session list to update timestamps and message counts
        await loadSessions();

      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage = {
          type: 'ai',
          content: `Error: ${error.message || 'Failed to generate response'}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = errorMessage;
          return newMessages;
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [selectedModel, currentSession, createNewSession, loadSessions]
  );

  const clearCurrentChat = useCallback(() => {
    setMessages([]);
    setCurrentSession(null);
  }, []);

  const startNewChat = useCallback(async (model) => {
    try {
      await createNewSession(model);
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  }, [createNewSession]);

  return {
    // Messages and generation state
    messages,
    isGenerating,
    sendMessage,
    clearCurrentChat,

    // Session management
    sessions,
    currentSession,
    createNewSession,
    switchToSession,
    deleteSession,
    loadSessions,
    startNewChat,

    // Model management
    selectedModel,
    setSelectedModel,
  };
};