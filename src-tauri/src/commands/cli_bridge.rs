use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as AsyncCommand;

#[derive(Debug, Serialize, Deserialize)]
pub struct CliOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

fn find_npx() -> String {
    let home = std::env::var("HOME").unwrap_or_default();

    // 1. Check common fixed paths
    let fixed_candidates = [
        "/opt/homebrew/bin/npx",
        "/usr/local/bin/npx",
    ];
    for candidate in &fixed_candidates {
        if std::path::Path::new(candidate).exists() {
            return candidate.to_string();
        }
    }

    // 2. Scan ~/.nvm/versions/node/*/bin/npx — pick the latest version
    if !home.is_empty() {
        let nvm_versions = std::path::Path::new(&home).join(".nvm/versions/node");
        if nvm_versions.exists() {
            if let Ok(entries) = std::fs::read_dir(&nvm_versions) {
                let mut versions: Vec<_> = entries.filter_map(|e| e.ok()).collect();
                // Sort descending so we try the newest version first
                versions.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
                for entry in versions {
                    let npx = entry.path().join("bin/npx");
                    if npx.exists() {
                        return npx.to_string_lossy().to_string();
                    }
                }
            }
        }
    }

    // 3. Scan ~/.fnm/node-versions/*/installation/bin/npx
    if !home.is_empty() {
        let fnm_versions = std::path::Path::new(&home).join(".fnm/node-versions");
        if fnm_versions.exists() {
            if let Ok(entries) = std::fs::read_dir(&fnm_versions) {
                let mut versions: Vec<_> = entries.filter_map(|e| e.ok()).collect();
                versions.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
                for entry in versions {
                    let npx = entry.path().join("installation/bin/npx");
                    if npx.exists() {
                        return npx.to_string_lossy().to_string();
                    }
                }
            }
        }
    }

    // 4. Try `which` with extended PATH
    let mut extended_path = std::env::var("PATH").unwrap_or_default();
    for extra in &["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"] {
        if !extended_path.split(':').any(|p| p == *extra) {
            extended_path = format!("{}:{}", extended_path, extra);
        }
    }
    if let Ok(output) = std::process::Command::new("which")
        .arg("npx")
        .env("PATH", &extended_path)
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return path;
            }
        }
    }

    // 5. Try login shells (zsh first for macOS, then sh)
    for shell in &["zsh", "bash", "sh"] {
        if let Ok(output) = std::process::Command::new(shell)
            .args(["-lc", "which npx 2>/dev/null || command -v npx 2>/dev/null"])
            .output()
        {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                // Take only the first line in case of shell startup messages
                if let Some(first_line) = path.lines().find(|l| l.contains("/npx")) {
                    return first_line.to_string();
                }
            }
        }
    }

    "npx".to_string()
}

async fn run_skills_command(args: Vec<String>, cwd: Option<String>) -> Result<CliOutput, String> {
    let npx = find_npx();

    let mut cmd = AsyncCommand::new(&npx);
    cmd.arg("skills");
    for arg in &args {
        cmd.arg(arg);
    }
    cmd.arg("-y"); // non-interactive

    if let Some(ref dir) = cwd {
        if !dir.is_empty() {
            cmd.current_dir(dir);
        }
    }

    // Build a rich PATH so node can be found by npx even in packaged app environments.
    // Include the directory of the resolved npx binary so node is available alongside it.
    let mut path_val = std::env::var("PATH").unwrap_or_default();
    let npx_dir = std::path::Path::new(&npx).parent().map(|p| p.to_string_lossy().to_string());
    let extras: &[&str] = &["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
    for extra in extras {
        if !path_val.split(':').any(|p| p == *extra) {
            path_val = format!("{}:{}", path_val, extra);
        }
    }
    if let Some(dir) = npx_dir {
        if !path_val.split(':').any(|p| p == dir) {
            path_val = format!("{}:{}", dir, path_val);
        }
    }
    cmd.env("PATH", path_val);

    let output = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to execute CLI: {}", e))?;

    Ok(CliOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

#[tauri::command]
pub async fn cli_add_skill(
    source: String,
    agents: Vec<String>,
    skills: Vec<String>,
    global: bool,
    list_only: bool,
    all: bool,
    project_path: Option<String>,
) -> Result<CliOutput, String> {
    let mut args = vec!["add".to_string(), source];

    for agent in &agents {
        args.push("-a".to_string());
        args.push(agent.clone());
    }
    for skill in &skills {
        args.push("-s".to_string());
        args.push(skill.clone());
    }
    if global {
        args.push("-g".to_string());
    }
    if list_only {
        args.push("--list".to_string());
    }
    if all {
        args.push("--all".to_string());
    }

    // For project scope, run CLI in the specified project directory
    let cwd = if !global { project_path } else { None };
    run_skills_command(args, cwd).await
}

#[tauri::command]
pub async fn cli_remove_skill(
    skill_names: Vec<String>,
    agents: Vec<String>,
    global: bool,
    project_path: Option<String>,
) -> Result<CliOutput, String> {
    let mut args = vec!["remove".to_string()];
    args.extend(skill_names);

    for agent in &agents {
        args.push("-a".to_string());
        args.push(agent.clone());
    }
    if global {
        args.push("-g".to_string());
    }

    let cwd = if !global { project_path } else { None };
    run_skills_command(args, cwd).await
}

#[tauri::command]
pub async fn cli_check_updates() -> Result<CliOutput, String> {
    run_skills_command(vec!["check".to_string()], None).await
}

#[tauri::command]
pub async fn cli_update_skills() -> Result<CliOutput, String> {
    run_skills_command(vec!["update".to_string()], None).await
}

#[tauri::command]
pub async fn cli_update_skill(skill_name: String) -> Result<CliOutput, String> {
    run_skills_command(vec!["update".to_string(), skill_name], None).await
}

#[tauri::command]
pub async fn cli_init_skill(name: String, path: String) -> Result<CliOutput, String> {
    let npx = find_npx();

    let mut cmd = AsyncCommand::new(&npx);
    cmd.arg("skills").arg("init").arg(&name);
    cmd.current_dir(&path);

    let mut env_path = std::env::var("PATH").unwrap_or_default();
    for extra in &["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"] {
        if !env_path.split(':').any(|p| p == *extra) {
            env_path = format!("{}:{}", env_path, extra);
        }
    }
    cmd.env("PATH", env_path);

    let output = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to execute CLI: {}", e))?;

    Ok(CliOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

#[tauri::command]
pub async fn cli_add_skill_stream(
    app: tauri::AppHandle,
    source: String,
) -> Result<(), String> {
    let npx = find_npx();

    let mut child = AsyncCommand::new(&npx)
        .args(["skills", "add", &source, "-y"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn: {}", e))?;

    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app.emit("cli-output", &line);
        }
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;
    let _ = app.emit(
        "cli-output",
        &format!("Process exited with code {}", status.code().unwrap_or(-1)),
    );

    Ok(())
}
