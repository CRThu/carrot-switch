"""Tests for carrot_switch.backup."""
from pathlib import Path

from carrot_switch.backup import backup_config, backup_skill, _timestamp


class TestTimestamp:
    def test_format(self):
        ts = _timestamp()
        # Should be YYYYMMDD_HHMMSS
        assert len(ts) == 15
        assert ts[8] == "_"


class TestBackupConfig:
    def test_backup_existing_file(self, tmp_home, tmp_path):
        src = tmp_path / "config.jsonc"
        src.write_text('{"mcp": {}}', encoding="utf-8")

        dest = backup_config("opencode", src)
        assert dest.exists()
        assert dest.read_text(encoding="utf-8") == '{"mcp": {}}'
        assert "opencode" in str(dest)

    def test_backup_nonexistent_file(self, tmp_home, tmp_path):
        src = tmp_path / "nonexistent.jsonc"
        dest = backup_config("opencode", src)
        assert dest.parent.exists()


class TestBackupSkill:
    def test_backup_existing_skill(self, tmp_home):
        skill_dir = tmp_home / ".codex" / "skills" / "my-skill"
        skill_dir.mkdir(parents=True)
        (skill_dir / "SKILL.md").write_text("# Skill", encoding="utf-8")

        dest = backup_skill("opencode", "my-skill")
        assert dest is not None
        assert dest.exists()
        assert (dest / "SKILL.md").exists()

    def test_backup_nonexistent_skill(self, tmp_home):
        dest = backup_skill("opencode", "nonexistent")
        assert dest is None
