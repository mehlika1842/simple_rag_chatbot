import os
import time
import requests
import zipfile
import pandas as pd
import magic
import xml.etree.ElementTree as ET
from typing import List, Optional
from langchain.schema import Document
from langchain_community.document_loaders import (
    TextLoader,
    CSVLoader,
    UnstructuredExcelLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma

KAP_DIR = "/home/ali/kap_downloads"
DB_DIR = "/home/ali/rag_db_r1"
CHUNK_SIZE = 30000
CHUNK_OVERLAP = 50
OLLAMA_MODEL = "all-minilm"
OLLAMA_ENDPOINT = "http://localhost:11434"
def convert_pdf_to_txt(pdf_path: str) -> Optional[str]:
    txt_path = os.path.splitext(pdf_path)[0] + ".txt"
    try:
        os.system(f"pdftotext '{pdf_path}' '{txt_path}'")
        return txt_path if os.path.exists(txt_path) else None
    except Exception as e:
        print(f"Error converting PDF to text: {e}")
        return None

def convert_xml_to_txt(xml_path: str) -> Optional[str]:
    txt_path = os.path.splitext(xml_path)[0] + ".txt"
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        with open(txt_path, 'w') as f:
            for elem in root.iter():
                if elem.text and elem.text.strip():
                    f.write(elem.text.strip() + "\n")
        return txt_path
    except Exception as e:
        print(f"Error converting XML to text: {e}")
        return None

def load_text_file(file_path: str) -> List[Document]:
    try:
        loader = TextLoader(file_path)
        return loader.load()
    except Exception as e:
        print(f"Error loading text file {file_path}: {e}")
        return []

def process_file(file_path: str) -> List[Document]:
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.txt':
        return load_text_file(file_path)
    
    elif ext == '.pdf':
        txt_path = convert_pdf_to_txt(file_path)
        if txt_path:
            return load_text_file(txt_path)
    
    elif ext == '.xml':
        txt_path = convert_xml_to_txt(file_path)
        if txt_path:
            return load_text_file(txt_path)
    
    elif ext in ('.xls', '.xlsx'):
        try:
            loader = UnstructuredExcelLoader(file_path, mode="elements")
            docs = loader.load()
            if docs:
                return docs
            
            df = pd.read_excel(file_path, engine=None)
            txt_path = os.path.splitext(file_path)[0] + ".txt"
            df.to_csv(txt_path, sep='\t', index=False)
            return load_text_file(txt_path)
        except Exception as e:
            print(f"Error processing Excel file {file_path}: {e}")
    
    return []

def process_directory(directory: str) -> List[Document]:
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP
    )
    
    all_docs = []
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.startswith('.'):
                continue
                
            file_path = os.path.join(root, file)
            try:
                docs = process_file(file_path)
                if docs:
                    all_docs.extend(docs)
                    print(f"Processed: {file_path}")
            except Exception as e:
                print(f"Error processing {file_path}: {e}")
                continue
    
    if not all_docs:
        return []
    
    try:
        return text_splitter.split_documents(all_docs)
    except Exception as e:
        print(f"Error splitting documents: {e}")
        return []

def create_vector_db(documents: List[Document]) -> bool:
    if not documents:
        print("No valid documents to process")
        return False
    print(f"\nCreating vector database with {len(documents)} chunks...")
    try:
        embeddings = OllamaEmbeddings(
            model=OLLAMA_MODEL,
            base_url=OLLAMA_ENDPOINT
        )
        db = Chroma.from_documents(
            documents=documents,
            embedding=embeddings,
            persist_directory=DB_DIR
        )
        db.persist()
        print(f"Database successfully created at {DB_DIR}")
        return True
    except Exception as e:
        print(f"Error creating database: {e}")
        return False

def main():
    os.makedirs(KAP_DIR, exist_ok=True)
    os.makedirs(DB_DIR, exist_ok=True)
        
    all_chunks = []
    
    if os.path.exists(KAP_DIR):
        for company_dir in os.listdir(KAP_DIR):
            print(company_dir)
            full_path = os.path.join(KAP_DIR, company_dir)
            if os.path.isdir(full_path):
                chunks = process_directory(full_path)
                if chunks:
                    all_chunks.extend(chunks)
                    print(f"Processed {len(chunks)} chunks from {company_dir}")
    
    if all_chunks:
        create_vector_db(all_chunks)
    else:
        print("No valid documents found to process")

if __name__ == "__main__":
    main()
