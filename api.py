from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_ollama import OllamaEmbeddings, OllamaLLM
from langchain_chroma import Chroma
from typing import List
import json
import re
import os
import time
from sqlalchemy import create_engine, Column, String, Text
from sqlalchemy.orm import sessionmaker, declarative_base
from langchain_openai import ChatOpenAI

DB_DIR = r"C:\Users\MehlikaYikilmaz\rag_db1"
OLLAMA_EMBEDDING_MODEL = "all-minilm"
OLLAMA_LLM_MODEL = "phi3"
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)  
os.environ["OPENAI_API_KEY"] = "Your-OpenAI-API-Key"  # Replace with your actual OpenAI API key
os.environ["OPENAI_API_BASE"] = "https://openrouter.ai/api/v1"


PROMPT_LOG_PATH = os.path.join(LOG_DIR, "prompts.log")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = create_engine("sqlite:///cache.db", connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)
Base = declarative_base()

class QACache(Base):
    __tablename__ = "qa_cache"
    question = Column(String, primary_key=True)
    answer = Column(Text)

Base.metadata.create_all(engine)

def log_prompt(prompt_text):
    with open(PROMPT_LOG_PATH, "a", encoding="utf-8") as f:
        f.write("\n" + "=" * 40 + "\n")
        f.write(f"PROMPT TIME: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(prompt_text + "\n")

def save_to_db(question, answer):
    session = Session()
    entry = QACache(question=question, answer=answer)
    session.merge(entry)
    session.commit()
    session.close()

def load_cache_from_db():
    session = Session()
    entries = session.query(QACache).all()
    session.close()
    return {entry.question.lower(): entry.answer for entry in entries}

qa_cache = load_cache_from_db()

class User(BaseModel):
    email: str
    password: str

class Query(BaseModel):
    prompt: str

class ChatMessage(BaseModel):
    sender: str
    text: str
    time: str

users_db = {}
chat_history_db = {}

embedding_model = OllamaEmbeddings(model=OLLAMA_EMBEDDING_MODEL)
#llm = OllamaLLM(model=OLLAMA_LLM_MODEL)
llm = ChatOpenAI(model="deepseek/deepseek-r1-0528-qwen3-8b:free", temperature=0)
db = Chroma(persist_directory=DB_DIR, embedding_function=embedding_model)

def generate_keywords(user_question: str):
    prompt = f"""Extract only the key technical terms from this user question.
Return them in JSON format as a list of strings, like: {{"keywords": ["..."]}}.

Question: {user_question}
"""
    response = llm.invoke(prompt)
    try:
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        json_str = response[json_start:json_end]
        data = json.loads(json_str)
        keywords = data.get("keywords", [])
    except Exception:
        keywords = re.findall(r'\b\w{4,}\b', user_question.lower())[:3]
    return keywords

def create_prompt_with_context(question: str, keywords, k=3):
    keyword_str = " ".join(keywords)
    docs = db.similarity_search(keyword_str, k=k)
    context = "\n\n".join([doc.page_content for doc in docs])
    
    prompt = f"""
You are an expert API documentation assistant. Based only on the relevant documentation chunks and keywords provided, answer as technically and accurately as possible.

Requirements:
1. Be technically precise
2. Use exact parameter/endpoint names
3. Provide an example if applicable
4. Respond in the language appropriate to the technical content

Important Notes:
- Do NOT make up information.
- Use ONLY the context and keywords provided.

Relevant Documentation Chunks:
{context}

Keywords:
{', '.join(keywords)}
"""
    return prompt


@app.post("/register")
async def register(user: User):
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    users_db[user.email] = user.password
    return {"message": "User registered successfully"}

@app.post("/login")
async def login(user: User):
    stored_password = users_db.get(user.email)
    if not stored_password:
        raise HTTPException(status_code=404, detail="Email not found")
    if stored_password != user.password:
        raise HTTPException(status_code=400, detail="Incorrect password")
    return {"message": "Login successful"}

@app.post("/chat/{email}")
async def save_chat_message(email: str, message: ChatMessage):
    if email not in chat_history_db:
        chat_history_db[email] = []
    chat_history_db[email].append(message.dict())
    return {"message": "Mesaj kaydedildi"}

@app.get("/chat/{email}")
async def get_chat_history(email: str):
    return {"history": chat_history_db.get(email, [])}

@app.get("/cache")
async def get_cache():
    return load_cache_from_db()
@app.delete("/cache")
async def clear_cache():
    qa_cache.clear()
    session = Session()
    session.query(QACache).delete()
    session.commit()
    session.close()
    return {"message": "Cache temizlendi."}

@app.post("/ask")
async def ask(query: Query):
    question = query.prompt.strip().lower()
    if question in qa_cache:
        return {
            "answer": qa_cache[question],
            "cached": True,
            "used_prompt": None  
        }

    try:
        keywords = generate_keywords(question)
        rag_prompt = create_prompt_with_context(question, keywords)

        log_prompt(rag_prompt)
        
        print("\n" + "="*40)
        print( "Prompt sent to LLM:")
        print(rag_prompt)
        print("="*40 + "\n")

        answer = llm.invoke(rag_prompt)
        qa_cache[question] = answer
        save_to_db(question.lower(), answer)
        return {
            "answer": answer,
            "cached": False,
            "used_prompt": rag_prompt 
        }
    except Exception as e:
        return {"error": f"Hata oluştu: {str(e)}"}

@app.get("/")
def root():
    return {"message": "RAG backend API çalışıyor."}
