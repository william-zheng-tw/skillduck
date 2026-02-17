use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<DiagnosticItem>,
    pub warnings: Vec<DiagnosticItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiagnosticItem {
    pub field: String,
    pub message: String,
    pub severity: String,
}

#[tauri::command]
pub fn read_skill_md(path: String) -> Result<serde_json::Value, String> {
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))?;

    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return Err("Invalid SKILL.md: missing frontmatter delimiters".to_string());
    }

    let after_first = &trimmed[3..];
    let end_idx = after_first
        .find("\n---")
        .ok_or("Invalid SKILL.md: missing closing frontmatter delimiter")?;
    let yaml_str = &after_first[..end_idx];
    let body_start = end_idx + 4;
    let body = if body_start < after_first.len() {
        after_first[body_start..]
            .trim_start_matches('\n')
            .to_string()
    } else {
        String::new()
    };

    let frontmatter: HashMap<String, serde_yaml::Value> =
        serde_yaml::from_str(yaml_str).map_err(|e| format!("YAML parse error: {}", e))?;

    let mut flat: HashMap<String, String> = HashMap::new();
    for (key, value) in frontmatter {
        match value {
            serde_yaml::Value::String(s) => {
                flat.insert(key, s);
            }
            serde_yaml::Value::Mapping(m) => {
                for (mk, mv) in m {
                    if let serde_yaml::Value::String(k) = mk {
                        let val = match mv {
                            serde_yaml::Value::String(s) => s,
                            other => format!("{:?}", other),
                        };
                        flat.insert(format!("{}.{}", key, k), val);
                    }
                }
            }
            other => {
                flat.insert(key, format!("{:?}", other));
            }
        }
    }

    Ok(serde_json::json!({
        "frontmatter": flat,
        "body": body,
    }))
}

#[tauri::command]
pub fn save_skill_md(
    path: String,
    frontmatter: HashMap<String, String>,
    body: String,
) -> Result<(), String> {
    let mut yaml_lines = Vec::new();

    // Required fields first
    if let Some(name) = frontmatter.get("name") {
        yaml_lines.push(format!("name: {}", name));
    }
    if let Some(desc) = frontmatter.get("description") {
        yaml_lines.push(format!("description: {}", desc));
    }

    // Optional fields
    if let Some(license) = frontmatter.get("license") {
        if !license.is_empty() {
            yaml_lines.push(format!("license: {}", license));
        }
    }
    if let Some(compat) = frontmatter.get("compatibility") {
        if !compat.is_empty() {
            yaml_lines.push(format!("compatibility: {}", compat));
        }
    }
    if let Some(tools) = frontmatter.get("allowed_tools") {
        if !tools.is_empty() {
            yaml_lines.push(format!("allowed-tools: {}", tools));
        }
    }

    // Metadata
    let metadata_keys: Vec<_> = frontmatter
        .keys()
        .filter(|k| k.starts_with("metadata."))
        .collect();
    if !metadata_keys.is_empty() {
        yaml_lines.push("metadata:".to_string());
        for key in metadata_keys {
            let field = key.strip_prefix("metadata.").unwrap();
            let value = &frontmatter[key];
            if !value.is_empty() {
                yaml_lines.push(format!("  {}: \"{}\"", field, value));
            }
        }
    }

    let content = format!("---\n{}\n---\n\n{}", yaml_lines.join("\n"), body);

    // Ensure parent directory exists
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    fs::write(&path, content).map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[tauri::command]
pub fn validate_skill(path: String) -> Result<ValidationResult, String> {
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))?;

    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return Ok(ValidationResult {
            valid: false,
            errors: vec![DiagnosticItem {
                field: "format".into(),
                message: "Missing YAML frontmatter delimiters".into(),
                severity: "error".into(),
            }],
            warnings: vec![],
        });
    }

    let after_first = &trimmed[3..];
    let end_idx = match after_first.find("\n---") {
        Some(idx) => idx,
        None => {
            return Ok(ValidationResult {
                valid: false,
                errors: vec![DiagnosticItem {
                    field: "format".into(),
                    message: "Missing closing frontmatter delimiter".into(),
                    severity: "error".into(),
                }],
                warnings: vec![],
            });
        }
    };

    let yaml_str = &after_first[..end_idx];
    let body_start = end_idx + 4;
    let body = if body_start < after_first.len() {
        after_first[body_start..].trim_start_matches('\n')
    } else {
        ""
    };

    let fm: HashMap<String, serde_yaml::Value> = match serde_yaml::from_str(yaml_str) {
        Ok(v) => v,
        Err(e) => {
            return Ok(ValidationResult {
                valid: false,
                errors: vec![DiagnosticItem {
                    field: "frontmatter".into(),
                    message: format!("Invalid YAML: {}", e),
                    severity: "error".into(),
                }],
                warnings: vec![],
            });
        }
    };

    let name = fm
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let desc = fm
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let dir_name = Path::new(&path)
        .parent()
        .and_then(|p| p.file_name())
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    validate_fields(&name, &desc, &dir_name, body, &fm)
}

#[tauri::command]
pub fn validate_skill_content(
    frontmatter: HashMap<String, String>,
    body: String,
    dir_name: String,
) -> Result<ValidationResult, String> {
    let name = frontmatter.get("name").cloned().unwrap_or_default();
    let desc = frontmatter.get("description").cloned().unwrap_or_default();
    let compat = frontmatter.get("compatibility").cloned().unwrap_or_default();

    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    // Name validation
    validate_name(&name, &mut errors);

    // Name must match directory
    if !dir_name.is_empty() && !name.is_empty() && name != dir_name {
        warnings.push(DiagnosticItem {
            field: "name".into(),
            message: format!(
                "Name '{}' should match directory name '{}'",
                name, dir_name
            ),
            severity: "warning".into(),
        });
    }

    // Description validation
    validate_description(&desc, &mut errors, &mut warnings);

    // Compatibility
    if !compat.is_empty() && compat.len() > 500 {
        errors.push(DiagnosticItem {
            field: "compatibility".into(),
            message: "Compatibility must be <= 500 characters".into(),
            severity: "error".into(),
        });
    }

    // Body warnings
    let body_lines = body.lines().count();
    if body_lines > 500 {
        warnings.push(DiagnosticItem {
            field: "body".into(),
            message: format!("Body is {} lines (recommended < 500)", body_lines),
            severity: "warning".into(),
        });
    }

    let token_estimate = body.len() / 4;
    if token_estimate > 5000 {
        warnings.push(DiagnosticItem {
            field: "body".into(),
            message: format!(
                "Estimated {} tokens (recommended < 5000)",
                token_estimate
            ),
            severity: "warning".into(),
        });
    }

    Ok(ValidationResult {
        valid: errors.is_empty(),
        errors,
        warnings,
    })
}

fn validate_fields(
    name: &str,
    desc: &str,
    dir_name: &str,
    body: &str,
    fm: &HashMap<String, serde_yaml::Value>,
) -> Result<ValidationResult, String> {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    validate_name(name, &mut errors);
    validate_description(desc, &mut errors, &mut warnings);

    // Name must match directory
    if !dir_name.is_empty() && !name.is_empty() && name != dir_name {
        errors.push(DiagnosticItem {
            field: "name".into(),
            message: format!(
                "Name '{}' must match parent directory name '{}'",
                name, dir_name
            ),
            severity: "error".into(),
        });
    }

    // Compatibility
    if let Some(compat) = fm.get("compatibility").and_then(|v| v.as_str()) {
        if compat.len() > 500 {
            errors.push(DiagnosticItem {
                field: "compatibility".into(),
                message: "Compatibility must be <= 500 characters".into(),
                severity: "error".into(),
            });
        }
    }

    // Body warnings
    let body_lines = body.lines().count();
    if body_lines > 500 {
        warnings.push(DiagnosticItem {
            field: "body".into(),
            message: format!("Body is {} lines (recommended < 500)", body_lines),
            severity: "warning".into(),
        });
    }

    let token_estimate = body.len() / 4;
    if token_estimate > 5000 {
        warnings.push(DiagnosticItem {
            field: "body".into(),
            message: format!(
                "Estimated {} tokens (recommended < 5000)",
                token_estimate
            ),
            severity: "warning".into(),
        });
    }

    Ok(ValidationResult {
        valid: errors.is_empty(),
        errors,
        warnings,
    })
}

fn validate_name(name: &str, errors: &mut Vec<DiagnosticItem>) {
    if name.is_empty() {
        errors.push(DiagnosticItem {
            field: "name".into(),
            message: "Name is required".into(),
            severity: "error".into(),
        });
        return;
    }

    if name.len() > 64 {
        errors.push(DiagnosticItem {
            field: "name".into(),
            message: "Name must be <= 64 characters".into(),
            severity: "error".into(),
        });
    }

    let name_re = Regex::new(r"^[a-z][a-z0-9]*(-[a-z0-9]+)*$").unwrap();
    if !name_re.is_match(name) {
        errors.push(DiagnosticItem {
            field: "name".into(),
            message: "Name must be lowercase alphanumeric with single hyphens".into(),
            severity: "error".into(),
        });
    }

    if name.contains("--") {
        errors.push(DiagnosticItem {
            field: "name".into(),
            message: "Name must not contain consecutive hyphens".into(),
            severity: "error".into(),
        });
    }
}

fn validate_description(desc: &str, errors: &mut Vec<DiagnosticItem>, warnings: &mut Vec<DiagnosticItem>) {
    if desc.is_empty() {
        errors.push(DiagnosticItem {
            field: "description".into(),
            message: "Description is required".into(),
            severity: "error".into(),
        });
        return;
    }

    if desc.len() > 1024 {
        errors.push(DiagnosticItem {
            field: "description".into(),
            message: "Description must be <= 1024 characters".into(),
            severity: "error".into(),
        });
    }

    if desc.len() < 20 {
        warnings.push(DiagnosticItem {
            field: "description".into(),
            message: "Description should be more descriptive (>= 20 chars)".into(),
            severity: "warning".into(),
        });
    }
}
