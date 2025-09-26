import aiohttp
import asyncio
import subprocess
import json
import logging
import time
from typing import List, AsyncGenerator

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
    
    async def generate_stream(self, prompt: str, model: str) -> AsyncGenerator[str, None]:
        """Generate streaming response from Ollama"""
        try:
            if not await self.is_server_running():
                raise Exception("Ollama server is not running")
            
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": True
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