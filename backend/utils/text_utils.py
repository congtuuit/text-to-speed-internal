import re
import unicodedata

def slugify(text: str) -> str:
    """
    Chuyển đổi chuỗi có dấu thành không dấu, thay thế khoảng trắng/kí tự đặc biệt thành '-' và chuyển thành chữ thường.
    VD: 'Tài liệu.docx' -> 'tai-lieu'
    """
    if '.' in text:
        text = text.rsplit('.', 1)[0]
    
    # .normalize("NFD")
    text = unicodedata.normalize("NFD", text)
    # .replace(/[\u0300-\u036f]/g, "")
    text = re.sub(r'[\u0300-\u036f]', '', text)
    # .replace(/đ/g, "d").replace(/Đ/g, "D")
    text = text.replace('đ', 'd').replace('Đ', 'D')
    # .toLowerCase()
    text = text.lower()
    # .trim()
    text = text.strip()
    # .replace(/\s+/g, " ")
    text = re.sub(r'\s+', ' ', text)
    # .replace(/[^\w\s-]/g, "")
    text = re.sub(r'[^\w\s-]', '', text)
    # .replace(/\s+/g, "-")
    text = re.sub(r'\s+', '-', text)
    
    # Cắt ngắn nếu quá dài (tối đa 50 ký tự)
    if len(text) > 50:
        text = text[:50].strip('-')
    
    return text
