import os
import fitz  # PyMuPDF
from langchain_community.llms import Ollama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from concurrent.futures import ThreadPoolExecutor
import pytesseract
from PIL import Image
import io
from tqdm import tqdm

class RobustPDFProcessor:
    def __init__(self, model_name="mistral", batch_size=1):
        self.llm = Ollama(
            model=model_name,
            temperature=0.2,
            top_k=40,
            top_p=0.9
        )
        self.chain = self._create_chain()
        self.batch_size = batch_size

    def _create_chain(self):
        prompt = ChatPromptTemplate.from_template("""
        [INST] Convert this document to structured text while preserving ALL information:

        Rules:
        1. Maintain original language (Turkish/English)
        2. Keep all numbers, dates, and terms exactly
        3. One complete fact per line
        4. Include [PAGE X] markers
        5. For tables: "[TABLE] Columns: A|B|C | Row1: x|y|z"
        6. For images: "[IMAGE] Extracted text: ..."
        7. GIVE ALL THE EXAMPLES WITH ALL THE PARAMETER DONT MISS INFO

        Content:
        {content} [/INST]
        """)
        return prompt | self.llm | StrOutputParser()

    def _extract_text(self, page):
        try:
            text = page.get_text("text", flags=fitz.TEXT_PRESERVE_LIGATURES | fitz.TEXT_PRESERVE_WHITESPACE)
            if text.strip():
                return text
            
            pix = page.get_pixmap()
            img = Image.open(io.BytesIO(pix.tobytes()))
            return pytesseract.image_to_string(img, lang='tur+eng')
        
        except Exception as e:
            print(f"Extraction error: {str(e)}")
            return ""

    def process_pdf(self, pdf_path):
        try:
            doc = fitz.open(pdf_path)
            elements = []
            
            for page_num, page in enumerate(doc):
                content = []
                
                text = self._extract_text(page)
                if text.strip():
                    content.append(f"[PAGE {page_num + 1} TEXT]\n{text}")
                
                try:
                    tables = page.find_tables()
                    if tables.tables:
                        for table in tables.tables:
                            table_str = "\n".join("|".join(str(cell or "") for cell in row) for row in table.extract())
                            content.append(f"[PAGE {page_num + 1} TABLE]\n{table_str}")
                except Exception:
                    pass
                
                if content:
                    elements.append("\n".join(content))
            
            doc.close()
            return self.chain.invoke({"content": "\n\n".join(elements)}) if elements else None
        
        except Exception as e:
            print(f"Error processing {pdf_path}: {str(e)}")
            return None

    def process_directory(self, input_dir, output_dir):
        os.makedirs(output_dir, exist_ok=True)
        pdf_files = [f for f in os.listdir(input_dir) if f.lower().endswith('.pdf')]
        
        with ThreadPoolExecutor(max_workers=self.batch_size) as executor:
            tasks = []
            for pdf in pdf_files:
                input_path = os.path.join(input_dir, pdf)
                output_path = os.path.join(output_dir, f"{os.path.splitext(pdf)[0]}.txt")
                tasks.append(executor.submit(self._safe_process, input_path, output_path))
            
            for task in tqdm(tasks, total=len(pdf_files), desc="Processing PDFs"):
                task.result()

    def _safe_process(self, input_path, output_path):
        result = self.process_pdf(input_path)
        if result:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(result)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Robust PDF Processor')
    parser.add_argument('input_dir', help='Input directory with PDFs')
    parser.add_argument('output_dir', help='Output directory for text files')
    parser.add_argument('--model', default='mistral', help='Ollama model name')
    parser.add_argument('--batch', type=int, default=3, help='Parallel batch size')
    args = parser.parse_args()

    processor = RobustPDFProcessor(
        model_name=args.model,
        batch_size=args.batch
    )
    processor.process_directory(args.input_dir, args.output_dir)