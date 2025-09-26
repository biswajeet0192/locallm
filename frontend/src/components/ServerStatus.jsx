import React, { useState } from 'react';
import { Server, Play, Loader2 } from 'lucide-react';

const ServerStatus = ({ isRunning, onStartServer }) => {
  const [starting, setStarting] = useState(false);

  const handleStartServer = async () => {
    setStarting(true);
    try {
      await onStartServer();
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
        <Server className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          Server: {isRunning ? 'Running' : 'Stopped'}
        </span>
      </div>
      
      {!isRunning && (
        <button
          onClick={handleStartServer}
          disabled={starting}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {starting ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Play className="w-3 h-3 mr-1" />
          )}
          {starting ? 'Starting...' : 'Start Server'}
        </button>
      )}
    </div>
  );
};

export default ServerStatus;