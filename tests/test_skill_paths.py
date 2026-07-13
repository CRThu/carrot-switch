"""Tests for carrot_switch.skill (SkillPaths)."""
import pytest

from carrot_switch.skill import paths


class TestSkillPaths:
    def test_user_skills_opencode(self, tmp_home):
        result = paths.get_user_skills_dir("opencode")
        assert result == tmp_home / ".codex" / "skills"

    def test_user_skills_mimocode(self, tmp_home):
        result = paths.get_user_skills_dir("mimocode")
        assert result == tmp_home / ".local" / "share" / "mimocode" / "skills"

    def test_unknown_agent_raises(self):
        with pytest.raises(ValueError, match="Unknown agent"):
            paths.get_user_skills_dir("unknown")

    def test_builtin_skills_opencode(self, tmp_home):
        result = paths.get_builtin_skills_dir("opencode")
        assert result == tmp_home / ".codex" / "skills" / ".system"

    def test_builtin_skills_mimocode(self, tmp_home):
        result = paths.get_builtin_skills_dir("mimocode")
        assert result == tmp_home / ".local" / "share" / "mimocode" / "builtin_skills"

    def test_list_skills_empty(self, tmp_home):
        skills = paths.list_skills("opencode")
        assert skills == []

    def test_list_skills_finds_user_skill(self, tmp_home):
        skill_dir = tmp_home / ".codex" / "skills" / "my-skill"
        skill_dir.mkdir(parents=True)
        (skill_dir / "SKILL.md").write_text("# Skill", encoding="utf-8")

        skills = paths.list_skills("opencode")
        assert len(skills) == 1
        assert skills[0]["name"] == "my-skill"
        assert skills[0]["builtin"] is False

    def test_list_skills_finds_builtin_skill(self, tmp_home):
        builtin_dir = tmp_home / ".codex" / "skills" / ".system" / "built-in"
        builtin_dir.mkdir(parents=True)
        (builtin_dir / "SKILL.md").write_text("# Built-in", encoding="utf-8")

        skills = paths.list_skills("opencode")
        assert len(skills) == 1
        assert skills[0]["builtin"] is True

    def test_list_skills_skips_dirs_without_skill_md(self, tmp_home):
        skill_dir = tmp_home / ".codex" / "skills" / "no-skill"
        skill_dir.mkdir(parents=True)
        (skill_dir / "README.md").write_text("Not a skill", encoding="utf-8")

        skills = paths.list_skills("opencode")
        assert skills == []
