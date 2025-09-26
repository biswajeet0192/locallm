// Message types
export const MESSAGE_TYPES = {
  USER: 'user',
  AI: 'ai'
};

// API response types
export const createMessage = (type, content, timestamp = new Date().toISOString()) => ({
  type,
  content,
  timestamp
});

// Server status types
export const SERVER_STATUS = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  STARTING: 'starting'
};