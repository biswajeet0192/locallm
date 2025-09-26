from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import traceback

app = FastAPI(title="Ollama LLM Chat API", version="1.0.0")

# Pydantic models for request/response
class ChatRequest(BaseModel):
    question: str
    context: Optional[str] = ""

class ChatResponse(BaseModel):
    response: str
    updated_context: str

# Initialize the model and prompt - with error handling
try:
    from langchain_ollama import OllamaLLM
    from langchain_core.prompts import ChatPromptTemplate
    
    template = """
Answer the following question as best you can. 

Here is the conversation so far: {context}

Question: {question}

Answer:
"""
    
    model = OllamaLLM(model="llama3.1")
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | model
    
except Exception as e:
    print(f"Error initializing LangChain components: {e}")
    model = None
    chain = None

# In-memory storage for conversation contexts (use Redis/DB for production)
conversations = {}

@app.get("/")
async def root():
    return {"message": "Ollama LLM Chat API is running!"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to the LLM and get a response.
    Maintains conversation context.
    """
    if chain is None:
        raise HTTPException(status_code=500, detail="LangChain components not properly initialized")
    
    try:
        # Invoke the chain with explicit parameter handling
        result = chain.invoke({
            "context": request.context or "", 
            "question": request.question
        })
        
        # Ensure result is a string
        if hasattr(result, 'content'):
            result = result.content
        elif not isinstance(result, str):
            result = str(result)
        
        # Update context
        updated_context = (request.context or "") + f"\nUser: {request.question}\nAI: {result}"
        
        return ChatResponse(
            response=result,
            updated_context=updated_context
        )
    
    except Exception as e:
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@app.post("/chat/{session_id}", response_model=ChatResponse)
async def chat_with_session(session_id: str, request: ChatRequest):
    """
    Send a message with session-based context management.
    The server maintains the conversation context for each session.
    """
    if chain is None:
        raise HTTPException(status_code=500, detail="LangChain components not properly initialized")
    
    try:
        # Get existing context for this session
        context = conversations.get(session_id, "")
        
        # Invoke the chain
        result = chain.invoke({
            "context": context, 
            "question": request.question
        })
        
        # Ensure result is a string
        if hasattr(result, 'content'):
            result = result.content
        elif not isinstance(result, str):
            result = str(result)
        
        # Update context and store it
        updated_context = context + f"\nUser: {request.question}\nAI: {result}"
        conversations[session_id] = updated_context
        
        return ChatResponse(
            response=result,
            updated_context=updated_context
        )
    
    except Exception as e:
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@app.delete("/chat/{session_id}")
async def clear_session(session_id: str):
    """Clear the conversation context for a specific session."""
    if session_id in conversations:
        del conversations[session_id]
        return {"message": f"Session {session_id} cleared successfully"}
    else:
        return {"message": f"Session {session_id} not found"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)