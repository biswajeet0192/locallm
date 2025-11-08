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
        logger.info(f"OllamaService initialized with base_url: {self.base_url}")
    
    async def is_server_running(self) -> bool:
        """Check if Ollama server is running"""
        logger.debug(f"is_server_running called - checking server at {self.base_url}")
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.get(f"{self.base_url}/api/tags") as response:
                    is_running = response.status == 200
                    logger.info(f"is_server_running output - Server status: {is_running}, HTTP status: {response.status}")
                    return is_running
        except Exception as e:
            logger.debug(f"is_server_running output - Server not running: {str(e)}")
            return False
    
    async def start_server(self) -> bool:
        """Start Ollama server as background process"""
        logger.info("start_server called - attempting to start Ollama server")
        try:
            if await self.is_server_running():
                logger.info("start_server output - Ollama server is already running, no action needed")
                return True
            
            logger.info("start_server - Spawning ollama serve process")
            self.server_process = subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True
            )
            logger.debug(f"start_server - Process spawned with PID: {self.server_process.pid}")
            
            await asyncio.sleep(3)
            logger.debug("start_server - Initial 3-second wait completed, checking server status")
            
            max_retries = 10
            for i in range(max_retries):
                logger.debug(f"start_server - Retry {i+1}/{max_retries}: Checking if server is running")
                if await self.is_server_running():
                    logger.info(f"start_server output - Ollama server started successfully after {i+1} retries")
                    return True
                await asyncio.sleep(1)
            
            logger.error(f"start_server output - Ollama server failed to start within timeout ({max_retries} seconds)")
            return False
            
        except FileNotFoundError:
            logger.error("start_server output - Ollama not found. Please install Ollama first.")
            return False
        except Exception as e:
            logger.error(f"start_server output - Error starting Ollama server: {str(e)}", exc_info=True)
            return False
    
    async def get_models(self) -> List[str]:
        """Get list of available models"""
        logger.info("get_models called - fetching available models")
        try:
            if not await self.is_server_running():
                logger.error("get_models error - Ollama server is not running")
                raise Exception("Ollama server is not running")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/api/tags") as response:
                    logger.debug(f"get_models - Received response with status: {response.status}")
                    if response.status == 200:
                        data = await response.json()
                        models = [model["name"] for model in data.get("models", [])]
                        logger.info(f"get_models output - Retrieved {len(models)} models: {models}")
                        return models
                    else:
                        logger.error(f"get_models error - Failed to fetch models, HTTP status: {response.status}")
                        raise Exception(f"Failed to fetch models: {response.status}")
        except Exception as e:
            logger.error(f"get_models error - {str(e)}", exc_info=True)
            raise
    
    def _format_messages_for_ollama(self, context_messages: List[Dict[str, Any]], current_prompt: str) -> str:
        """Format conversation history and current prompt for Ollama"""
        prompt_preview = current_prompt[:100] + "..." if len(current_prompt) > 100 else current_prompt
        logger.debug(f"_format_messages_for_ollama called with inputs - context_messages: {len(context_messages)}, "
                    f"prompt_length: {len(current_prompt)}, prompt_preview: '{prompt_preview}'")
        
        if not context_messages:
            logger.debug("_format_messages_for_ollama output - No context messages, returning prompt as-is")
            return current_prompt
        
        conversation_parts = []
        conversation_parts.append("You are a helpful AI assistant. Use the conversation history below to provide contextually relevant responses.")
        conversation_parts.append("\nConversation History:")
        
        for i, msg in enumerate(context_messages):
            role = "Human" if msg["role"] == "user" else "Assistant"
            content_preview = msg['content'][:50] + "..." if len(msg['content']) > 50 else msg['content']
            logger.debug(f"_format_messages_for_ollama - Message {i+1}: role={role}, content_length={len(msg['content'])}")
            conversation_parts.append(f"\n{role}: {msg['content']}")
        
        conversation_parts.append(f"\nHuman: {current_prompt}")
        conversation_parts.append("\nAssistant:")
        
        formatted_prompt = "".join(conversation_parts)
        logger.info(f"_format_messages_for_ollama output - Formatted prompt with {len(context_messages)} context messages, "
                   f"total_length: {len(formatted_prompt)} chars")
        
        return formatted_prompt
    
    async def generate_stream(
        self, 
        prompt: str, 
        model: str, 
        context_messages: Optional[List[Dict[str, Any]]] = None,
        images: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response from Ollama with conversation context and images"""
        prompt_preview = prompt[:100] + "..." if len(prompt) > 100 else prompt
        logger.info(f"generate_stream called with inputs - model: '{model}', "
                   f"context_messages: {len(context_messages or [])}, has_images: {bool(images)}, "
                   f"prompt_length: {len(prompt)}, prompt_preview: '{prompt_preview}'")
        
        try:
            if not await self.is_server_running():
                logger.error("generate_stream error - Ollama server is not running")
                raise Exception("Ollama server is not running")
            
            formatted_prompt = self._format_messages_for_ollama(context_messages or [], prompt)
            
            payload = {
                "model": model,
                "prompt": formatted_prompt,
                "stream": True,
                "options": {
                    "temperature": 0.7,
                    "num_ctx": 4096,
                    "repeat_penalty": 1.1
                }
            }
            
            # Add images if provided (for vision models like llava)
            if images:
                logger.info(f"generate_stream - Adding {len(images)} images to payload")
                payload["images"] = images
            
            logger.debug(f"generate_stream - Sending request to {self.base_url}/api/generate with model: {model}")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    logger.debug(f"generate_stream - Received response status: {response.status}")
                    
                    if response.status != 200:
                        logger.error(f"generate_stream error - Generation request failed with status: {response.status}")
                        raise Exception(f"Generation request failed: {response.status}")
                    
                    chunk_count = 0
                    total_response_length = 0
                    
                    async for line in response.content:
                        if line:
                            try:
                                line_str = line.decode('utf-8').strip()
                                if line_str:
                                    data = json.loads(line_str)
                                    if "response" in data:
                                        chunk_count += 1
                                        chunk_text = data["response"]
                                        total_response_length += len(chunk_text)
                                        
                                        if chunk_count == 1:
                                            logger.info("generate_stream - First chunk received, streaming started")
                                        
                                        yield chunk_text
                                        
                                    if data.get("done", False):
                                        logger.info(f"generate_stream output - Streaming completed successfully, "
                                                   f"chunks: {chunk_count}, total_response_length: {total_response_length} chars")
                                        break
                            except json.JSONDecodeError as je:
                                logger.debug(f"generate_stream - JSON decode error in chunk: {str(je)}")
                                continue
                            except Exception as e:
                                logger.error(f"generate_stream - Error processing stream chunk: {str(e)}")
                                continue
                    
                    if chunk_count == 0:
                        logger.warning("generate_stream output - No chunks received during streaming")
                                
        except Exception as e:
            logger.error(f"generate_stream error - model: '{model}', Error: {str(e)}", exc_info=True)
            raise