# EMS AI Quotation System — Full Agent

## Setup

### 1. Create and activate venv
```
cd backend
python -m venv venv
source venv/bin/activate
```

### 2. Install packages
```
pip install -r requirements.txt
```

### 3. Add your API keys
```
cp .env.example .env
nano .env
```
Paste your Groq and DigiKey keys.

### 4. Run
```
python app.py
```

### 5. Open browser
```
http://localhost:5000
```

## Features
- BOM upload + auto column detection
- Live DigiKey pricing per component
- SMT feasibility check (LOW/MEDIUM/HIGH risk per package)
- Full cost calculation with margin
- PDF quotation export
- Excel quotation export
- AI email draft
- AI component explainer
- Full Agent — one click runs everything automatically

## File structure
```
backend/
├── app.py                  — Flask server, all routes
├── quotation_engine.py     — BOM parser
├── ai_helper.py            — Groq AI
├── digikey_helper.py       — DigiKey live pricing
├── smt_checker.py          — SMT feasibility
├── pdf_generator.py        — PDF export
├── email_drafter.py        — AI email
├── agent.py                — Full agent pipeline
├── tools/                  — Agent tool modules
├── templates/index.html    — Frontend UI
├── static/style.css        — Styles
├── static/app.js           — Frontend logic
├── uploads/                — Uploaded BOMs
├── outputs/                — Generated PDFs
├── requirements.txt
├── .env                    — Your API keys (never commit)
└── .gitignore
```

## Tabs
1. BOM — view all components, fetch DigiKey prices
2. Issues — missing MPNs, missing prices
3. SMT Check — feasibility per package type
4. Quotation — cost breakdown, PDF/Excel export, AI email
5. AI Assistant — ask anything about components
6. Full Agent — one click automation
