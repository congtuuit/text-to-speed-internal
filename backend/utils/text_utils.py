import re
import unicodedata

def slugify(text: str) -> str:
    """
    Chuyển đổi chuỗi có dấu thành không dấu, thay thế khoảng trắng/kí tự đặc biệt thành '-' và chuyển thành chữ thường.
    VD: 'Tài liệu.docx' -> 'tai-lieu'
    """
    if '.' in text:
        text = text.rsplit('.', 1)[0]
    
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    
    # Cắt ngắn nếu quá dài (tối đa 50 ký tự)
    if len(text) > 50:
        text = text[:50].strip('-')
    
    return text
