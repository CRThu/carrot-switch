"""REST API routes."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from carrot_switch.config import opencode as oc, mimocode as mc
from carrot_switch.skill import manager as skill_mgr

router = APIRouter(prefix="/api")


class AddMcpRequest(BaseModel):
    name: str
    type: str = "local"
    command: list[str] | None = None
    url: str | None = None
    environment: dict[str, str] | None = None


class InstallSkillRequest(BaseModel):
    source: str
    source_type: str = "github"


def _get_config(agent: str):
    if agent == "opencode":
        return oc
    if agent == "mimocode":
        return mc
    raise HTTPException(404, f"Unknown agent: {agent}")


def _check_available(agent: str):
    cfg = _get_config(agent)
    if not cfg.is_available():
        raise HTTPException(404, f"{agent} is not installed")


@router.get("/agents")
async def list_agents():
    return {
        "agents": [
            {"name": "opencode", "available": oc.is_available(), "config_path": str(oc.get_config_path())},
            {"name": "mimocode", "available": mc.is_available(), "config_path": str(mc.get_config_path())},
        ]
    }


@router.get("/mcp/{agent}")
async def get_mcp_servers(agent: str):
    _check_available(agent)
    cfg = _get_config(agent)
    return {"servers": cfg.get_mcp_servers()}


@router.post("/mcp/{agent}")
async def add_mcp_server(agent: str, req: AddMcpRequest):
    _check_available(agent)
    cfg = _get_config(agent)
    from carrot_switch.backup import backup_config
    backup_config(agent, cfg.get_config_path())
    server = {"type": req.type, "enabled": True}
    if req.command:
        server["command"] = req.command
    if req.url:
        server["url"] = req.url
    if req.environment:
        server["environment"] = req.environment
    cfg.add_mcp_server(req.name, server)
    return {"ok": True}


@router.put("/mcp/{agent}/{name}")
async def update_mcp_server(agent: str, name: str, req: AddMcpRequest):
    _check_available(agent)
    cfg = _get_config(agent)
    from carrot_switch.backup import backup_config
    backup_config(agent, cfg.get_config_path())
    server = {"type": req.type, "enabled": cfg.get_mcp_servers().get(name, {}).get("enabled", True)}
    if req.command:
        server["command"] = req.command
    if req.url:
        server["url"] = req.url
    if req.environment:
        server["environment"] = req.environment
    cfg.update_mcp_server(name, server)
    return {"ok": True}


@router.delete("/mcp/{agent}/{name}")
async def delete_mcp_server(agent: str, name: str):
    _check_available(agent)
    cfg = _get_config(agent)
    from carrot_switch.backup import backup_config
    backup_config(agent, cfg.get_config_path())
    cfg.delete_mcp_server(name)
    return {"ok": True}


@router.patch("/mcp/{agent}/{name}/toggle")
async def toggle_mcp_server(agent: str, name: str):
    _check_available(agent)
    cfg = _get_config(agent)
    from carrot_switch.backup import backup_config
    backup_config(agent, cfg.get_config_path())
    enabled = cfg.toggle_mcp_server(name)
    return {"enabled": enabled}


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
