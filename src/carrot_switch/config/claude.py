"""Claude Code configuration CRUD.

Claude Code stores MCP servers in ~/.claude.json under the "mcpServers" key.
Skills are stored in ~/.claude/skills/.

Key differences from OpenCode/MiMoCode:
- command is a string (not array)
- env (not environment)
- No 'enabled' field (all servers are active)
- type: "http" for remote (not "remote")
"""
from pathlib import Path
from carrot_switch.config import read_jsonc, write_jsonc


def _get_config_path() -> Path:
    return Path.home() / ".claude.json"


def get_config_path() -> Path:
    return _get_config_path()


def get_skills_dir() -> Path:
    return Path.home() / ".claude" / "skills"


def is_available() -> bool:
    return _get_config_path().exists()


def get_mcp_servers() -> dict:
    """Read MCP servers from Claude config.

    Returns normalized format (array command, environment key) for internal use.
    """
    cfg = read_jsonc(_get_config_path())
    raw_servers = cfg.get("mcpServers", {})
    normalized = {}
    for name, server in raw_servers.items():
        normalized[name] = _normalize_from_claude(server)
    return normalized


def _normalize_from_claude(server: dict) -> dict:
    """Convert Claude format to internal format."""
    result = dict(server)

    # Add default type if missing (Claude doesn't have a type field for local servers)
    if "type" not in result:
        result["type"] = "local"

    # Convert command string to array
    if isinstance(result.get("command"), str):
        cmd = result.pop("command")
        args = result.pop("args", [])
        result["command"] = [cmd] + args

    # Rename env to environment
    if "env" in result:
        result["environment"] = result.pop("env")

    # Map type: "http" to "remote"
    if result.get("type") == "http":
        result["type"] = "remote"

    # Add enabled field (Claude doesn't have it)
    if "enabled" not in result:
        result["enabled"] = True

    return result


def _to_claude_format(server: dict) -> dict:
    """Convert internal format to Claude format."""
    result = dict(server)

    # Convert command array to string + args
    cmd_list = result.pop("command", [])
    if cmd_list:
        result["command"] = cmd_list[0]
        if len(cmd_list) > 1:
            result["args"] = cmd_list[1:]

    # Rename environment to env
    if "environment" in result:
        result["env"] = result.pop("environment")

    # Map type: "remote" to "http"
    if result.get("type") == "remote":
        result["type"] = "http"

    # Remove enabled (Claude doesn't use it)
    result.pop("enabled", None)

    return result


def add_mcp_server(name: str, server: dict) -> None:
    cfg = read_jsonc(_get_config_path())
    claude_server = _to_claude_format(server)
    cfg.setdefault("mcpServers", {})[name] = claude_server
    write_jsonc(_get_config_path(), cfg)


def update_mcp_server(name: str, server: dict) -> None:
    cfg = read_jsonc(_get_config_path())
    if name not in cfg.get("mcpServers", {}):
        raise KeyError(f"MCP server '{name}' not found")
    claude_server = _to_claude_format(server)
    cfg["mcpServers"][name] = claude_server
    write_jsonc(_get_config_path(), cfg)


def delete_mcp_server(name: str) -> None:
    cfg = read_jsonc(_get_config_path())
    servers = cfg.get("mcpServers", {})
    if name not in servers:
        raise KeyError(f"MCP server '{name}' not found")
    del servers[name]
    write_jsonc(_get_config_path(), cfg)


def get_skills_permission() -> dict:
    """Claude doesn't have a permission system for skills like OpenCode/MiMoCode."""
    return {}


def set_skill_permission(name: str, allowed: bool) -> None:
    """Claude doesn't have a permission system for skills."""
    pass
