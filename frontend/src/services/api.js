// frontend/src/services/api.js
import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
    });
  }

  // Model operations
  async getModels() {
    try {
      const response = await this.client.get('/models');
      return response.data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      throw new Error(
        'Failed to fetch models. Make sure the backend is running.'
      );
    }
  }

  // Server operations
  async getServerStatus() {
    try {
      const response = await this.client.get('/server-status');
      return response.data;
    } catch (error) {
      console.error('Error checking server status:', error);
      return { running: false, error: error.message };
    }
  }

  async startServer() {
    try {
      const response = await this.client.post('/start-server');
      return response.data;
    } catch (error) {
      console.error('Error starting server:', error);
      throw new Error('Failed to start server');
    }
  }

  // Session operations
  async createSession(model, title = null) {
    try {
      const response = await this.client.post('/sessions', {
        model,
        title
      });
      return response.data;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  async getSessions() {
    try {
      const response = await this.client.get('/sessions');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw new Error('Failed to fetch sessions');
    }
  }

  async getSession(sessionId) {
    try {
      const response = await this.client.get(`/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching session:', error);
      throw new Error('Failed to fetch session');
    }
  }

  async getSessionMessages(sessionId) {
    try {
      const response = await this.client.get(`/sessions/${sessionId}/messages`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching session messages:', error);
      throw new Error('Failed to fetch session messages');
    }
  }

  async deleteSession(sessionId) {
    try {
      const response = await this.client.delete(`/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error('Failed to delete session');
    }
  }

  // Message generation with context
  async generateResponse(prompt, model, sessionId = null, onChunk, maxContextMessages = 10) {
    try {
      const response = await fetch(`${BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt, 
          model, 
          session_id: sessionId,
          max_context_messages: maxContextMessages 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        // keep incomplete last line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) throw new Error(data.error);
              if (data.content) onChunk(data.content);
              if (data.done) return;
            } catch (parseError) {
              console.error('Parse error:', parseError);
            }
          }
        }
      }

      // flush last chunk if any
      if (buffer) {
        try {
          const data = JSON.parse(buffer.replace(/^data:\s*/, ''));
          if (data.content) onChunk(data.content);
        } catch (parseError) {
          // ignore
        }
      }
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();