mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            // Skills
            commands::skills::list_skills,
            commands::skills::parse_skill_md,
            commands::skills::get_skills_directories,
            // Agents
            commands::agents::detect_agents,
            // Editor
            commands::editor::read_skill_md,
            commands::editor::save_skill_md,
            commands::editor::validate_skill,
            commands::editor::validate_skill_content,
            // CLI Bridge
            commands::cli_bridge::cli_add_skill,
            commands::cli_bridge::cli_remove_skill,
            commands::cli_bridge::cli_check_updates,
            commands::cli_bridge::cli_update_skills,
            commands::cli_bridge::cli_init_skill,
            commands::cli_bridge::cli_add_skill_stream,
            // Sandbox
            commands::sandbox::create_sandbox,
            commands::sandbox::run_sandbox_script,
            commands::sandbox::cleanup_sandbox,
            // Watcher
            commands::watcher::watch_skills_dir,
            commands::watcher::unwatch_skills_dir,
            // Settings
            commands::settings::get_settings,
            commands::settings::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
