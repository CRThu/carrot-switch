"""Tests for carrot_switch.config (jsonc utilities)."""
from pathlib import Path

from carrot_switch.config import strip_comments, read_jsonc, write_jsonc


class TestStripComments:
    def test_line_comment(self):
        text = '{"key": "value" // comment\n}'
        assert strip_comments(text) == '{"key": "value" \n}'

    def test_block_comment(self):
        text = '{"key": /* block */ "value"}'
        assert strip_comments(text) == '{"key":  "value"}'

    def test_comment_in_string(self):
        text = '{"url": "http://example.com/foo//bar"}'
        assert strip_comments(text) == '{"url": "http://example.com/foo//bar"}'

    def test_block_comment_in_string(self):
        text = '{"key": "value /* not a comment */"}'
        assert strip_comments(text) == '{"key": "value /* not a comment */"}'

    def test_multiple_comments(self):
        text = (
            '// line comment\n'
            '{\n'
            '  /* block */\n'
            '  "a": 1 // another\n'
            '}'
        )
        result = strip_comments(text)
        assert "//" not in result
        assert "/*" not in result
        assert '"a": 1' in result

    def test_escaped_quote_in_string(self):
        text = '{"key": "value\\" // not a comment"}'
        result = strip_comments(text)
        assert '"value\\" // not a comment"' in result

    def test_empty_string(self):
        assert strip_comments("") == ""

    def test_no_comments(self):
        text = '{"a": 1, "b": [2, 3]}'
        assert strip_comments(text) == text


class TestReadJsonc:
    def test_read_valid_jsonc(self, sample_jsonc):
        data = read_jsonc(sample_jsonc)
        assert "mcp" in data
        assert data["mcp"]["server1"]["type"] == "local"

    def test_read_nonexistent_file(self):
        data = read_jsonc(Path("/nonexistent/file.jsonc"))
        assert data == {}

    def test_read_empty_file(self, tmp_config_dir):
        empty_file = tmp_config_dir / "empty.jsonc"
        empty_file.write_text("", encoding="utf-8")
        data = read_jsonc(empty_file)
        assert data == {}

    def test_read_whitespace_only_file(self, tmp_config_dir):
        ws_file = tmp_config_dir / "ws.jsonc"
        ws_file.write_text("   \n\n  ", encoding="utf-8")
        data = read_jsonc(ws_file)
        assert data == {}


class TestWriteJsonc:
    def test_write_creates_file(self, tmp_config_dir):
        path = tmp_config_dir / "new.jsonc"
        write_jsonc(path, {"key": "value"})
        assert path.exists()
        content = path.read_text(encoding="utf-8")
        assert '"key": "value"' in content

    def test_write_creates_parent_dirs(self, tmp_config_dir):
        path = tmp_config_dir / "sub" / "dir" / "file.jsonc"
        write_jsonc(path, {"nested": True})
        assert path.exists()

    def test_write_overwrites_existing(self, tmp_config_dir):
        path = tmp_config_dir / "overwrite.jsonc"
        write_jsonc(path, {"old": True})
        write_jsonc(path, {"new": True})
        data = read_jsonc(path)
        assert "new" in data
        assert "old" not in data
