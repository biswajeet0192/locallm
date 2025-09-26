# 🧠 Local LLM Chatbot – Frontend (React)

This is the **React frontend** for the Local LLM Chatbot application.  
It provides a ChatGPT-style UI to interact with a local LLM via the FastAPI backend.

---

## 📁 Project Structure (Frontend)

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ChatBox.jsx        # Chat interface
│   │   ├── ModelSelector.jsx  # Select available models
│   │   └── ServerStatus.jsx   # Display/start Ollama server status
│   ├── hooks/
│   │   └── useChat.js         # Custom hook for chat state management
│   ├── services/
│   │   └── api.js             # API calls to backend
│   ├── types/
│   │   └── index.js           # Types/interfaces
│   ├── App.jsx                # Main App component
│   └── index.js               # Entry point
├── package.json
└── tailwind.config.js
```

---

## 🚀 Features (Frontend)

- ✅ Modern ChatGPT-style UI built with React + TailwindCSS  
- ✅ Model selection and server status components  
- ✅ Seamless integration with FastAPI backend  
- ✅ Responsive and lightweight  

---

## 🛠️ Requirements

- [Node.js 18+](https://nodejs.org/)  
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)  

---

## ⚙️ Setup & Run (Frontend)

```bash
cd frontend
npm install
npm run dev
```

Frontend will run at: **http://localhost:3000**

---

## 🛠️ Tech Stack

- **React** (UI framework)  
- **TailwindCSS** (styling)  
- **Lucide Icons** (icons)  

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss your ideas.
