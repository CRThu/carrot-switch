"""Tests for carrot_switch.config.mimocode."""
import shutil

import pytest
from carrot_switch.config import mimocode


@pytest.fixture(autouse=True)
def mock_config_path(tmp_home):
    """Create the config directory for all tests in this module."""
    config_dir = tmp_home / ".config" / "mimocode"
    config_dir.mkdir(parents=True, exist_ok=True)
    yield


@pytest.fixture
def write_config(tmp_home):
    def _write(data: dict):
        from carrot_switch.config import write_jsonc
        config_path = tmp_home / ".config" / "mimocode" / "mimocode.jsonc"
        write_jsonc(config_path, data)
    return _write


class TestIsAvailable:
    def test_available(self, tmp_home):
        # Directory already created by autouse fixture
        assert mimocode.is_available() is True

    def test_not_available(self, tmp_home):
        # Remove the directory that autouse fixture created
        config_dir = tmp_home / ".config" / "mimocode"
        shutil.rmtree(config_dir)
        assert mimocode.is_available() is False


class TestMcpCrud:
    def test_add_get_delete(self, write_config):
        write_config({})
        mimocode.add_mcp_server("srv", {"type": "local"})
        assert "srv" in mimocode.get_mcp_servers()

        mimocode.update_mcp_server("srv", {"type": "remote"})
        assert mimocode.get_mcp_servers()["srv"]["type"] == "remote"

        mimocode.delete_mcp_server("srv")
        assert mimocode.get_mcp_servers() == {}

    def test_toggle(self, write_config):
        write_config({"mcp": {"srv": {"enabled": True}}})
        result = mimocode.toggle_mcp_server("srv")
        assert result is False

    def test_errors(self, write_config):
        write_config({})
        with pytest.raises(KeyError):
            mimocode.update_mcp_server("x", {})
        with pytest.raises(KeyError):
            mimocode.delete_mcp_server("x")
        with pytest.raises(KeyError):
            mimocode.toggle_mcp_server("x")


class TestSkillPermissions:
    def test_set_get(self, write_config):
        write_config({})
        mimocode.set_skill_permission("skill1", True)
        assert mimocode.get_skills_permission()["skill1"] == "allow"
        mimocode.set_skill_permission("skill1", False)
        assert mimocode.get_skills_permission()["skill1"] == "deny"
