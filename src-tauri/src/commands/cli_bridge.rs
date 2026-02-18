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
    // Try common npx locations
    if let Ok(output) = std::process::Command::new("which").arg("npx").output() {
        if output.status.success() {
            return String::from_utf8_lossy(&output.stdout).trim().to_string();
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

    // Inherit PATH so npx/node can be found
    if let Ok(path) = std::env::var("PATH") {
        cmd.env("PATH", path);
    }

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

    if let Ok(env_path) = std::env::var("PATH") {
        cmd.env("PATH", env_path);
    }

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
