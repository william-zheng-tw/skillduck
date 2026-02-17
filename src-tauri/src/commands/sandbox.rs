use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::Instant;
use tokio::process::Command as AsyncCommand;

#[derive(Debug, Serialize, Deserialize)]
pub struct SandboxInfo {
    pub path: String,
    pub temp_dir_handle: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScriptOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub duration_ms: u64,
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    if !dst.exists() {
        fs::create_dir_all(dst).map_err(|e| format!("Failed to create dir: {}", e))?;
    }

    for entry in fs::read_dir(src).map_err(|e| format!("Failed to read dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn create_sandbox(skill_path: String) -> Result<SandboxInfo, String> {
    let temp_dir =
        tempfile::tempdir().map_err(|e| format!("Failed to create temp dir: {}", e))?;

    let skill_file = Path::new(&skill_path);
    let skill_dir = if skill_file.is_file() {
        skill_file
            .parent()
            .ok_or("Cannot determine skill directory")?
    } else {
        skill_file
    };

    let skill_name = skill_dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "test-skill".to_string());

    let sandbox_skills_dir = temp_dir.path().join(".agent/skills").join(&skill_name);
    fs::create_dir_all(&sandbox_skills_dir)
        .map_err(|e| format!("Failed to create sandbox dir: {}", e))?;

    copy_dir_recursive(skill_dir, &sandbox_skills_dir)?;

    let sandbox_path = sandbox_skills_dir.to_string_lossy().to_string();
    let temp_path = temp_dir.keep().to_string_lossy().to_string();

    Ok(SandboxInfo {
        path: sandbox_path,
        temp_dir_handle: temp_path,
    })
}

#[tauri::command]
pub async fn run_sandbox_script(
    sandbox_path: String,
    script_name: String,
) -> Result<ScriptOutput, String> {
    let script_path = Path::new(&sandbox_path).join(&script_name);

    if !script_path.exists() {
        return Err(format!("Script not found: {}", script_path.display()));
    }

    let start = Instant::now();

    let output = AsyncCommand::new("sh")
        .arg("-c")
        .arg(format!("cd '{}' && '{}'", sandbox_path, script_path.display()))
        .env_clear()
        .env("HOME", dirs::home_dir().unwrap_or_default())
        .env(
            "PATH",
            "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        )
        .output()
        .await
        .map_err(|e| format!("Failed to execute script: {}", e))?;

    let duration = start.elapsed();

    Ok(ScriptOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
        duration_ms: duration.as_millis() as u64,
    })
}

#[tauri::command]
pub async fn cleanup_sandbox(temp_dir_handle: String) -> Result<(), String> {
    let path = Path::new(&temp_dir_handle);
    if path.exists() {
        fs::remove_dir_all(path)
            .map_err(|e| format!("Failed to cleanup sandbox: {}", e))?;
    }
    Ok(())
}
