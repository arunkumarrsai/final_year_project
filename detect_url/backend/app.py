from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import sys

# Ensure imports work regardless of how we start the app
try:
    from backend.db_chatbot import DatabaseChatbot
except ImportError:
    from detect_url.backend.db_chatbot import DatabaseChatbot

app = FastAPI()

# Initialize Chatbot
db_dir = os.path.join(os.path.dirname(__file__), "db")
os.makedirs(db_dir, exist_ok=True)
bot = DatabaseChatbot(db_directory=db_dir)

class ChatRequest(BaseModel):
    url_or_prompt: str
    session_id: str = "default"

# 1. Provide an API Endpoint for the Frontend to hit
@app.post("/api/predict")
def predict_url(request: ChatRequest):
    try:
        response = bot.chat(request.url_or_prompt, request.session_id)
        return {"status": "success", "response": response}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Serve the Frontend Files (One Service Architecture)
website_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../website"))

# Serve the main index.html and all static assets automatically at the root level
app.mount("/", StaticFiles(directory=website_dir, html=True), name="website")
