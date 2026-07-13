"""Tests for carrot_switch.web.api."""
import pytest
from fastapi.testclient import TestClient

from carrot_switch.web.app import create_app


@pytest.fixture
def client(tmp_home):
    """Create a test client with mocked config paths."""
    from carrot_switch.config import opencode, mimocode, write_jsonc

    oc_dir = tmp_home / ".config" / "opencode"
    oc_dir.mkdir(parents=True)
    write_jsonc(oc_dir / "opencode.jsonc", {"mcp": {}, "permission": {}})

    mc_dir = tmp_home / ".config" / "mimocode"
    mc_dir.mkdir(parents=True)
    write_jsonc(mc_dir / "mimocode.jsonc", {"mcp": {}, "permission": {}})

    app = create_app()
    return TestClient(app)


class TestAgentsEndpoint:
    def test_list_agents(self, client):
        resp = client.get("/api/agents")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["agents"]) == 2
        names = [a["name"] for a in data["agents"]]
        assert "opencode" in names
        assert "mimocode" in names


class TestMcpEndpoints:
    def test_get_servers(self, client):
        resp = client.get("/api/mcp/opencode")
        assert resp.status_code == 200
        assert "servers" in resp.json()

    def test_add_server(self, client):
        resp = client.post("/api/mcp/opencode", json={
            "name": "test-server",
            "type": "local",
            "command": ["python", "-m", "server"],
        })
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

        resp = client.get("/api/mcp/opencode")
        assert "test-server" in resp.json()["servers"]

    def test_update_server(self, client):
        client.post("/api/mcp/opencode", json={"name": "s1", "type": "local"})
        resp = client.put("/api/mcp/opencode/s1", json={
            "name": "s1",
            "type": "remote",
            "url": "http://localhost:8080",
        })
        assert resp.status_code == 200

    def test_delete_server(self, client):
        client.post("/api/mcp/opencode", json={"name": "s1", "type": "local"})
        resp = client.delete("/api/mcp/opencode/s1")
        assert resp.status_code == 200

    def test_toggle_server(self, client):
        client.post("/api/mcp/opencode", json={"name": "s1", "type": "local"})
        resp = client.patch("/api/mcp/opencode/s1/toggle")
        assert resp.status_code == 200
        assert resp.json()["enabled"] is False

    def test_unknown_agent(self, client):
        resp = client.get("/api/mcp/unknown")
        assert resp.status_code == 404


class TestSkillEndpoints:
    def test_list_skills(self, client):
        resp = client.get("/api/skills/opencode")
        assert resp.status_code == 200
        assert "skills" in resp.json()

    def test_uninstall_nonexistent(self, client):
        resp = client.delete("/api/skills/opencode/nonexistent")
        assert resp.status_code == 404
