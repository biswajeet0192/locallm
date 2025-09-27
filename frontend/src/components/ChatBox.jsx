// frontend/src/components/ChatBox.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, MessageSquare, Image as ImageIcon, X, Globe, StopCircle } from 'lucide-react';
import MessageFormatter from './MessageFormatter';
import { useTheme } from '../context/ThemeContext';

const ChatBox = ({ messages, isGenerating, onSendMessage, onStopGeneration, disabled, currentSession }) => {
  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const { isDark } = useTheme();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageAttach = async (e) => {
    const files = Array.from(e.target.files);
    
    if (attachedImages.length + files.length > 3) {
      alert('You can only attach up to 3 images');
      return;
    }

    const newImages = await Promise.all(
      files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              data: e.target.result.split(',')[1], // Base64 without prefix
              preview: e.target.result,
              name: file.name
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    setAttachedImages([...attachedImages, ...newImages]);
  };

  const removeImage = (index) => {
    setAttachedImages(attachedImages.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || disabled || isGenerating) return;
    
    onSendMessage(input.trim(), attachedImages.map(img => img.data), webSearchEnabled);
    setInput('');
    setAttachedImages([]);
    setWebSearchEnabled(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-container">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center max-w-md">
              <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-xl font-medium mb-2">
                {currentSession ? 'Continue your conversation' : 'Start a conversation with your AI assistant'}
              </h3>
              {currentSession ? (
                <div className="mb-4">
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">Session: {currentSession.title}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Model: {currentSession.model}</p>
                </div>
              ) : (
                <p className="text-sm mt-2 mb-4">Select a model and type your message below</p>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h4 className="font-medium text-blue-900 mb-2">💡 Image Recognition Made Easy</h4>
                <p className="text-sm text-blue-800">
                  You can now use powerful <strong>image recognition</strong> features directly within the chat — but make sure to use the <strong>llava</strong> model, as it's the only one that supports image processing.<br /><br />
                  If the model isn’t available on your system yet, simply open your terminal and run:
                  <code className="block bg-blue-100 p-1 rounded mt-2 text-blue-900">ollama pull llava</code>
                  <br />
                  Once the download is complete, you can start the model and begin analyzing images effortlessly.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex max-w-[80%] ${
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white ml-3'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 mr-3'
                    }`}
                  >
                    {message.type === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  
                  {/* Message Content */}
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {message.type === 'ai' ? (
                        <MessageFormatter content={message.content} />
                      ) : (
                        message.content
                      )}
                    </div>
                    {message.timestamp && (
                      <div
                        className={`text-xs mt-1 ${
                          message.type === 'user'
                            ? 'text-blue-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator with Stop button */}
            {isGenerating && (
              <div className="flex justify-start">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 mr-3 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="space-y-2">
                    <div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-600 dark:text-gray-300" />
                        <span className="text-gray-600 dark:text-gray-300">Thinking...</span>
                      </div>
                    </div>
                    <button
                      onClick={onStopGeneration}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors shadow-sm"
                    >
                      <StopCircle className="w-4 h-4" />
                      <span>Stop Generating</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
        {/* Image Preview */}
        {attachedImages.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedImages.map((img, idx) => (
              <div key={idx} className="relative">
                <img
                  src={img.preview}
                  alt={img.name}
                  className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Web Search Indicator */}
        {webSearchEnabled && (
          <div className="mb-2 flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
            <Globe className="w-4 h-4" />
            <span>Web search enabled</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                disabled
                  ? 'Please start the server and select a model first'
                  : currentSession 
                  ? 'Continue your conversation... (Press Enter to send, Shift+Enter for new line)'
                  : 'Start a new conversation... (Press Enter to send, Shift+Enter for new line)'
              }
              disabled={disabled || isGenerating}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-2">
              {/* Image Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isGenerating || attachedImages.length >= 3}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attach images (max 3)"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageAttach}
                className="hidden"
              />

              {/* Web Search Toggle
              <button
                type="button"
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                disabled={disabled || isGenerating}
                className={`p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  webSearchEnabled
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title="Enable web search"
              >
                <Globe className="w-5 h-5" />
              </button> */}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || disabled || isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
        
        {/* Context indicator */}
        {currentSession && messages.length > 0 && (
          <div className="mt-2 flex items-center justify-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full flex items-center space-x-1">
              <MessageSquare className="w-3 h-3" />
              <span>Context-aware conversation • {messages.length} messages</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBox;