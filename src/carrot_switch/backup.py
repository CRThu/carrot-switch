"""Backup management for configuration and skills."""
import shutil
from datetime import datetime
from pathlib import Path

BACKUP_ROOT = Path.home() / "AppData" / "Roaming" / ".carrotswitch"


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def backup_config(agent: str, config_path: Path) -> Path:
    """Backup a config file before modification."""
    ts = _timestamp()
    dest_dir = BACKUP_ROOT / "mcp" / agent
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"config_{ts}.jsonc"
    if config_path.exists():
        shutil.copy2(config_path, dest)
    return dest


def backup_skill(agent: str, skill_name: str) -> Path | None:
    """Backup a skill directory before modification/deletion."""
    from carrot_switch.skill import paths as skill_paths

    skill_dir = skill_paths.get_user_skills_dir(agent) / skill_name
    if not skill_dir.exists():
        return None

    ts = _timestamp()
    dest_dir = BACKUP_ROOT / "skill" / agent
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{skill_name}_{ts}"
    shutil.copytree(skill_dir, dest)
    return dest
