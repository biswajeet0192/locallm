# 🧠 Local LLM Chatbot with Ollama, FastAPI & React

A full-stack chatbot application that runs a **local LLM (Llama 3.x or any Ollama model)** with a **FastAPI backend** and a **React frontend**.  

It allows you to:

- **Start/stop the Ollama server**
- **View installed models**
- **Select a model for inference**
- **Chat in a ChatGPT-style interface — all locally**

---

## 📁 Project Structure

```
ollama-chatbot/
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatBox.jsx
│   │   │   ├── ModelSelector.jsx
│   │   │   └── ServerStatus.jsx
│   │   ├── hooks/
│   │   │   └── useChat.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── types/
│   │   │   └── index.js
│   │   ├── App.jsx
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
└── backend/
    ├── routes/
    │   └── chat.py
    ├── services/
    │   └── ollama_service.py
    ├── main.py
    └── requirements.txt
```

---

## 🚀 Features

- ✅ Local LLM inference using [Ollama](https://ollama.com)  
- ✅ FastAPI backend to handle chat and model queries  
- ✅ React frontend with a modern ChatGPT-style UI  
- ✅ Model management: list, select, and switch between installed models  
- ✅ Start/stop Ollama server directly from the UI  
- ✅ Lightweight and 100% local — private by design  

---

## 🛠️ Requirements

- [Python 3.9+](https://www.python.org/downloads/)  
- [Node.js 18+](https://nodejs.org/)  
- [Ollama](https://ollama.com/download) installed locally  

---

## ⚙️ Backend Setup (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will run at: **http://localhost:8000**

---

## 🧠 Using the App

1. Ensure **Ollama** is installed and at least one model is downloaded:

   ```bash
   ollama pull llama3
   ```

2. Start the backend (FastAPI with Uvicorn):

   ```bash
   uvicorn main:app --reload
   ```

3. Start the frontend:

   ```bash
   npm run dev
   ```

4. Open **http://localhost:3000** in your browser.

   - 🔘 Click **“Start Ollama”** if the server isn’t running  
   - 📜 Click **“Get Models”** to list installed models  
   - 🤖 Select a model and start chatting  

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

- **Frontend:** React, TailwindCSS, Lucide Icons  
- **Backend:** FastAPI, Python  
- **LLM Runtime:** Ollama (Llama 3.x, Mistral, etc.)  

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss your ideas.
