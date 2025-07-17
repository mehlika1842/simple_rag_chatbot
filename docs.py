import os
from pathlib import Path
from langchain_community.llms import Ollama

TXT_DIR = Path(os.getenv("PROJECT_DIR", ".")).resolve()
MODEL_NAME = "mistral"
OUTPUT_FILE = "SUMMARY.txt"

llm = Ollama(model=MODEL_NAME)

def load_txt_files(folder: str):
    all_texts = []
    for path in Path(folder).rglob("*.txt"):
        try:
            content = path.read_text(encoding="utf-8")
            if content.strip():
                all_texts.append((path.name, content.strip()))
        except Exception as e:
            print(e)
    return all_texts

def summarize_with_ollama(all_docs: list):
    input_text = "\n\n".join([f"=== {name} ===\n{content}" for name, content in all_docs])

    prompt = f"""You are a documentation summarization expert.

Your task is to read the content of multiple software-related text files and:
- Extract ALL the functionalities
- Identify important classes/functions
- Highlight architectural patterns if mentioned
- Produce ONE SINGLE clean summary in plain text
- THIS IS NOT FOR HUMANS, write detailed functionalities and simple explanation
- MAKE IT DETAILED
- Add explanation and all that for each parameter and function but make it short

Files:
{input_text}

Now give a comprehensive summary titled 'Main Functionalities Summary'."""
    
    result = llm(prompt)
    return result.strip()

def main():
    files = load_txt_files(TXT_DIR)

    if not files:
        return

    summary = summarize_with_ollama(files)

    Path(OUTPUT_FILE).write_text(summary, encoding="utf-8")


if __name__ == "__main__":
    main()
