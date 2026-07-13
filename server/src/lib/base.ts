import { join } from "path";
import { homedir } from "os";

export const CARROT_ROOT = join(homedir(), ".carrotswitch");
export const REPO_ROOT = join(CARROT_ROOT, "repository");
export const AGENTS_ROOT = join(CARROT_ROOT, "agents");
export const BACKUP_ROOT = join(CARROT_ROOT, "backup");
export const LOG_ROOT = join(CARROT_ROOT, "logs");
