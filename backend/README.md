# 🧠 Local LLM Chatbot – Backend (FastAPI)

This is the **FastAPI backend** for the Local LLM Chatbot application.  
It provides API endpoints to interact with the local LLM (via Ollama) and serves data to the React frontend.

---

## 📁 Project Structure (Backend)

```
backend/
├── routes/
│   └── chat.py            # Routes for chat requests
├── services/
│   └── ollama_service.py  # Logic to communicate with Ollama
├── main.py                # FastAPI app entry point
└── requirements.txt       # Python dependencies
```

---

## 🚀 Features (Backend)

- ✅ FastAPI backend to handle chat and model queries  
- ✅ Start/stop Ollama server from API  
- ✅ List and switch between installed models  
- ✅ Generate model responses via API  
- ✅ 100% local – private by design  

---

## 🛠️ Requirements

- [Python 3.9+](https://www.python.org/downloads/)  
- [Ollama](https://ollama.com/download) installed locally  

---

## ⚙️ Setup & Run (Backend)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will run at: **http://localhost:8000**

---

## 📡 API Endpoints

| Method | Endpoint   | Description                    |
|--------|------------|--------------------------------|
| GET    | `/models`  | Get a list of installed models |
| POST   | `/generate`| Generate a response from model |
| GET    | `/status`  | Check if Ollama server running |
| POST   | `/start`   | Start the Ollama server        |

---

## 🛠️ Tech Stack

- **FastAPI** (Python web framework)  
- **Uvicorn** (ASGI server)  
- **Ollama** (local LLM runtime)  

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss your ideas.
