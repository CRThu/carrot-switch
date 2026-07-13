"""Tests for carrot_switch.config.opencode."""
import pytest
from carrot_switch.config import opencode


@pytest.fixture(autouse=True)
def mock_config_path(tmp_home):
    """Create the config directory for all tests in this module."""
    config_dir = tmp_home / ".config" / "opencode"
    config_dir.mkdir(parents=True, exist_ok=True)
    yield


@pytest.fixture
def write_config(tmp_home):
    """Helper to write a config file in the mocked path."""
    def _write(data: dict):
        from carrot_switch.config import write_jsonc
        config_path = tmp_home / ".config" / "opencode" / "opencode.jsonc"
        write_jsonc(config_path, data)
    return _write


class TestIsAvailable:
    def test_available_when_dir_exists(self, tmp_home):
        # Directory already created by autouse fixture
        assert opencode.is_available() is True

    def test_not_available_when_dir_missing(self, tmp_home):
        # Remove the directory that autouse fixture created
        import shutil
        config_dir = tmp_home / ".config" / "opencode"
        shutil.rmtree(config_dir)
        assert opencode.is_available() is False


class TestGetMcpServers:
    def test_empty_when_no_config(self, tmp_home):
        assert opencode.get_mcp_servers() == {}

    def test_returns_mcp_section(self, write_config):
        write_config({"mcp": {"s1": {"type": "local"}}})
        servers = opencode.get_mcp_servers()
        assert "s1" in servers


class TestAddMcpServer:
    def test_add_new_server(self, write_config):
        write_config({})
        opencode.add_mcp_server("test", {"type": "local"})
        servers = opencode.get_mcp_servers()
        assert servers["test"]["type"] == "local"

    def test_add_to_existing(self, write_config):
        write_config({"mcp": {"existing": {"type": "local"}}})
        opencode.add_mcp_server("new", {"type": "remote"})
        servers = opencode.get_mcp_servers()
        assert len(servers) == 2


class TestUpdateMcpServer:
    def test_update_existing(self, write_config):
        write_config({"mcp": {"s1": {"type": "old"}}})
        opencode.update_mcp_server("s1", {"type": "new"})
        servers = opencode.get_mcp_servers()
        assert servers["s1"]["type"] == "new"

    def test_update_nonexistent_raises(self, write_config):
        write_config({})
        with pytest.raises(KeyError, match="not found"):
            opencode.update_mcp_server("ghost", {"type": "x"})


class TestDeleteMcpServer:
    def test_delete_existing(self, write_config):
        write_config({"mcp": {"s1": {}, "s2": {}}})
        opencode.delete_mcp_server("s1")
        servers = opencode.get_mcp_servers()
        assert "s1" not in servers
        assert "s2" in servers

    def test_delete_nonexistent_raises(self, write_config):
        write_config({})
        with pytest.raises(KeyError, match="not found"):
            opencode.delete_mcp_server("ghost")


class TestToggleMcpServer:
    def test_toggle_true_to_false(self, write_config):
        write_config({"mcp": {"s1": {"enabled": True}}})
        result = opencode.toggle_mcp_server("s1")
        assert result is False
        assert opencode.get_mcp_servers()["s1"]["enabled"] is False

    def test_toggle_default_enabled(self, write_config):
        write_config({"mcp": {"s1": {}}})
        result = opencode.toggle_mcp_server("s1")
        assert result is False

    def test_toggle_nonexistent_raises(self, write_config):
        write_config({})
        with pytest.raises(KeyError, match="not found"):
            opencode.toggle_mcp_server("ghost")


class TestSkillPermissions:
    def test_get_empty(self, write_config):
        write_config({})
        assert opencode.get_skills_permission() == {}

    def test_set_and_get(self, write_config):
        write_config({})
        opencode.set_skill_permission("my-skill", True)
        perms = opencode.get_skills_permission()
        assert perms["my-skill"] == "allow"

    def test_set_deny(self, write_config):
        write_config({})
        opencode.set_skill_permission("my-skill", False)
        perms = opencode.get_skills_permission()
        assert perms["my-skill"] == "deny"
