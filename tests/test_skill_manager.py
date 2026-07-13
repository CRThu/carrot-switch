"""Tests for carrot_switch.skill.manager."""
from pathlib import Path

import pytest

from carrot_switch.skill import manager, paths


@pytest.fixture(autouse=True)
def mock_config(tmp_home):
    """Mock config modules to avoid real filesystem writes."""
    from carrot_switch.config import opencode, mimocode, write_jsonc

    oc_dir = tmp_home / ".config" / "opencode"
    oc_dir.mkdir(parents=True)
    write_jsonc(oc_dir / "opencode.jsonc", {})

    mc_dir = tmp_home / ".config" / "mimocode"
    mc_dir.mkdir(parents=True)
    write_jsonc(mc_dir / "mimocode.jsonc", {})


class TestInstallFromLocal:
    def test_install_valid(self, tmp_path):
        source = tmp_path / "my-skill"
        source.mkdir()
        (source / "SKILL.md").write_text("# Skill", encoding="utf-8")

        result = manager.install_from_local("opencode", str(source))
        assert result == "my-skill"

        dest = paths.get_user_skills_dir("opencode") / "my-skill"
        assert dest.exists()
        assert (dest / "SKILL.md").exists()

    def test_install_with_custom_name(self, tmp_path):
        source = tmp_path / "original-name"
        source.mkdir()
        (source / "SKILL.md").write_text("# Skill", encoding="utf-8")

        result = manager.install_from_local("opencode", str(source), "custom-name")
        assert result == "custom-name"
        assert (paths.get_user_skills_dir("opencode") / "custom-name").exists()

    def test_install_nonexistent_source(self):
        with pytest.raises(ValueError, match="not a directory"):
            manager.install_from_local("opencode", "/nonexistent/path")

    def test_install_no_skill_md(self, tmp_path):
        source = tmp_path / "no-md"
        source.mkdir()
        with pytest.raises(ValueError, match="SKILL.md"):
            manager.install_from_local("opencode", str(source))

    def test_install_already_exists(self, tmp_path):
        source = tmp_path / "skill"
        source.mkdir()
        (source / "SKILL.md").write_text("# Skill", encoding="utf-8")

        dest = paths.get_user_skills_dir("opencode") / "skill"
        dest.mkdir(parents=True)

        with pytest.raises(FileExistsError, match="already exists"):
            manager.install_from_local("opencode", str(source))


class TestUninstall:
    def test_uninstall_existing(self, tmp_path):
        skill_dir = paths.get_user_skills_dir("opencode") / "to-delete"
        skill_dir.mkdir(parents=True)
        (skill_dir / "SKILL.md").write_text("# Skill", encoding="utf-8")

        manager.uninstall("opencode", "to-delete")
        assert not skill_dir.exists()

    def test_uninstall_nonexistent(self):
        with pytest.raises(FileNotFoundError, match="not found"):
            manager.uninstall("opencode", "nonexistent")


class TestTogglePermission:
    def test_toggle_default_to_deny(self):
        result = manager.toggle_permission("opencode", "test-skill")
        assert result is False

    def test_toggle_deny_to_allow(self):
        from carrot_switch.config import opencode
        opencode.set_skill_permission("test-skill", False)

        result = manager.toggle_permission("opencode", "test-skill")
        assert result is True
