// frontend/src/components/SessionSidebar.jsx
import React, { useState } from 'react';
import { 
  MessageCircle, 
  Plus, 
  Trash2, 
  Calendar, 
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';

const SessionSidebar = ({ 
  sessions, 
  currentSession, 
  onSessionSelect, 
  onSessionDelete, 
  onNewSession,
  selectedModel,
  isCollapsed,
  onToggleCollapsed
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const handleDelete = async (sessionId, e) => {
    e.stopPropagation();
    if (deleteConfirm === sessionId) {
      await onSessionDelete(sessionId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(sessionId);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleNewSession = () => {
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }
    onNewSession(selectedModel);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-100 border-r border-gray-200 flex flex-col">
        <button
          onClick={onToggleCollapsed}
          className="p-3 hover:bg-gray-200 transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={handleNewSession}
          className="p-3 hover:bg-gray-200 transition-colors"
          title="New chat"
        >
          <Plus className="w-5 h-5" />
        </button>
        <div className="flex-1 overflow-y-auto">
          {sessions.slice(0, 8).map((session) => (
            <button
              key={session.id}
              onClick={() => onSessionSelect(session.id)}
              className={`w-full p-3 hover:bg-gray-200 transition-colors relative ${
                currentSession?.id === session.id ? 'bg-blue-100' : ''
              }`}
              title={session.title}
            >
              <MessageCircle className="w-4 h-4" />
              {session.message_count > 0 && (
                <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {session.message_count > 9 ? '9+' : session.message_count}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
          <button
            onClick={onToggleCollapsed}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={handleNewSession}
          disabled={!selectedModel}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search */}
      {sessions.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">
              {sessions.length === 0 ? 'No chat history yet' : 'No matching chats found'}
            </p>
            <p className="text-xs mt-2">
              {sessions.length === 0 ? 'Start a new conversation!' : 'Try a different search term'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={`group relative p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                  currentSession?.id === session.id
                    ? 'bg-blue-100 border-l-4 border-blue-500'
                    : 'bg-white hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {session.title}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatDate(session.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {session.model}
                      </span>
                      {session.message_count > 0 && (
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {session.message_count}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDelete(session.id, e)}
                    className={`ml-2 p-1 rounded transition-all ${
                      deleteConfirm === session.id
                        ? 'bg-red-100 text-red-600'
                        : 'opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500'
                    }`}
                    title={deleteConfirm === session.id ? 'Click again to confirm' : 'Delete chat'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionSidebar;