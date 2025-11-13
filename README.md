# 🚢 Maersk AI/ML Intern Assignment - GenAI E-commerce Insights Platform

A GenAI-based agentic system that enables natural language interaction with e-commerce data. Built with React, Node.js, LangChain, Gemini AI, and DuckDB.

## 🎯 Features

- **Natural Language Querying**: Ask questions in plain English
- **Automatic SQL Generation**: Gemini AI converts queries to SQL
- **Interactive Visualizations**: Charts powered by Chart.js
- **Conversational Memory**: Maintains context across interactions
- **Smart Utilities**: Definitions, translations, location lookups

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React + Chart.js | Chat UI + Visualizations |
| **Backend** | Node.js + Express | API + LLM Integration |
| **Database** | DuckDB | Analytical Query Engine |
| **AI** | Gemini (Google AI Studio) | SQL Generation & NLP |
| **Tools** | LangChain.js | Agent Orchestration |

## 📦 Quick Setup

### Prerequisites
- Node.js (v18+)
- Gemini API Key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

1. **Install dependencies:**
   ```bash
   npm run install-all
   ```

2. **Configure environment:**
   Create `server/.env`:
   ```env
   GOOGLE_API_KEY=your_api_key_here
   PORT=5000
   ```

3. **Download dataset:**
   - Download from [Kaggle - Brazilian E-commerce Dataset](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce/)
   - Extract CSV files to `data/csv/` directory

4. **Load data:**
   ```bash
   npm run setup-db
   ```

5. **Run application:**
   ```bash
   npm run dev
   ```

Access at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 🚀 Usage Examples

- "Which product category was the highest selling in the past 2 quarters?"
- "What is the average order value for Electronics?"
- "Show me sales trends by month"
- "Compare revenue by customer state"
- "Define what is average order value"

## 📁 Project Structure

```
assesment/
├── server/           # Backend (Express + LangChain + DuckDB)
│   ├── db/          # Database layer
│   ├── routes/      # API endpoints
│   ├── services/    # GenAI agent logic
│   └── scripts/     # Database setup
├── client/          # Frontend (React + Chart.js)
│   └── src/
│       └── components/
└── data/            # CSV files and DuckDB database
```

## 🔧 Key Design Decisions

- **DuckDB**: Fast analytical queries, zero configuration, embedded database
- **LangChain.js**: Agent framework with built-in memory management
- **Gemini AI**: Free tier, excellent SQL generation capabilities
- **Separate Frontend/Backend**: Independent scaling and deployment

## 🐛 Troubleshooting

- **Database not initialized**: Run `npm run setup-db`
- **API key errors**: Verify `GOOGLE_API_KEY` in `server/.env`
- **Port conflicts**: Change `PORT` in `server/.env`

## 📝 Notes

- Never commit `.env` files or API keys
- Rate limiting: 30 requests/minute
- Dataset: Brazilian E-commerce from Kaggle

---

**Built for Maersk AI/ML Intern Campus Hiring Assignment**


