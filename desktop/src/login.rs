//! starting Tiles at login, with only the menu bar or tray icon

use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

/// what the login item passes, the app comes up without its window
pub const BACKGROUND: &str = "--background";

pub fn enabled(app: &AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

/// flips it and returns whether it's on now
pub fn toggle(app: &AppHandle) -> bool {
    let autolaunch = app.autolaunch();
    let result = if enabled(app) {
        autolaunch.disable()
    } else {
        autolaunch.enable()
    };
    if let Err(err) = result {
        eprintln!("[login] couldn't change start at login: {err}");
    }
    enabled(app)
}
