"""REST API routes."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from carrot_switch.config import opencode as oc, mimocode as mc, claude as cl
from carrot_switch.store import mcp as mcp_store, skill as skill_store
from carrot_switch.skill import manager as skill_mgr

router = APIRouter(prefix="/api")


class AddMcpRequest(BaseModel):
    name: str
    type: str = "local"
    command: str | list[str] | None = None
    url: str | None = None
    environment: dict[str, str] | None = None


class InstallSkillRequest(BaseModel):
    source: str
    source_type: str = "github"


AGENTS = {
    "opencode": oc,
    "mimocode": mc,
    "claude": cl,
}


def _get_config(agent: str):
    cfg = AGENTS.get(agent)
    if not cfg:
        raise HTTPException(404, f"Unknown agent: {agent}")
    return cfg


def _check_available(agent: str):
    cfg = _get_config(agent)
    if not cfg.is_available():
        raise HTTPException(404, f"{agent} is not installed")


@router.get("/agents")
async def list_agents():
    return {
        "agents": [
            {"name": name, "available": cfg.is_available(), "config_path": str(cfg.get_config_path())}
            for name, cfg in AGENTS.items()
        ]
    }


# ── MCP endpoints (store-backed) ──────────────────────────────────────────


@router.get("/mcp/{agent}")
async def get_mcp_servers(agent: str):
    _check_available(agent)
    return mcp_store.load(agent)


@router.post("/mcp/{agent}")
async def add_mcp_server(agent: str, req: AddMcpRequest):
    _check_available(agent)
    cfg = _get_config(agent)
    from carrot_switch.backup import backup_config
    backup_config(agent, cfg.get_config_path())

    # Normalize command: string → array
    command = req.command
    if isinstance(command, str):
        command = command.split()

    server: dict = {"type": req.type}
    if command:
        server["command"] = command
    if req.url:
        server["url"] = req.url
    if req.environment:
        server["environment"] = req.environment

    mcp_store.add_server(agent, req.name, server)
    mcp_store.sync_to_agent(agent)
    return {"ok": True}


@router.put("/mcp/{agent}/{name}")
async def update_mcp_server(agent: str, name: str, req: AddMcpRequest):
    _check_available(agent)
    cfg = _get_config(agent)
    from carrot_switch.backup import backup_config
    backup_config(agent, cfg.get_config_path())

    command = req.command
    if isinstance(command, str):
        command = command.split()

    server: dict = {"type": req.type}
    if command:
        server["command"] = command
    if req.url:
        server["url"] = req.url
    if req.environment:
        server["environment"] = req.environment

    mcp_store.update_server(agent, name, server)
    mcp_store.sync_to_agent(agent)
    return {"ok": True}


@router.delete("/mcp/{agent}/{name}")
async def delete_mcp_server(agent: str, name: str):
    _check_available(agent)
    cfg = _get_config(agent)
    from carrot_switch.backup import backup_config
    backup_config(agent, cfg.get_config_path())

    mcp_store.delete_server(agent, name)
    mcp_store.sync_to_agent(agent)
    return {"ok": True}


@router.patch("/mcp/{agent}/{name}/toggle")
async def toggle_mcp_server(agent: str, name: str):
    _check_available(agent)
    enabled = mcp_store.toggle_server(agent, name)
    return {"enabled": enabled}


# ── Skill endpoints ────────────────────────────────────────────────────────


@router.get("/skills/{agent}")
async def list_skills(agent: str):
    _check_available(agent)
    skills = skill_mgr.list_installed(agent)
    return {"skills": skills}


@router.post("/skills/{agent}/install")
async def install_skill(agent: str, req: InstallSkillRequest):
    _check_available(agent)
    try:
        if req.source_type == "local":
            skill_mgr.install_from_local(agent, req.source)
        elif req.source_type == "zip":
            skill_mgr.install_from_zip(agent, req.source)
        elif req.source_type == "url":
            skill_mgr.install_from_url(agent, req.source)
        else:
            skill_mgr.install_from_github(agent, req.source)
    except (ValueError, FileExistsError) as e:
        raise HTTPException(400, str(e))
    return {"ok": True}


@router.delete("/skills/{agent}/{name}")
async def uninstall_skill(agent: str, name: str):
    _check_available(agent)
    try:
        skill_mgr.uninstall(agent, name)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    return {"ok": True}


@router.patch("/skills/{agent}/{name}/permission")
async def toggle_skill_permission(agent: str, name: str):
    _check_available(agent)
    allowed = skill_mgr.toggle_permission(agent, name)
    return {"allowed": allowed}
