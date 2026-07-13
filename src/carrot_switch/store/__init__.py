"""Local JSON storage for Carrot Switch state."""
from datetime import datetime, timezone
from pathlib import Path

STORE_ROOT = Path.home() / "AppData" / "Roaming" / ".carrotswitch"


def _ensure_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
