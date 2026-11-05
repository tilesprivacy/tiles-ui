//! The Mac menu bar: the status item, its panel and keeping the Mac awake

pub mod account;
pub mod atproto;
pub mod awake;
pub mod clipboard;
pub mod daemon;
pub mod inference;
mod lid;
pub mod panel;
pub mod paths;
mod quit;
pub mod remote;
pub mod sessions;
mod tray;

use tauri::{AppHandle, Manager, WindowEvent};

pub fn init(app: &AppHandle) -> tauri::Result<()> {
    panel::init(app)?;
    tray::init(app)?;
    // before the watcher, its first tick already reports all three
    inference::init(app);
    account::init(app);
    atproto::init(app);
    sessions::init(app);
    remote::init(app);
    awake::init(app);
    daemon::init(app);

    panel::warm_up(app);
    Ok(())
}

/// has to stay a WindowEvent, nspanel's set_event_handler replaces Tauri's
/// NSWindowDelegate instead of chaining and kills this
pub fn on_window_event(window: &tauri::Window, event: &WindowEvent) {
    if matches!(event, WindowEvent::Focused(false)) && window.label() == panel::LABEL {
        let app = window.app_handle();
        let mode = if tray::pointer_over_item(app) {
            panel::Dismiss::Fade
        } else {
            panel::Dismiss::Instant
        };
        panel::dismiss(app, mode);
    }
}

/// the delegate only exists once the event loop is up
pub fn ready(app: &AppHandle) {
    quit::init(app);
}

/// a daemon quit ends here
pub fn exit(app: &AppHandle) {
    awake::shutdown(app);
}
