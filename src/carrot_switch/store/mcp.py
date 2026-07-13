"""MCP server local store — primary source of truth."""
from pathlib import Path
from carrot_switch.store import STORE_ROOT, _ensure_dir, _now_iso
from carrot_switch.config import read_jsonc, write_jsonc


def _store_path(agent: str) -> Path:
    return STORE_ROOT / "mcps" / f"{agent}.json"


def load(agent: str) -> dict:
    """Load local MCP store. Returns {"servers": {...}}."""
    path = _store_path(agent)
    if not path.exists():
        return _seed_from_agent(agent)
    data = read_jsonc(path)
    # Ensure every server has a type field
    for server in data.get("servers", {}).values():
        server.setdefault("type", "local")
    return data


def _seed_from_agent(agent: str) -> dict:
    """First run: import from agent config file."""
    from carrot_switch.config import opencode as oc, mimocode as mc, claude as cl

    if agent == "opencode":
        config = oc
    elif agent == "mimocode":
        config = mc
    elif agent == "claude":
        config = cl
    else:
        return {"servers": {}}

    if not config.is_available():
        return {"servers": {}}

    agent_servers = config.get_mcp_servers()
    data = {"servers": {}}
    for name, server in agent_servers.items():
        data["servers"][name] = {
            **server,
            "enabled": server.get("enabled", True),
            "created_at": _now_iso(),
        }
    save(agent, data)
    return data


def save(agent: str, data: dict) -> None:
    """Persist MCP store to disk."""
    _ensure_dir(_store_path(agent))
    write_jsonc(_store_path(agent), data)


def add_server(agent: str, name: str, server: dict) -> None:
    data = load(agent)
    server["created_at"] = _now_iso()
    if "enabled" not in server:
        server["enabled"] = True
    data["servers"][name] = server
    save(agent, data)


def update_server(agent: str, name: str, server: dict) -> None:
    data = load(agent)
    if name not in data["servers"]:
        raise KeyError(f"MCP server '{name}' not found")
    server["created_at"] = data["servers"][name].get("created_at", _now_iso())
    if "enabled" not in server:
        server["enabled"] = data["servers"][name].get("enabled", True)
    data["servers"][name] = server
    save(agent, data)


def delete_server(agent: str, name: str) -> None:
    data = load(agent)
    if name not in data["servers"]:
        raise KeyError(f"MCP server '{name}' not found")
    del data["servers"][name]
    save(agent, data)


def toggle_server(agent: str, name: str) -> bool:
    data = load(agent)
    if name not in data["servers"]:
        raise KeyError(f"MCP server '{name}' not found")
    current = data["servers"][name].get("enabled", True)
    data["servers"][name]["enabled"] = not current
    save(agent, data)
    return not current


def sync_to_agent(agent: str) -> None:
    """Write-through: push local store state to agent config file.

    Strips local-only fields (enabled, created_at) from what goes to agent config.
    """
    from carrot_switch.config import opencode as oc, mimocode as mc, claude as cl

    if agent == "opencode":
        config = oc
    elif agent == "mimocode":
        config = mc
    elif agent == "claude":
        config = cl
    else:
        return

    data = load(agent)
    for name, server in data["servers"].items():
        agent_server = {k: v for k, v in server.items() if k not in ("enabled", "created_at")}
        try:
            config.update_mcp_server(name, agent_server)
        except KeyError:
            config.add_mcp_server(name, agent_server)
