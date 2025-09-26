from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.ollama_service import OllamaService
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
ollama_service = OllamaService()

class GenerateRequest(BaseModel):
    prompt: str
    model: str

@router.get("/models")
async def get_models():
    """Get all available Ollama models"""
    try:
        models = await ollama_service.get_models()
        return {"models": models}
    except Exception as e:
        logger.error(f"Error fetching models: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")

@router.post("/generate")
async def generate_response(request: GenerateRequest):
    """Generate response from Ollama model with streaming"""
    try:
        if not await ollama_service.is_server_running():
            raise HTTPException(status_code=503, detail="Ollama server is not running")
        
        async def generate_stream():
            try:
                async for chunk in ollama_service.generate_stream(request.prompt, request.model):
                    if chunk:
                        # Format as SSE (Server-Sent Events)
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e:
                logger.error(f"Error in stream generation: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/plain; charset=utf-8"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.get("/server-status")
async def get_server_status():
    """Check if Ollama server is running"""
    try:
        is_running = await ollama_service.is_server_running()
        return {"running": is_running}
    except Exception as e:
        logger.error(f"Error checking server status: {str(e)}")
        return {"running": False, "error": str(e)}

@router.post("/start-server")
async def start_server():
    """Start Ollama server"""
    try:
        success = await ollama_service.start_server()
        if success:
            return {"success": True, "message": "Ollama server started successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to start Ollama server")
    except Exception as e:
        logger.error(f"Error starting server: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start server: {str(e)}")