# backend/services/ollama_service.py
import aiohttp
import asyncio
import subprocess
import json
import logging
import time
from typing import List, AsyncGenerator, Dict, Any, Optional

logger = logging.getLogger(__name__)

class OllamaService:
    def __init__(self):
        self.base_url = "http://localhost:11434"
        self.server_process = None
    
    async def is_server_running(self) -> bool:
        """Check if Ollama server is running"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.get(f"{self.base_url}/api/tags") as response:
                    return response.status == 200
        except Exception as e:
            logger.debug(f"Server not running: {str(e)}")
            return False
    
    async def start_server(self) -> bool:
        """Start Ollama server as background process"""
        try:
            if await self.is_server_running():
                logger.info("Ollama server is already running")
                return True
            
            # Start ollama serve in background
            self.server_process = subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True
            )
            
            # Wait a bit for server to start
            await asyncio.sleep(3)
            
            # Check if it's running
            max_retries = 10
            for i in range(max_retries):
                if await self.is_server_running():
                    logger.info("Ollama server started successfully")
                    return True
                await asyncio.sleep(1)
            
            logger.error("Ollama server failed to start within timeout")
            return False
            
        except FileNotFoundError:
            logger.error("Ollama not found. Please install Ollama first.")
            return False
        except Exception as e:
            logger.error(f"Error starting Ollama server: {str(e)}")
            return False
    
    async def get_models(self) -> List[str]:
        """Get list of available models"""
        try:
            if not await self.is_server_running():
                raise Exception("Ollama server is not running")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/api/tags") as response:
                    if response.status == 200:
                        data = await response.json()
                        models = [model["name"] for model in data.get("models", [])]
                        return models
                    else:
                        raise Exception(f"Failed to fetch models: {response.status}")
        except Exception as e:
            logger.error(f"Error getting models: {str(e)}")
            raise
    
    def _format_messages_for_ollama(self, context_messages: List[Dict[str, Any]], current_prompt: str) -> str:
        """Format conversation history and current prompt for Ollama"""
        if not context_messages:
            return current_prompt
        
        # Build conversation context
        conversation_parts = []
        
        # Add system message
        conversation_parts.append("You are a helpful AI assistant. Use the conversation history below to provide contextually relevant responses.")
        conversation_parts.append("\nConversation History:")
        
        # Add previous messages
        for msg in context_messages:
            role = "Human" if msg["role"] == "user" else "Assistant"
            conversation_parts.append(f"\n{role}: {msg['content']}")
        
        # Add current message
        conversation_parts.append(f"\nHuman: {current_prompt}")
        conversation_parts.append("\nAssistant:")
        
        return "".join(conversation_parts)
    
    async def generate_stream(self, prompt: str, model: str, context_messages: Optional[List[Dict[str, Any]]] = None) -> AsyncGenerator[str, None]:
        """Generate streaming response from Ollama with conversation context"""
        try:
            if not await self.is_server_running():
                raise Exception("Ollama server is not running")
            
            # Format prompt with context
            formatted_prompt = self._format_messages_for_ollama(context_messages or [], prompt)
            
            payload = {
                "model": model,
                "prompt": formatted_prompt,
                "stream": True,
                "options": {
                    "temperature": 0.7,
                    "num_ctx": 4096,  # Context window size
                    "repeat_penalty": 1.1
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status != 200:
                        raise Exception(f"Generation request failed: {response.status}")
                    
                    async for line in response.content:
                        if line:
                            try:
                                line_str = line.decode('utf-8').strip()
                                if line_str:
                                    data = json.loads(line_str)
                                    if "response" in data:
                                        yield data["response"]
                                    if data.get("done", False):
                                        break
                            except json.JSONDecodeError:
                                continue
                            except Exception as e:
                                logger.error(f"Error processing stream chunk: {str(e)}")
                                continue
                                
        except Exception as e:
            logger.error(f"Error in generate_stream: {str(e)}")
            raise
    
    async def generate_chat(self, messages: List[Dict[str, Any]], model: str) -> AsyncGenerator[str, None]:
        """Generate response using Ollama's chat API (if available)"""
        try:
            if not await self.is_server_running():
                raise Exception("Ollama server is not running")
            
            payload = {
                "model": model,
                "messages": messages,
                "stream": True,
                "options": {
                    "temperature": 0.7,
                    "num_ctx": 4096,
                    "repeat_penalty": 1.1
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status != 200:
                        # Fallback to generate API
                        logger.warning("Chat API not available, falling back to generate API")
                        return
                    
                    async for line in response.content:
                        if line:
                            try:
                                line_str = line.decode('utf-8').strip()
                                if line_str:
                                    data = json.loads(line_str)
                                    if "message" in data and "content" in data["message"]:
                                        yield data["message"]["content"]
                                    if data.get("done", False):
                                        break
                            except json.JSONDecodeError:
                                continue
                            except Exception as e:
                                logger.error(f"Error processing chat chunk: {str(e)}")
                                continue
                                
        except Exception as e:
            logger.error(f"Error in generate_chat: {str(e)}")
            # Fallback to generate_stream
            async for chunk in self.generate_stream(messages[-1]["content"], model, messages[:-1]):
                yield chunk