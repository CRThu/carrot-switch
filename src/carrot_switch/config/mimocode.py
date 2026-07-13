"""MiMoCode configuration CRUD."""
from pathlib import Path
from carrot_switch.config import read_jsonc, write_jsonc

CONFIG_PATH = Path.home() / ".config" / "mimocode" / "mimocode.jsonc"


def get_config_path() -> Path:
    return CONFIG_PATH


def is_available() -> bool:
    return CONFIG_PATH.parent.exists()


def get_mcp_servers() -> dict:
    cfg = read_jsonc(CONFIG_PATH)
    return cfg.get("mcp", {})


def add_mcp_server(name: str, server: dict) -> None:
    cfg = read_jsonc(CONFIG_PATH)
    cfg.setdefault("mcp", {})[name] = server
    write_jsonc(CONFIG_PATH, cfg)


def update_mcp_server(name: str, server: dict) -> None:
    cfg = read_jsonc(CONFIG_PATH)
    if name not in cfg.get("mcp", {}):
        raise KeyError(f"MCP server '{name}' not found")
    cfg["mcp"][name] = server
    write_jsonc(CONFIG_PATH, cfg)


def delete_mcp_server(name: str) -> None:
    cfg = read_jsonc(CONFIG_PATH)
    servers = cfg.get("mcp", {})
    if name not in servers:
        raise KeyError(f"MCP server '{name}' not found")
    del servers[name]
    write_jsonc(CONFIG_PATH, cfg)


def toggle_mcp_server(name: str) -> bool:
    cfg = read_jsonc(CONFIG_PATH)
    servers = cfg.get("mcp", {})
    if name not in servers:
        raise KeyError(f"MCP server '{name}' not found")
    current = servers[name].get("enabled", True)
    servers[name]["enabled"] = not current
    write_jsonc(CONFIG_PATH, cfg)
    return not current


def get_skills_permission() -> dict:
    cfg = read_jsonc(CONFIG_PATH)
    return cfg.get("permission", {}).get("skill", {})


def set_skill_permission(name: str, allowed: bool) -> None:
    cfg = read_jsonc(CONFIG_PATH)
    cfg.setdefault("permission", {}).setdefault("skill", {})[name] = "allow" if allowed else "deny"
    write_jsonc(CONFIG_PATH, cfg)
