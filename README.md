# SupportNova

AI-powered complaint management system for **TravelNova** — built for Aptech TechWiz-7 (Generative AI PowerPlay).

Every complaint runs through two independent pipelines in parallel — a Google Gemini classifier and a pure-Python rule engine — and disagreements are routed to a human Reviewer before reaching a Department Agent. See [`doc/spec.md`](doc/spec.md) for the full specification.

## Stack

- **Frontend:** React 18 + TypeScript, Tailwind CSS, Vite
- **Backend:** FastAPI (Python 3.11+), SQLAlchemy 2.0 (async), Alembic
- **Database:** PostgreSQL 15+
- **AI:** Google Gemini (`google-generativeai`)

## Project Structure

```
supportnova/
├── backend/     # FastAPI application
├── frontend/    # React application
└── doc/         # Specification, design, and planning docs
```

## Setup

### Backend

```bash
cd project/backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # fill in DATABASE_URL, GEMINI_API_KEY, JWT_SECRET_KEY
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd project/frontend
npm install
cp .env.example .env.local   # set VITE_API_URL=http://localhost:8000
npm run dev
```

## Demo Accounts

| Role     | Email                          | Password    |
|----------|---------------------------------|-------------|
| Admin    | admin@travelnova.com           | admin123    |
| Manager  | manager@travelnova.com         | manager123  |
| Reviewer | reviewer@travelnova.com        | reviewer123 |
| Agent    | agent.flights@travelnova.com   | agent123    |
| Customer | customer@example.com           | customer123 |

## Status

Project is under active development. See [`doc/task.md`](doc/task.md) for the phase-by-phase build plan.
