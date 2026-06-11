import os
import re
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
        text = text.strip()
        if not text: return
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
                current_chunk = ""
            
            if len(para) > max_chars:
                sentences = re.split(r'(?<=[.?!])\s+', para)
                temp_chunk = ""
                for sent in sentences:
                    sent = sent.strip()
                    if not sent: continue
                    if len(temp_chunk) + len(sent) + 1 <= max_chars:
                        if temp_chunk:
                            temp_chunk += " " + sent
                        else:
                            temp_chunk = sent
                    else:
                        if temp_chunk:
                            save_chunk(temp_chunk)
                        
                        if len(sent) > max_chars:
                            # Tách theo dấu phẩy nếu câu vẫn quá dài
                            sub_parts = re.split(r'(?<=[,;])\s+', sent)
                            sub_chunk = ""
                            for sub in sub_parts:
                                sub = sub.strip()
                                if not sub: continue
                                if len(sub_chunk) + len(sub) + 1 <= max_chars:
                                    if sub_chunk: sub_chunk += " " + sub
                                    else: sub_chunk = sub
                                else:
                                    if sub_chunk: save_chunk(sub_chunk)
                                    if len(sub) > max_chars:
                                        # Cuối cùng cắt theo khoảng trắng
                                        words = sub.split()
                                        w_chunk = ""
                                        for w in words:
                                            if len(w_chunk) + len(w) + 1 <= max_chars:
                                                if w_chunk: w_chunk += " " + w
                                                else: w_chunk = w
                                            else:
                                                if w_chunk: save_chunk(w_chunk)
                                                w_chunk = w
                                        sub_chunk = w_chunk
                                    else:
                                        sub_chunk = sub
                            temp_chunk = sub_chunk
                        else:
                            temp_chunk = sent
                current_chunk = temp_chunk
            else:
                current_chunk = para
                
    if current_chunk:
        save_chunk(current_chunk)
        
    return files_created
