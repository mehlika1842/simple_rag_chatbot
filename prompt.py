from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from typing import List, Tuple
import re
import json
from langchain_text_splitters import RecursiveCharacterTextSplitter
import warnings
import os
import subprocess
import shutil
warnings.filterwarnings("ignore")
embedding_model = OllamaEmbeddings(model="all-minilm")
llm = Ollama(model="mistral")
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
#TEXT_FILE = "SUMMARY.txt"

db = Chroma(persist_directory="/home/ali/rag_db_r1", embedding_function=embedding_model)

def generate_keywords_and_prompt(user_question: str) -> Tuple[str, List[str]]:
    """with open(TEXT_FILE, "r", encoding="utf-8") as file:
        summary = file.read()    """
    prompt = f"""Analyze this API documentation summary and the user question:

    Perform these tasks:
    1. Identify a few TECHNICAL keywords from the question or the context i give according to the question
    2. Create a search-optimized prompt for API documentation
    3. Return as JSON format: {{"keywords": []}}
    4. Atleast return 1 keyword
    5. Return only keywords that are relevant to the summary i am about to send you, if there are no proper keywords from the user question, select relevant ones from the summary
    6. Give keywords in the language asked

    User Question: {user_question}"""
    #for smaller db's and speciliazed cases u can create a summary file for the docs and feed the the prompt
    response = llm(prompt)
    try:
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        json_str = response[json_start:json_end]
        data = json.loads(json_str)
        return data["keywords"]
    except:
        keywords = re.findall(r'\b\w{4,}\b', user_question.lower())
        return keywords[:3]

def promptt(question: str, optimized_prompt: str, keywords: List[str], k=5) -> str:
    docs = db.similarity_search(keywords, k=k)
    
    context = "\n\n".join([doc.page_content for doc in docs])
    print(f"\n[DEBUG] Using keywords: {keywords}")
    #print(f"\n[CONTEXT]\n{context}...")
    
    prompt = f"""You are an API documentation expert. Answer the question using the exact technical terms from the context.

    Requirements:
    1. Be technically precise
    2. Use the exact parameter/endpoint names
    3. DEFINITELY GIVE AN EXAMPLE
    4. Answer in the language asked

    Relevant Documentation:
    {context}

    Question: {question}"""
    response = llm(prompt)
    return response

while True:
    try:
        q = input("\nQuestion: ").strip()
        if q.startswith("NEWPROJECT:"):
            PROJECT_DIR = q.split("NEWPROJECT:")[1].strip()
            if not os.path.isdir(PROJECT_DIR):
                print(f"Invalid directory: {PROJECT_DIR}")
                continue
            print(f"Set new project directory: {PROJECT_DIR}")
            os.environ["PROJECT_DIR"] = str(PROJECT_DIR)
            subprocess.run(["python", "docgen.py"])
            shutil.copy(f"{PROJECT_DIR}/DOCGEN_DOCUMENT.md", "/home/ali/kap_downloads/kfs/deneme.txt")
            shutil.copy(f"{PROJECT_DIR}/DOCGEN_DOCUMENT.md", "/home/ali/projects/rag_api/readme.txt")
            subprocess.run(["python", "process.py"])
        elif q.startswith("NEWDOCS:"):
            #subprocess.run(["python", "docs.py"]) for summary
            subprocess.run(["python", "process.py"])
            continue
        if q.lower() == 'exit':
            break
        keywords = generate_keywords_and_prompt(q)
        answer = promptt(q, q, keywords)
        print(f"\nAnswer: {answer}")
    except Exception as e:
        print(f"\nError: {str(e)}")