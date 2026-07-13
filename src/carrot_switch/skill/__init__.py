"""Skill directory paths for each agent."""
from pathlib import Path


class SkillPaths:
    def __init__(self):
        self._home = Path.home()

    def _get_user_skills(self, agent: str) -> Path:
        if agent == "opencode":
            return self._home / ".codex" / "skills"
        if agent == "mimocode":
            return self._home / ".local" / "share" / "mimocode" / "skills"
        raise ValueError(f"Unknown agent: {agent}")

    def _get_builtin_skills(self, agent: str) -> Path:
        if agent == "opencode":
            return self._home / ".codex" / "skills" / ".system"
        if agent == "mimocode":
            return self._home / ".local" / "share" / "mimocode" / "builtin_skills"
        raise ValueError(f"Unknown agent: {agent}")

    def get_user_skills_dir(self, agent: str) -> Path:
        return self._get_user_skills(agent)

    def get_builtin_skills_dir(self, agent: str) -> Path:
        return self._get_builtin_skills(agent)

    def list_skills(self, agent: str) -> list[dict]:
        """List all skills (user + builtin) for an agent."""
        skills = []
        for builtin_dir in [False, True]:
            base = self._get_builtin_skills(agent) if builtin_dir else self._get_user_skills(agent)
            if not base.exists():
                continue
            for entry in base.iterdir():
                if entry.is_dir() and (entry / "SKILL.md").exists():
                    skills.append({
                        "name": entry.name,
                        "path": str(entry),
                        "builtin": builtin_dir,
                    })
        return skills


paths = SkillPaths()
