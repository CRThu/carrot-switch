"""Shared test fixtures."""
from pathlib import Path
from unittest.mock import patch

import pytest


@pytest.fixture
def tmp_home(tmp_path):
    """Provide a temporary home directory for config/skill path isolation."""
    with patch("pathlib.Path.home", return_value=tmp_path):
        # Also patch the SkillPaths singleton's cached _home
        import carrot_switch.skill as skill_mod
        old_home = skill_mod.paths._home
        skill_mod.paths._home = tmp_path
        yield tmp_path
        skill_mod.paths._home = old_home


@pytest.fixture
def tmp_store(tmp_home):
    """Isolate store root to tmp_home."""
    store_root = tmp_home / "AppData" / "Roaming" / ".carrotswitch"
    store_root.mkdir(parents=True)
    with patch("carrot_switch.store.STORE_ROOT", store_root):
        with patch("carrot_switch.store.mcp.STORE_ROOT", store_root):
            with patch("carrot_switch.store.skill.STORE_ROOT", store_root):
                yield store_root


@pytest.fixture
def tmp_config_dir(tmp_home):
    """Create a temporary config directory structure."""
    config_dir = tmp_home / ".config" / "opencode"
    config_dir.mkdir(parents=True)
    return config_dir


@pytest.fixture
def sample_jsonc(tmp_config_dir):
    """Write a sample JSONC config file and return its path."""
    config_file = tmp_config_dir / "opencode.jsonc"
    config_file.write_text(
        '// This is a comment\n'
        '{\n'
        '  "mcp": {\n'
        '    "server1": {\n'
        '      "type": "local",\n'
        '      "command": ["python", "-m", "server"],\n'
        '      "enabled": true\n'
        '    }\n'
        '  },\n'
        '  "permission": {\n'
        '    "skill": {\n'
        '      "test-skill": "allow"\n'
        '    }\n'
        '  }\n'
        '}\n',
        encoding="utf-8",
    )
    return config_file


@pytest.fixture
def empty_config(tmp_config_dir):
    """Return path to an empty config directory (no config file)."""
    return tmp_config_dir / "opencode.jsonc"
