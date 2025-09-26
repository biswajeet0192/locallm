import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';

const ChatBox = ({ messages, isGenerating, onSendMessage, disabled }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || disabled || isGenerating) return;
    
    onSendMessage(input.trim());
    setInput('');
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
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-xl">Start a conversation with your AI assistant</p>
              <p className="text-sm mt-2">Select a model and type your message below</p>
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
                        : 'bg-gray-200 text-gray-600 mr-3'
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
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                    {message.timestamp && (
                      <div
                        className={`text-xs mt-1 ${
                          message.type === 'user'
                            ? 'text-blue-100'
                            : 'text-gray-500'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isGenerating && (
              <div className="flex justify-start">
                <div className="flex">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 mr-3 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-gray-100">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t p-4 bg-gray-50">
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
                  : 'Type your message here... (Press Enter to send, Shift+Enter for new line)'
              }
              disabled={disabled || isGenerating}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || disabled || isGenerating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 self-end"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBox;