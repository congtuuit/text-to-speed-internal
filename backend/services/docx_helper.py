import os
import re
from docx import Document


def normalize_text(text: str) -> str:
    text = text.replace("\r", " ")
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_long_sentence(sentence: str, max_chars: int):
    """
    Câu quá dài:
    ưu tiên ; : ,
    cuối cùng mới cắt theo từ.
    """

    sentence = sentence.strip()

    if len(sentence) <= max_chars:
        return [sentence]

    result = []

    parts = re.split(
        r'(?<=[;:,])\s+',
        sentence
    )

    current = ""

    for part in parts:

        part = part.strip()

        if not part:
            continue

        if len(current) + len(part) + 1 <= max_chars:

            current = (
                f"{current} {part}"
            ).strip()

        else:

            if current:
                result.append(current)

            if len(part) <= max_chars:

                current = part

            else:

                words = part.split()

                temp = ""

                for word in words:

                    if len(temp) + len(word) + 1 <= max_chars:

                        temp = (
                            f"{temp} {word}"
                        ).strip()

                    else:

                        if temp:
                            result.append(temp)

                        temp = word

                current = temp

    if current:
        result.append(current)

    return result


def split_sentences(text: str):
    """
    Tách câu tiếng Việt.
    """

    text = normalize_text(text)

    if not text:
        return []

    pattern = r'''
        .*?
        (?:
            [.!?]["”']?
            (?=\s|$)
            |
            $
        )
    '''

    matches = re.findall(
        pattern,
        text,
        flags=re.VERBOSE | re.UNICODE
    )

    return [
        m.strip()
        for m in matches
        if m.strip()
    ]


def inject_book_markers(text: str):
    """
    Tách heading kiểu:

    Chương 01
    1.
    2.
    3.
    """

    text = re.sub(
        r'(Chương\s+\d+)',
        r'\n\1\n',
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r'(\s)(\d+\.\s+[A-ZÀ-Ỹ])',
        r'\n\2',
        text
    )

    return text


def save_chunk(
    text,
    output_dir,
    index
):
    filename = f"{index:03d}.txt"

    path = os.path.join(
        output_dir,
        filename
    )

    with open(
        path,
        "w",
        encoding="utf-8"
    ) as f:
        f.write(text)

    return filename


def split_docx_to_txt(
    docx_path,
    output_dir,
    max_chars=200
):

    os.makedirs(
        output_dir,
        exist_ok=True
    )

    doc = Document(docx_path)

    full_text = "\n".join(
        p.text
        for p in doc.paragraphs
        if p.text.strip()
    )

    full_text = inject_book_markers(
        full_text
    )

    sections = []

    for block in full_text.split("\n"):

        block = normalize_text(block)

        if not block:
            continue

        sections.append(block)

    chunks = []

    current = ""

    for section in sections:

        sentences = split_sentences(
            section
        )

        if not sentences:
            sentences = [section]

        expanded = []

        for sentence in sentences:

            if len(sentence) > max_chars:

                expanded.extend(
                    split_long_sentence(
                        sentence,
                        max_chars
                    )
                )

            else:

                expanded.append(
                    sentence
                )

        for sentence in expanded:

            if not current:

                current = sentence
                continue

            if (
                len(current)
                + len(sentence)
                + 1
                <= max_chars
            ):

                current += " " + sentence

            else:

                chunks.append(
                    current.strip()
                )

                current = sentence

    if current:
        chunks.append(
            current.strip()
        )

    files = []

    for idx, chunk in enumerate(
        chunks,
        start=1
    ):

        files.append(
            save_chunk(
                chunk,
                output_dir,
                idx
            )
        )

    return files

