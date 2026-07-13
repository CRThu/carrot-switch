"""OpenCode configuration CRUD."""
from pathlib import Path
from carrot_switch.config.base import LazyBaseConfig


def _get_path() -> Path:
    return Path.home() / ".config" / "opencode" / "opencode.jsonc"


_config = LazyBaseConfig(_get_path)

get_config_path = _config.get_config_path
is_available = _config.is_available
get_mcp_servers = _config.get_mcp_servers
add_mcp_server = _config.add_mcp_server
update_mcp_server = _config.update_mcp_server
delete_mcp_server = _config.delete_mcp_server
toggle_mcp_server = _config.toggle_mcp_server
get_skills_permission = _config.get_skills_permission
set_skill_permission = _config.set_skill_permission
