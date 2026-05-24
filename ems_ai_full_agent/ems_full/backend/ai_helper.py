from dotenv import load_dotenv
load_dotenv()

import os
import requests

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.1-8b-instant"

def ask_ai(question, bom_summary=""):
    if not GROQ_API_KEY:
        return "No GROQ_API_KEY found. Add it to your .env file."

    system_prompt = (
        "You are an expert EMS (Electronics Manufacturing Services) engineer. "
        "Help junior engineers understand electronic components, BOMs, and PCB assembly. "
        "Keep answers short — 3 to 5 sentences. Plain text only, no markdown."
    )

    user_message = (
        f"BOM context:\n{bom_summary}\n\nQuestion: {question}"
        if bom_summary else question
    )

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type":  "application/json",
    }

    body = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
        "max_tokens":  300,
        "temperature": 0.4,
    }

    try:
        response = requests.post(GROQ_URL, headers=headers, json=body, timeout=15)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except requests.exceptions.Timeout:
        return "Request timed out. Try again."
    except requests.exceptions.HTTPError:
        if response.status_code == 401:
            return "Invalid Groq API key. Check your .env file."
        if response.status_code == 429:
            return "Rate limit hit. Wait a moment and try again."
        return f"API error {response.status_code}"
    except Exception as e:
        return f"Something went wrong: {str(e)}"
