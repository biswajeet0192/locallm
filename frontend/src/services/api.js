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

  async getModels() {
    try {
      const response = await this.client.get('/models');
      return response.data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      throw new Error('Failed to fetch models. Make sure the backend is running.');
    }
  }

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

  async createSession(model, title = null) {
    try {
      const response = await this.client.post('/sessions', { model, title });
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

  async generateResponse(
    prompt, 
    model, 
    sessionId = null, 
    onChunk, 
    maxContextMessages = 10,
    images = [],
    webSearch = false,
    signal = null
  ) {
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
          max_context_messages: maxContextMessages,
          images: images.length > 0 ? images : null,
          web_search: webSearch
        }),
        signal: signal // Pass the abort signal
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

        // Check if aborted
        if (signal && signal.aborted) {
          reader.cancel();
          throw new DOMException('Aborted', 'AbortError');
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
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

      if (buffer) {
        try {
          const data = JSON.parse(buffer.replace(/^data:\s*/, ''));
          if (data.content) onChunk(data.content);
        } catch (parseError) {
          // ignore
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        throw error;
      }
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async webSearch(query, maxResults = 5) {
    try {
      const response = await this.client.post('/web-search', {
        query,
        max_results: maxResults
      });
      return response.data.results || [];
    } catch (error) {
      console.error('Error performing web search:', error);
      throw new Error('Web search failed');
    }
  }

  async uploadImage(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await this.client.post('/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Image upload failed');
    }
  }
}

export const apiService = new ApiService();