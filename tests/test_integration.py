"""Integration tests simulating real-world scenarios."""
import shutil
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from carrot_switch.config import write_jsonc
from carrot_switch.skill import manager, paths


@pytest.fixture
def real_env(tmp_home, tmp_store):
    """Set up a realistic environment with opencode + mimocode configs."""
    # Mock BACKUP_ROOT to use tmp_home
    backup_root = tmp_home / "AppData" / "Roaming" / ".carrotswitch"
    with patch("carrot_switch.backup.BACKUP_ROOT", backup_root):
        # OpenCode config
        oc_config = tmp_home / ".config" / "opencode"
        oc_config.mkdir(parents=True)
        write_jsonc(oc_config / "opencode.jsonc", {
            "mcp": {
                "existing-server": {
                    "type": "local",
                    "command": ["python", "-m", "server"],
                    "enabled": True,
                }
            },
            "permission": {"skill": {"old-skill": "allow"}},
        })

        # MiMoCode config
        mc_config = tmp_home / ".config" / "mimocode"
        mc_config.mkdir(parents=True)
        write_jsonc(mc_config / "mimocode.jsonc", {
            "mcp": {},
            "permission": {"skill": {}},
        })

        # Claude config
        claude_config = tmp_home / ".claude.json"
        claude_config.write_text('{"mcpServers": {}}', encoding="utf-8")

        yield tmp_home


@pytest.fixture
def client(real_env):
    from carrot_switch.web.app import create_app
    return TestClient(create_app())


class TestSkillLifecycle:
    """Full lifecycle: create source -> install -> list -> permission -> uninstall."""

    def test_full_skill_lifecycle(self, real_env):
        # 1. Create a skill source directory
        source = real_env / "my-new-skill"
        source.mkdir()
        (source / "SKILL.md").write_text(
            "# My New Skill\n\nThis is a test skill.",
            encoding="utf-8",
        )
        (source / "helper.py").write_text(
            'print("hello")',
            encoding="utf-8",
        )

        # 2. Install from local
        name = manager.install_from_local("opencode", str(source))
        assert name == "my-new-skill"

        skill_dir = paths.get_user_skills_dir("opencode") / name
        assert skill_dir.exists()
        assert (skill_dir / "SKILL.md").exists()
        assert (skill_dir / "helper.py").exists()

        # 3. List installed skills
        installed = manager.list_installed("opencode")
        names = [s["name"] for s in installed]
        assert "my-new-skill" in names

        # 4. Toggle permission to deny
        from carrot_switch.config import opencode as oc
        oc.set_skill_permission("my-new-skill", False)
        perms = oc.get_skills_permission()
        assert perms["my-new-skill"] == "deny"

        # 5. Uninstall
        manager.uninstall("opencode", "my-new-skill")
        assert not skill_dir.exists()

        # 6. Verify gone
        installed = manager.list_installed("opencode")
        names = [s["name"] for s in installed]
        assert "my-new-skill" not in names

    def test_install_with_custom_name(self, real_env):
        source = real_env / "original-name"
        source.mkdir()
        (source / "SKILL.md").write_text("# Skill", encoding="utf-8")

        name = manager.install_from_local("opencode", str(source), "custom-name")
        assert name == "custom-name"
        assert (paths.get_user_skills_dir("opencode") / "custom-name").exists()

    def test_cannot_install_twice(self, real_env):
        source = real_env / "dup-skill"
        source.mkdir()
        (source / "SKILL.md").write_text("# Skill", encoding="utf-8")

        manager.install_from_local("opencode", str(source))
        with pytest.raises(FileExistsError):
            manager.install_from_local("opencode", str(source))

    def test_uninstall_creates_backup(self, real_env):
        skill_dir = paths.get_user_skills_dir("opencode") / "to-delete"
        skill_dir.mkdir(parents=True)
        (skill_dir / "SKILL.md").write_text("# Skill", encoding="utf-8")

        manager.uninstall("opencode", "to-delete")
        assert not skill_dir.exists()

        # Backup should exist
        backup_root = real_env / "AppData" / "Roaming" / ".carrotswitch" / "skill" / "opencode"
        backups = list(backup_root.glob("to-delete_*"))
        assert len(backups) == 1
        assert (backups[0] / "SKILL.md").exists()


class TestMcpLifecycle:
    """Full MCP lifecycle via API: add -> list -> toggle -> update -> delete."""

    def test_mcp_crud_via_api(self, client):
        # 1. Add
        resp = client.post("/api/mcp/opencode", json={
            "name": "test-mcp",
            "type": "local",
            "command": ["node", "server.js"],
        })
        assert resp.status_code == 200

        # 2. List
        resp = client.get("/api/mcp/opencode")
        servers = resp.json()["servers"]
        assert "test-mcp" in servers
        assert servers["test-mcp"]["enabled"] is True

        # 3. Toggle
        resp = client.patch("/api/mcp/opencode/test-mcp/toggle")
        assert resp.json()["enabled"] is False

        # 4. Update
        resp = client.put("/api/mcp/opencode/test-mcp", json={
            "name": "test-mcp",
            "type": "local",
            "command": ["node", "server-v2.js"],
        })
        assert resp.status_code == 200

        # 5. Delete
        resp = client.delete("/api/mcp/opencode/test-mcp")
        assert resp.status_code == 200

        resp = client.get("/api/mcp/opencode")
        assert "test-mcp" not in resp.json()["servers"]

    def test_mcp_backup_on_modify(self, real_env, client):
        resp = client.post("/api/mcp/opencode", json={
            "name": "new-server",
            "type": "local",
            "command": ["python"],
        })
        assert resp.status_code == 200

        backup_root = real_env / "AppData" / "Roaming" / ".carrotswitch" / "mcp" / "opencode"
        backups = list(backup_root.glob("config_*.jsonc"))
        assert len(backups) >= 1


class TestPermissionLifecycle:
    """Permission toggle scenarios."""

    def test_permission_toggle_cycle(self, real_env):
        from carrot_switch.config import opencode as oc

        # Default: not set -> treated as allow
        perms = oc.get_skills_permission()
        assert perms.get("cycle-skill") is None

        # Toggle: None -> deny
        result = manager.toggle_permission("opencode", "cycle-skill")
        assert result is False

        # Toggle: deny -> allow
        result = manager.toggle_permission("opencode", "cycle-skill")
        assert result is True

        # Verify final state
        perms = oc.get_skills_permission()
        assert perms["cycle-skill"] == "allow"

    def test_permission_persists_after_restart(self, real_env):
        from carrot_switch.config import opencode as oc

        oc.set_skill_permission("persist-skill", False)
        perms = oc.get_skills_permission()
        assert perms["persist-skill"] == "deny"

        # Simulate restart by re-reading
        from carrot_switch.config import read_jsonc
        data = read_jsonc(oc.get_config_path())
        assert data["permission"]["skill"]["persist-skill"] == "deny"


class TestAgentAvailability:
    """Test agent availability detection."""

    def test_opencode_available(self, client):
        resp = client.get("/api/agents")
        agents = resp.json()["agents"]
        opencode = next(a for a in agents if a["name"] == "opencode")
        assert opencode["available"] is True

    def test_unavailable_agent_returns_404(self, real_env):
        # Remove mimocode config dir
        shutil.rmtree(real_env / ".config" / "mimocode")

        from carrot_switch.web.app import create_app
        with patch("pathlib.Path.home", return_value=real_env):
            client = TestClient(create_app())

            resp = client.get("/api/mcp/mimocode")
            assert resp.status_code == 404
