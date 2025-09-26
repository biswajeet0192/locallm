import { useState, useCallback } from 'react';
import { apiService } from '../services/api';

export const useChat = (selectedModel) => {
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const sendMessage = useCallback(
    async (content) => {
      if (!selectedModel || !content.trim()) return;

      const userMessage = {
        type: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      // add user message
      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);

      // placeholder AI message
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
          (chunk) => {
            aiResponse += chunk;
            setMessages((prev) => {
              // update last message only
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                ...aiMessage,
                content: aiResponse,
              };
              return newMessages;
            });
          }
        );
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
    [selectedModel]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setIsGenerating(false);
  }, []);

  return {
    messages,
    isGenerating,
    sendMessage,
    clearChat,
  };
};
