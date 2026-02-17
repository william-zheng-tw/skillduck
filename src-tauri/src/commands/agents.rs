use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentDefinition {
    pub id: String,
    pub display_name: String,
    pub project_path: String,
    pub global_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentGlobalInfo {
    pub path: String,
    pub skills: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentProjectInfo {
    pub path: String,
    pub project_root: String,
    pub skills: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentInfo {
    pub id: String,
    pub display_name: String,
    pub detected: bool,
    pub global: AgentGlobalInfo,
    pub projects: Vec<AgentProjectInfo>,
}

pub fn get_agent_definitions() -> Vec<AgentDefinition> {
    vec![
        AgentDefinition {
            id: "cursor".into(),
            display_name: "Cursor".into(),
            project_path: ".cursor/skills".into(),
            global_path: ".cursor/skills".into(),
        },
        AgentDefinition {
            id: "claude-code".into(),
            display_name: "Claude Code".into(),
            project_path: ".claude/skills".into(),
            global_path: ".claude/skills".into(),
        },
        AgentDefinition {
            id: "codex".into(),
            display_name: "Codex".into(),
            project_path: ".agents/skills".into(),
            global_path: ".codex/skills".into(),
        },
        AgentDefinition {
            id: "opencode".into(),
            display_name: "OpenCode".into(),
            project_path: ".agents/skills".into(),
            global_path: ".config/opencode/skills".into(),
        },
        AgentDefinition {
            id: "cline".into(),
            display_name: "Cline".into(),
            project_path: ".cline/skills".into(),
            global_path: ".cline/skills".into(),
        },
        AgentDefinition {
            id: "roo".into(),
            display_name: "Roo Code".into(),
            project_path: ".roo/skills".into(),
            global_path: ".roo/skills".into(),
        },
        AgentDefinition {
            id: "windsurf".into(),
            display_name: "Windsurf".into(),
            project_path: ".windsurf/skills".into(),
            global_path: ".codeium/windsurf/skills".into(),
        },
        AgentDefinition {
            id: "github-copilot".into(),
            display_name: "GitHub Copilot".into(),
            project_path: ".agents/skills".into(),
            global_path: ".copilot/skills".into(),
        },
        AgentDefinition {
            id: "gemini-cli".into(),
            display_name: "Gemini CLI".into(),
            project_path: ".agents/skills".into(),
            global_path: ".gemini/skills".into(),
        },
        AgentDefinition {
            id: "amp".into(),
            display_name: "Amp".into(),
            project_path: ".agents/skills".into(),
            global_path: ".config/agents/skills".into(),
        },
        AgentDefinition {
            id: "continue".into(),
            display_name: "Continue".into(),
            project_path: ".continue/skills".into(),
            global_path: ".continue/skills".into(),
        },
        AgentDefinition {
            id: "goose".into(),
            display_name: "Goose".into(),
            project_path: ".goose/skills".into(),
            global_path: ".config/goose/skills".into(),
        },
        AgentDefinition {
            id: "trae".into(),
            display_name: "Trae".into(),
            project_path: ".trae/skills".into(),
            global_path: ".trae/skills".into(),
        },
        AgentDefinition {
            id: "augment".into(),
            display_name: "Augment".into(),
            project_path: ".augment/skills".into(),
            global_path: ".augment/skills".into(),
        },
        AgentDefinition {
            id: "kilo".into(),
            display_name: "Kilo Code".into(),
            project_path: ".kilocode/skills".into(),
            global_path: ".kilocode/skills".into(),
        },
        AgentDefinition {
            id: "junie".into(),
            display_name: "Junie".into(),
            project_path: ".junie/skills".into(),
            global_path: ".junie/skills".into(),
        },
        AgentDefinition {
            id: "openhands".into(),
            display_name: "OpenHands".into(),
            project_path: ".openhands/skills".into(),
            global_path: ".openhands/skills".into(),
        },
        AgentDefinition {
            id: "zencoder".into(),
            display_name: "Zencoder".into(),
            project_path: ".zencoder/skills".into(),
            global_path: ".zencoder/skills".into(),
        },
    ]
}

fn find_skills_in_dir(dir: &PathBuf) -> Vec<String> {
    let mut names = Vec::new();
    if !dir.exists() {
        return names;
    }
    for entry in WalkDir::new(dir).follow_links(true).max_depth(3).into_iter().filter_map(|e| e.ok()) {
        if entry.file_name() == "SKILL.md" {
            if let Some(parent) = entry.path().parent() {
                if let Some(name) = parent.file_name() {
                    names.push(name.to_string_lossy().to_string());
                }
            }
        }
    }
    names
}

fn detect_agent_presence(home: &PathBuf, agent: &AgentDefinition) -> bool {
    let global_path = home.join(&agent.global_path);
    if global_path.exists() {
        return true;
    }

    // Check for common config files/directories that indicate the agent is installed
    let config_indicators: Vec<PathBuf> = match agent.id.as_str() {
        "cursor" => vec![home.join(".cursor")],
        "claude-code" => vec![home.join(".claude")],
        "codex" => vec![home.join(".codex")],
        "opencode" => vec![home.join(".config/opencode")],
        "cline" => vec![home.join(".cline")],
        "roo" => vec![home.join(".roo")],
        "windsurf" => vec![home.join(".codeium")],
        "github-copilot" => vec![home.join(".copilot")],
        "gemini-cli" => vec![home.join(".gemini")],
        "amp" => vec![home.join(".config/agents")],
        "continue" => vec![home.join(".continue")],
        "goose" => vec![home.join(".config/goose")],
        "trae" => vec![home.join(".trae")],
        "augment" => vec![home.join(".augment")],
        _ => vec![],
    };

    config_indicators.iter().any(|p| p.exists())
}

fn scan_for_projects(agent: &AgentDefinition, scan_roots: &[PathBuf]) -> Vec<AgentProjectInfo> {
    let mut projects = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();

    for root in scan_roots {
        if !root.exists() {
            continue;
        }

        for entry in WalkDir::new(root)
            .follow_links(true)
            .into_iter()
            .filter_entry(|e| {
                // Skip common directories that won't contain agent configs
                if let Some(name) = e.file_name().to_str() {
                    !matches!(
                        name,
                        "node_modules" | ".git" | "target" | "dist" | "build" | 
                        ".next" | ".nuxt" | ".venv" | "venv" | "__pycache__" |
                        ".cache" | "vendor" | "bower_components"
                    )
                } else {
                    true
                }
            })
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            
            // Check if this path ends with the agent's project_path
            if path.is_dir() && path.to_string_lossy().ends_with(&agent.project_path) {
                // Get the project root by stripping the agent's project_path segments
                let depth = agent.project_path.split('/').filter(|s| !s.is_empty()).count();
                let mut project_root_opt = Some(path.to_path_buf());
                for _ in 0..depth {
                    project_root_opt = project_root_opt.and_then(|p| p.parent().map(|pp| pp.to_path_buf()));
                }
                if let Some(project_root) = project_root_opt {
                    let project_root_str = project_root.to_string_lossy().to_string();
                    
                    // Skip if we've already seen this project
                    if !seen_paths.insert(project_root_str.clone()) {
                        continue;
                    }

                    let skills = find_skills_in_dir(&path.to_path_buf());
                    
                    // Only add if there are skills
                    if !skills.is_empty() {
                        projects.push(AgentProjectInfo {
                            path: path.to_string_lossy().to_string(),
                            project_root: project_root_str,
                            skills,
                        });
                    }
                }
            }
        }
    }

    // Sort by path for consistent ordering
    projects.sort_by(|a, b| a.path.cmp(&b.path));
    projects
}

#[tauri::command]
pub fn detect_agents(scan_roots: Option<Vec<String>>) -> Result<Vec<AgentInfo>, String> {
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    let definitions = get_agent_definitions();

    // Convert scan_roots to PathBuf, or use settings
    let scan_paths: Vec<PathBuf> = if let Some(roots) = scan_roots {
        roots.iter().map(|r| PathBuf::from(r)).collect()
    } else {
        // Try to load from settings, or use defaults
        let settings = super::settings::get_settings().unwrap_or_default();
        settings.scan_roots.iter().map(|r| PathBuf::from(r)).collect()
    };

    let mut agents = Vec::new();

    for def in &definitions {
        let detected = detect_agent_presence(&home, def);

        // Scan global path
        let global_path = home.join(&def.global_path);
        let global_skills = find_skills_in_dir(&global_path);
        
        let global = AgentGlobalInfo {
            path: global_path.to_string_lossy().to_string(),
            skills: global_skills,
        };

        // Scan projects
        let projects = scan_for_projects(def, &scan_paths);

        agents.push(AgentInfo {
            id: def.id.clone(),
            display_name: def.display_name.clone(),
            detected,
            global,
            projects,
        });
    }

    // Sort: detected first
    agents.sort_by(|a, b| b.detected.cmp(&a.detected).then(a.display_name.cmp(&b.display_name)));

    Ok(agents)
}
