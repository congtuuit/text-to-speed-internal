import os
from docx import Document

def split_docx_to_txt(docx_path: str, output_dir: str, max_chars: int = 2800):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    doc = Document(docx_path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    
    current_chunk = ""
    chunk_index = 1
    files_created = []
    
    def save_chunk(text):
        nonlocal chunk_index
        file_name = f"{chunk_index:03d}.txt"
        file_path = os.path.join(output_dir, file_name)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(text)
        files_created.append(file_name)
        chunk_index += 1

    for para in paragraphs:
        if len(current_chunk) + len(para) + 1 <= max_chars:
            if current_chunk:
                current_chunk += "\n" + para
            else:
                current_chunk = para
        else:
            if current_chunk:
                save_chunk(current_chunk)
            
            if len(para) > max_chars:
                sentences = para.replace(". ", ".\n").split("\n")
                temp_chunk = ""
                for sent in sentences:
                    if len(temp_chunk) + len(sent) + 1 <= max_chars:
                        if temp_chunk:
                            temp_chunk += " " + sent
                        else:
                            temp_chunk = sent
                    else:
                        if temp_chunk:
                            save_chunk(temp_chunk)
                        if len(sent) > max_chars:
                            save_chunk(sent)
                            temp_chunk = ""
                        else:
                            temp_chunk = sent
                current_chunk = temp_chunk
            else:
                current_chunk = para
                
    if current_chunk:
        save_chunk(current_chunk)
        
    return files_created
