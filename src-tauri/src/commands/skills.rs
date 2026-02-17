use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Skill {
    pub name: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compatibility: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub allowed_tools: Option<String>,
    pub install_path: String,
    pub scope: String,
    pub agents: Vec<String>,
    pub has_update: bool,
    pub body: String,
}

#[derive(Debug, Deserialize)]
struct SkillFrontmatter {
    name: Option<String>,
    description: Option<String>,
    license: Option<String>,
    compatibility: Option<String>,
    metadata: Option<HashMap<String, serde_yaml::Value>>,
    #[serde(rename = "allowed-tools")]
    allowed_tools: Option<String>,
}

fn parse_skill_md_content(content: &str) -> Option<(SkillFrontmatter, String)> {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return None;
    }

    let after_first = &trimmed[3..];
    let end_idx = after_first.find("\n---")?;
    let yaml_str = &after_first[..end_idx];
    let body_start = end_idx + 4; // skip \n---
    let body = if body_start < after_first.len() {
        after_first[body_start..].trim_start_matches('\n').to_string()
    } else {
        String::new()
    };

    let frontmatter: SkillFrontmatter = serde_yaml::from_str(yaml_str).ok()?;
    Some((frontmatter, body))
}

fn flatten_metadata(metadata: Option<HashMap<String, serde_yaml::Value>>) -> Option<HashMap<String, String>> {
    metadata.map(|m| {
        m.into_iter()
            .map(|(k, v)| {
                let val = match v {
                    serde_yaml::Value::String(s) => s,
                    serde_yaml::Value::Bool(b) => b.to_string(),
                    serde_yaml::Value::Number(n) => n.to_string(),
                    _ => format!("{:?}", v),
                };
                (k, val)
            })
            .collect()
    })
}

pub fn scan_directory_for_skills(base_path: &Path, scope: &str, agent_id: &str) -> Vec<Skill> {
    let mut skills = Vec::new();

    if !base_path.exists() {
        return skills;
    }

    for entry in WalkDir::new(base_path).follow_links(true).max_depth(4).into_iter().filter_map(|e| e.ok()) {
        if entry.file_name() == "SKILL.md" {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Some((fm, body)) = parse_skill_md_content(&content) {
                    let name = fm.name.unwrap_or_else(|| {
                        entry
                            .path()
                            .parent()
                            .and_then(|p| p.file_name())
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_default()
                    });

                    let description = fm.description.unwrap_or_default();

                    let skill = Skill {
                        name,
                        description,
                        license: fm.license,
                        compatibility: fm.compatibility,
                        metadata: flatten_metadata(fm.metadata),
                        allowed_tools: fm.allowed_tools,
                        install_path: entry.path().to_string_lossy().to_string(),
                        scope: scope.to_string(),
                        agents: vec![agent_id.to_string()],
                        has_update: false,
                        body,
                    };

                    skills.push(skill);
                }
            }
        }
    }

    skills
}

pub fn merge_skills(all_skills: Vec<Skill>) -> Vec<Skill> {
    let mut map: HashMap<String, Skill> = HashMap::new();

    for skill in all_skills {
        let key = format!("{}::{}", skill.scope, skill.name);
        if let Some(existing) = map.get_mut(&key) {
            for agent in &skill.agents {
                if !existing.agents.contains(agent) {
                    existing.agents.push(agent.clone());
                }
            }
        } else {
            map.insert(key, skill);
        }
    }

    let mut result: Vec<Skill> = map.into_values().collect();
    result.sort_by(|a, b| a.name.cmp(&b.name));
    result
}

#[tauri::command]
pub fn list_skills(scope: String) -> Result<Vec<Skill>, String> {
    let agents = super::agents::get_agent_definitions();
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    let settings = super::settings::get_settings().unwrap_or_default();
    let scan_roots: Vec<PathBuf> = settings.scan_roots.iter().map(|r| PathBuf::from(r)).collect();

    let mut all_skills = Vec::new();

    for agent in &agents {
        if scope == "all" || scope == "global" {
            let global_path = home.join(&agent.global_path);
            let skills = scan_directory_for_skills(&global_path, "global", &agent.id);
            all_skills.extend(skills);
        }

        if scope == "all" || scope == "project" {
            for root in &scan_roots {
                if !root.exists() {
                    continue;
                }
                for entry in WalkDir::new(root)
                    .follow_links(true)
                    .into_iter()
                    .filter_entry(|e| {
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
                    if path.is_dir() && path.to_string_lossy().ends_with(&agent.project_path) {
                        let skills = scan_directory_for_skills(path, "project", &agent.id);
                        all_skills.extend(skills);
                    }
                }
            }
        }
    }

    Ok(merge_skills(all_skills))
}

#[tauri::command]
pub fn parse_skill_md(path: String) -> Result<Skill, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))?;
    let (fm, body) = parse_skill_md_content(&content)
        .ok_or_else(|| "Invalid SKILL.md format: missing frontmatter".to_string())?;

    let name = fm.name.unwrap_or_default();
    let description = fm.description.unwrap_or_default();

    Ok(Skill {
        name,
        description,
        license: fm.license,
        compatibility: fm.compatibility,
        metadata: flatten_metadata(fm.metadata),
        allowed_tools: fm.allowed_tools,
        install_path: path,
        scope: "unknown".to_string(),
        agents: vec![],
        has_update: false,
        body,
    })
}

#[tauri::command]
pub fn get_skills_directories() -> Result<serde_json::Value, String> {
    let agents = super::agents::get_agent_definitions();
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

    let mut project_paths = Vec::new();
    let mut global_paths = Vec::new();

    for agent in &agents {
        let global = home.join(&agent.global_path);
        if global.exists() {
            global_paths.push(global.to_string_lossy().to_string());
        }
        let project = cwd.join(&agent.project_path);
        if project.exists() {
            project_paths.push(project.to_string_lossy().to_string());
        }
    }

    Ok(serde_json::json!({
        "project": project_paths,
        "global": global_paths,
    }))
}
