"""Base configuration CRUD shared by all agents."""
from pathlib import Path
from carrot_switch.config import read_jsonc, write_jsonc


class BaseConfig:
    def __init__(self, config_path: Path):
        self._config_path = config_path

    def get_config_path(self) -> Path:
        return self._config_path

    def is_available(self) -> bool:
        return self._config_path.parent.exists()

    def get_mcp_servers(self) -> dict:
        cfg = read_jsonc(self._config_path)
        return cfg.get("mcp", {})

    def add_mcp_server(self, name: str, server: dict) -> None:
        cfg = read_jsonc(self._config_path)
        cfg.setdefault("mcp", {})[name] = server
        write_jsonc(self._config_path, cfg)

    def update_mcp_server(self, name: str, server: dict) -> None:
        cfg = read_jsonc(self._config_path)
        if name not in cfg.get("mcp", {}):
            raise KeyError(f"MCP server '{name}' not found")
        cfg["mcp"][name] = server
        write_jsonc(self._config_path, cfg)

    def delete_mcp_server(self, name: str) -> None:
        cfg = read_jsonc(self._config_path)
        servers = cfg.get("mcp", {})
        if name not in servers:
            raise KeyError(f"MCP server '{name}' not found")
        del servers[name]
        write_jsonc(self._config_path, cfg)

    def toggle_mcp_server(self, name: str) -> bool:
        cfg = read_jsonc(self._config_path)
        servers = cfg.get("mcp", {})
        if name not in servers:
            raise KeyError(f"MCP server '{name}' not found")
        current = servers[name].get("enabled", True)
        servers[name]["enabled"] = not current
        write_jsonc(self._config_path, cfg)
        return not current

    def get_skills_permission(self) -> dict:
        cfg = read_jsonc(self._config_path)
        return cfg.get("permission", {}).get("skill", {})

    def set_skill_permission(self, name: str, allowed: bool) -> None:
        cfg = read_jsonc(self._config_path)
        cfg.setdefault("permission", {}).setdefault("skill", {})[name] = "allow" if allowed else "deny"
        write_jsonc(self._config_path, cfg)


class LazyBaseConfig(BaseConfig):
    """BaseConfig that resolves config_path lazily via a callable."""

    def __init__(self, path_fn):
        self._path_fn = path_fn

    @property
    def _config_path(self):
        return self._path_fn()
