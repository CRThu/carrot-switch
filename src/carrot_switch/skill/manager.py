"""Skill installation, uninstallation, and permission management."""
import shutil
import subprocess
import tempfile
import zipfile
import urllib.request
from pathlib import Path
from carrot_switch.skill import paths
from carrot_switch.backup import backup_skill
from carrot_switch.store import skill as skill_store


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

    # Record in local store
    skill_store.record_install(agent, name, source_path, "local", str(dest))
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

    # Record in local store
    skill_store.record_install(agent, name, repo_url, "github", str(dest))
    return name


def install_from_zip(agent: str, source: str, skill_name: str | None = None) -> str:
    """Install a skill from a ZIP file (local path or URL)."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)

        # Download if URL
        if source.startswith("http"):
            zip_path = tmp_path / "skill.zip"
            urllib.request.urlretrieve(source, zip_path)
        else:
            zip_path = Path(source)
            if not zip_path.exists():
                raise ValueError(f"ZIP file not found: {source}")

        # Extract
        extract_dir = tmp_path / "extracted"
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(extract_dir)

        # Find the skill directory (contains SKILL.md)
        skill_dir = None
        for entry in extract_dir.rglob("SKILL.md"):
            skill_dir = entry.parent
            break

        if not skill_dir:
            raise ValueError("ZIP does not contain a directory with SKILL.md")

        name = skill_name or skill_dir.name
        dest = paths.get_user_skills_dir(agent) / name
        if dest.exists():
            raise FileExistsError(f"Skill '{name}' already exists")

        backup_skill(agent, name)
        shutil.copytree(skill_dir, dest)

        # Record in local store
        skill_store.record_install(agent, name, source, "zip", str(dest))
        return name


def install_from_url(agent: str, url: str, skill_name: str | None = None) -> str:
    """Install a skill from a direct URL (expects a ZIP or tarball)."""
    # Determine file extension from URL
    ext = ".zip"
    if ".tar.gz" in url or ".tgz" in url:
        ext = ".tar.gz"
    elif ".tar" in url:
        ext = ".tar"

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        archive_path = tmp_path / f"skill{ext}"

        # Download
        urllib.request.urlretrieve(url, archive_path)

        # Extract based on extension
        extract_dir = tmp_path / "extracted"
        if ext == ".zip":
            with zipfile.ZipFile(archive_path, "r") as zf:
                zf.extractall(extract_dir)
        else:
            import tarfile
            with tarfile.open(archive_path) as tf:
                tf.extractall(extract_dir)

        # Find the skill directory (contains SKILL.md)
        skill_dir = None
        for entry in extract_dir.rglob("SKILL.md"):
            skill_dir = entry.parent
            break

        if not skill_dir:
            raise ValueError("Downloaded archive does not contain a directory with SKILL.md")

        name = skill_name or skill_dir.name
        dest = paths.get_user_skills_dir(agent) / name
        if dest.exists():
            raise FileExistsError(f"Skill '{name}' already exists")

        backup_skill(agent, name)
        shutil.copytree(skill_dir, dest)

        # Record in local store
        skill_store.record_install(agent, name, url, "url", str(dest))
        return name


def uninstall(agent: str, name: str) -> None:
    """Uninstall a user skill."""
    skill_dir = paths.get_user_skills_dir(agent) / name
    if not skill_dir.exists():
        raise FileNotFoundError(f"Skill '{name}' not found")
    backup_skill(agent, name)
    shutil.rmtree(skill_dir)

    # Remove from local store
    skill_store.record_uninstall(agent, name)


def list_installed(agent: str) -> list[dict]:
    """List all installed skills with their permission status and metadata."""
    from carrot_switch.config import opencode as oc_config, mimocode as mc_config, claude as cl_config

    if agent == "opencode":
        config = oc_config
    elif agent == "mimocode":
        config = mc_config
    elif agent == "claude":
        config = cl_config
    else:
        return []

    permissions = config.get_skills_permission()
    local_meta = skill_store.load(agent).get("skills", {})

    skills = paths.list_skills(agent)
    for skill in skills:
        perm = permissions.get(skill["name"], "allow")
        skill["allowed"] = perm == "allow"

        # Enrich with local store metadata
        meta = local_meta.get(skill["name"], {})
        skill["source"] = meta.get("source", "")
        skill["source_type"] = meta.get("source_type", "")
        skill["installed_at"] = meta.get("installed_at", "")

    return skills


def toggle_permission(agent: str, name: str) -> bool:
    """Toggle skill permission. Returns new allowed state."""
    from carrot_switch.config import opencode as oc_config, mimocode as mc_config, claude as cl_config

    if agent == "opencode":
        config = oc_config
    elif agent == "mimocode":
        config = mc_config
    elif agent == "claude":
        config = cl_config
    else:
        return True

    permissions = config.get_skills_permission()
    current = permissions.get(name, "allow") == "allow"
    config.set_skill_permission(name, not current)
    return not current
