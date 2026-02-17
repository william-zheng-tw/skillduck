use notify::{recommended_watcher, Event, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::Emitter;

type WatcherMap = Arc<Mutex<HashMap<String, notify::RecommendedWatcher>>>;

lazy_static::lazy_static! {
    static ref WATCHERS: WatcherMap = Arc::new(Mutex::new(HashMap::new()));
}

#[tauri::command]
pub fn watch_skills_dir(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let watch_path = PathBuf::from(&path);
    if !watch_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let app_handle = app.clone();
    let mut watcher = recommended_watcher(move |res: Result<Event, notify::Error>| {
        if let Ok(event) = res {
            for path in &event.paths {
                if path.file_name().map(|n| n == "SKILL.md").unwrap_or(false) {
                    let _ = app_handle.emit("skill-changed", path.to_string_lossy().to_string());
                }
            }
        }
    })
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(&watch_path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch {}: {}", path, e))?;

    let mut watchers = WATCHERS.lock().map_err(|e| e.to_string())?;
    watchers.insert(path, watcher);

    Ok(())
}

#[tauri::command]
pub fn unwatch_skills_dir(path: String) -> Result<(), String> {
    let mut watchers = WATCHERS.lock().map_err(|e| e.to_string())?;
    watchers.remove(&path);
    Ok(())
}
