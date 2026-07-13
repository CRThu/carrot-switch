"""jsonc read/write utilities."""
import json
import re
from pathlib import Path


def strip_comments(text: str) -> str:
    """Remove // and /* */ comments from JSONC text."""
    result = []
    i = 0
    n = len(text)
    in_string = False
    escape = False
    while i < n:
        c = text[i]
        if escape:
            result.append(c)
            escape = False
            i += 1
            continue
        if c == '\\' and in_string:
            result.append(c)
            escape = True
            i += 1
            continue
        if c == '"' and not escape:
            in_string = not in_string
            result.append(c)
            i += 1
            continue
        if in_string:
            result.append(c)
            i += 1
            continue
        if c == '/' and i + 1 < n:
            next_c = text[i + 1]
            if next_c == '/':
                # line comment
                while i < n and text[i] != '\n':
                    i += 1
                continue
            if next_c == '*':
                # block comment
                i += 2
                while i + 1 < n and not (text[i] == '*' and text[i + 1] == '/'):
                    i += 1
                i += 2
                continue
        result.append(c)
        i += 1
    return ''.join(result)


def read_jsonc(path: Path) -> dict:
    """Read a JSONC file and return a dict."""
    if not path.exists():
        return {}
    text = path.read_text(encoding='utf-8')
    cleaned = strip_comments(text)
    if not cleaned.strip():
        return {}
    return json.loads(cleaned)


def write_jsonc(path: Path, data: dict) -> None:
    """Write a dict as JSON to a file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
