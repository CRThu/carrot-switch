import { join } from "path";
import { homedir } from "os";
import { BaseConfig } from "./base.js";

let _config: BaseConfig | null = null;

function getConfig(): BaseConfig {
  if (!_config) {
    _config = new BaseConfig(join(homedir(), ".config", "mimocode", "mimocode.jsonc"));
  }
  return _config;
}

export const get_config_path = () => getConfig().configPath;
export const is_available = () => getConfig().isAvailable();
export const get_mcp_servers = () => getConfig().getMcpServers();
export const add_mcp_server = (name: string, server: Record<string, any>) => getConfig().addMcpServer(name, server);
export const update_mcp_server = (name: string, server: Record<string, any>) => getConfig().updateMcpServer(name, server);
export const delete_mcp_server = (name: string) => getConfig().deleteMcpServer(name);
export const toggle_mcp_server = (name: string) => getConfig().toggleMcpServer(name);
export const get_skills_permission = () => getConfig().getSkillsPermission();
export const set_skill_permission = (name: string, allowed: boolean) => getConfig().setSkillPermission(name, allowed);
