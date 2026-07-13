"""Skill metadata local store."""
from pathlib import Path
from carrot_switch.store import STORE_ROOT, _ensure_dir, _now_iso
from carrot_switch.config import read_jsonc, write_jsonc


def _store_path(agent: str) -> Path:
    return STORE_ROOT / "skills" / f"{agent}.json"


def load(agent: str) -> dict:
    """Load local skill store. Returns {"skills": {...}}."""
    path = _store_path(agent)
    if not path.exists():
        return {"skills": {}}
    return read_jsonc(path)


def save(agent: str, data: dict) -> None:
    """Persist skill store to disk."""
    _ensure_dir(_store_path(agent))
    write_jsonc(_store_path(agent), data)


def record_install(agent: str, name: str, source: str, source_type: str, path: str) -> None:
    """Record a skill installation."""
    data = load(agent)
    data["skills"][name] = {
        "source": source,
        "source_type": source_type,
        "installed_at": _now_iso(),
        "path": path,
    }
    save(agent, data)


def record_uninstall(agent: str, name: str) -> None:
    """Remove a skill record."""
    data = load(agent)
    data["skills"].pop(name, None)
    save(agent, data)


def get_skill_meta(agent: str, name: str) -> dict | None:
    """Get metadata for a specific skill."""
    data = load(agent)
    return data["skills"].get(name)
