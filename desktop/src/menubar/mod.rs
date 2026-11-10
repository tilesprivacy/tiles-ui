//! The Mac menu bar: the status item, its panel and keeping the Mac awake. The
//! daemon watcher and what it reports run on Linux too, for the tray

#[cfg(target_os = "macos")]
mod about;
#[cfg_attr(
    target_os = "linux",
    expect(dead_code, reason = "only the Mac panel reads it")
)]
pub mod account;
#[cfg_attr(
    target_os = "linux",
    expect(dead_code, reason = "only the Mac panel reads it")
)]
pub mod atproto;
#[cfg(target_os = "macos")]
pub mod awake;
#[cfg(target_os = "macos")]
pub mod clipboard;
pub mod daemon;
pub mod inference;
#[cfg(target_os = "macos")]
mod lid;
#[cfg(target_os = "macos")]
pub mod panel;
#[cfg(target_os = "macos")]
pub mod paths;
#[cfg(target_os = "macos")]
mod quit;
pub mod remote;
#[cfg_attr(
    target_os = "linux",
    expect(dead_code, reason = "only the Mac panel reads it")
)]
pub mod sessions;
#[cfg(target_os = "macos")]
mod tray;

use tauri::AppHandle;
#[cfg(target_os = "macos")]
use tauri::{Manager, WindowEvent};

pub fn init(app: &AppHandle) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    {
        panel::init(app)?;
        tray::init(app)?;
    }
    // before the watcher, its first tick already reports all three
    inference::init(app);
    account::init(app);
    atproto::init(app);
    sessions::init(app);
    remote::init(app);
    #[cfg(target_os = "macos")]
    awake::init(app);
    daemon::init(app);

    #[cfg(target_os = "macos")]
    panel::warm_up(app);
    Ok(())
}

/// has to stay a WindowEvent, nspanel's set_event_handler replaces Tauri's
/// NSWindowDelegate instead of chaining and kills this
#[cfg(target_os = "macos")]
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
#[cfg(target_os = "macos")]
pub fn ready(app: &AppHandle) {
    quit::init(app);
}

/// a daemon quit ends here
#[cfg(target_os = "macos")]
pub fn exit(app: &AppHandle) {
    awake::shutdown(app);
}
