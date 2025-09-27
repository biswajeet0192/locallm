import { useState, useCallback, useEffect, useRef } from 'react';
import { apiService } from '../services/api';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const abortControllerRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const sessionList = await apiService.getSessions();
      setSessions(sessionList);
      
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

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
      
      // Update the last message to indicate it was stopped
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].type === 'ai') {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (!lastMessage.content || lastMessage.content.trim() === '') {
            // Remove empty AI message
            newMessages.pop();
          } else {
            // Mark as stopped
            lastMessage.content += '\n\n[Generation stopped by user]';
          }
          return newMessages;
        }
        return prev;
      });
    }
  }, []);

  const sendMessage = useCallback(
    async (content, images = [], webSearch = false) => {
      if (!selectedModel || !content.trim()) return;

      // Stop any ongoing generation
      if (isGenerating) {
        stopGeneration();
        return;
      }

      let sessionId = currentSession?.id;

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

      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);

      const aiMessage = {
        type: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      try {
        let aiResponse = '';

        await apiService.generateResponse(
          content.trim(),
          selectedModel,
          sessionId,
          (chunk) => {
            aiResponse += chunk;
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                ...aiMessage,
                content: aiResponse,
              };
              return newMessages;
            });
          },
          10,
          images,
          webSearch,
          abortControllerRef.current.signal
        );

        await loadSessions();

      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Generation was stopped by user');
        } else {
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
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [selectedModel, currentSession, createNewSession, loadSessions, isGenerating, stopGeneration]
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
    messages,
    isGenerating,
    sendMessage,
    stopGeneration,
    clearCurrentChat,
    sessions,
    currentSession,
    createNewSession,
    switchToSession,
    deleteSession,
    loadSessions,
    startNewChat,
    selectedModel,
    setSelectedModel,
  };
};