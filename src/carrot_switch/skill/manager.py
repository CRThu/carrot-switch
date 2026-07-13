"""Skill installation, uninstallation, and permission management."""
import shutil
import subprocess
from pathlib import Path
from carrot_switch.skill import paths
from carrot_switch.backup import backup_skill


def install_from_local(agent: str, source_path: str, skill_name: str | None = None) -> str:
    """Install a skill from a local directory. Returns the installed skill name."""
    src = Path(source_path)
    if not src.is_dir():
        raise ValueError(f"Source path is not a directory: {source_path}")
    if not (src / "SKILL.md").exists():
        raise ValueError(f"Source directory does not contain SKILL.md: {source_path}")

    name = skill_name or src.name
    dest = paths.get_user_skills_dir(agent) / name
    if dest.exists():
        raise FileExistsError(f"Skill '{name}' already exists")

    backup_skill(agent, name)
    shutil.copytree(src, dest)
    return name


def install_from_github(agent: str, repo_url: str, skill_name: str | None = None) -> str:
    """Install a skill from a GitHub repo. Returns the installed skill name."""
    # Normalize repo URL
    if not repo_url.startswith("http"):
        repo_url = f"https://github.com/{repo_url}.git"

    name = skill_name or repo_url.split("/")[-1].replace(".git", "")
    dest = paths.get_user_skills_dir(agent) / name
    if dest.exists():
        raise FileExistsError(f"Skill '{name}' already exists")

    dest.parent.mkdir(parents=True, exist_ok=True)
    backup_skill(agent, name)
    subprocess.run(["git", "clone", repo_url, str(dest)], check=True)
    return name


def uninstall(agent: str, name: str) -> None:
    """Uninstall a user skill."""
    skill_dir = paths.get_user_skills_dir(agent) / name
    if not skill_dir.exists():
        raise FileNotFoundError(f"Skill '{name}' not found")
    backup_skill(agent, name)
    shutil.rmtree(skill_dir)


def list_installed(agent: str) -> list[dict]:
    """List all installed skills with their permission status."""
    from carrot_switch.config import opencode as oc_config, mimocode as mc_config

    config = oc_config if agent == "opencode" else mc_config
    permissions = config.get_skills_permission()

    skills = paths.list_skills(agent)
    for skill in skills:
        perm = permissions.get(skill["name"], "allow")
        skill["allowed"] = perm == "allow"

    return skills


def toggle_permission(agent: str, name: str) -> bool:
    """Toggle skill permission. Returns new allowed state."""
    from carrot_switch.config import opencode as oc_config, mimocode as mc_config

    config = oc_config if agent == "opencode" else mc_config
    permissions = config.get_skills_permission()
    current = permissions.get(name, "allow") == "allow"
    config.set_skill_permission(name, not current)
    return not current
