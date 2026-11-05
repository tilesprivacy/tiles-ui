//! the chat window, showing the UI bundled into the app

use std::sync::OnceLock;

use tauri::utils::config::Color;
use tauri::webview::NewWindowResponse;
use tauri::{AppHandle, Manager, Theme, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use crate::daemon;

const LABEL: &str = "chat";

const WIDTH: f64 = 1100.0;
const HEIGHT: f64 = 760.0;
/// under 768px the UI folds its sidebar into a phone layout
const MIN_WIDTH: f64 = 800.0;
const MIN_HEIGHT: f64 = 480.0;

/// the UI's --void, the window is never white before the page paints
const GROUND: Color = Color(0x11, 0x11, 0x11, 0xff);

static TEXT_SCALE: OnceLock<f64> = OnceLock::new();
static PROBLEM: OnceLock<String> = OnceLock::new();

/// on the main thread, where gtk can be asked. `problem` is why Tiles couldn't be started
pub fn init(problem: Option<String>) {
    TEXT_SCALE.get_or_init(text_scale);
    if let Some(problem) = problem {
        let _ = PROBLEM.set(problem);
    }
}

/// the window to the front, made if there's none
pub fn open(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    in_dock(app, true);
    if let Some(window) = app.get_webview_window(LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    match build(app) {
        #[cfg(target_os = "macos")]
        Ok(window) => {
            let app = app.clone();
            window.on_window_event(move |event| {
                if matches!(event, tauri::WindowEvent::Destroyed) {
                    in_dock(&app, false);
                }
            });
        }
        #[cfg(not(target_os = "macos"))]
        Ok(_) => {}
        Err(err) => eprintln!("[window] couldn't open the window: {err}"),
    }
}

/// a menu bar app, in the Dock only while the window is open. the switch has to
/// come before the window shows
#[cfg(target_os = "macos")]
fn in_dock(app: &AppHandle, shown: bool) {
    let policy = if shown {
        tauri::ActivationPolicy::Regular
    } else {
        tauri::ActivationPolicy::Accessory
    };
    if let Err(err) = app.set_activation_policy(policy) {
        eprintln!("[window] couldn't change the Dock icon: {err}");
    }
}

fn build(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let scale = TEXT_SCALE.get().copied().unwrap_or(1.0);
    WebviewWindowBuilder::new(app, LABEL, WebviewUrl::default())
        .title("Tiles")
        .inner_size(WIDTH * scale, HEIGHT * scale)
        .min_inner_size(MIN_WIDTH * scale, MIN_HEIGHT * scale)
        .theme(Some(Theme::Dark))
        .background_color(GROUND)
        .initialization_script(desktop_script())
        .on_navigation(|url| {
            let inside = is_inside(url);
            if !inside {
                open_outside(url);
            }
            inside
        })
        // a tab the UI asks for opens in the browser instead
        .on_new_window(|url, _| {
            if url.scheme() != "about" {
                open_outside(&url);
            }
            NewWindowResponse::Deny
        })
        .build()
}

/// tells the UI where the daemon is, see desktop.ts
fn desktop_script() -> String {
    let mut desktop = serde_json::json!({ "daemon": daemon::url() });
    if let Some(problem) = PROBLEM.get() {
        desktop["problem"] = problem.as_str().into();
    }
    format!("window.__TILES_DESKTOP__ = {desktop};")
}

/// the app's own pages. a dev build also has the vite server
fn is_inside(url: &Url) -> bool {
    url.scheme() == "tauri"
        || url.host_str() == Some("tauri.localhost")
        || (cfg!(debug_assertions) && url.host_str() == Some("localhost"))
}

fn open_outside(url: &Url) {
    let opener = if cfg!(target_os = "macos") {
        "open"
    } else {
        "xdg-open"
    };
    match std::process::Command::new(opener).arg(url.as_str()).spawn() {
        // waited on, so finished openers don't pile up as zombies
        Ok(mut child) => {
            std::thread::spawn(move || child.wait());
        }
        Err(err) => eprintln!("[window] couldn't open {url} with {opener}: {err}"),
    }
}

/// webkitgtk turns GNOME's text scaling into the page's pixel ratio, and the
/// window grows by the same factor to give the page the width it has on a Mac
#[cfg(target_os = "linux")]
fn text_scale() -> f64 {
    use gtk::prelude::GtkSettingsExt;

    gtk::Settings::default()
        .map(|settings| f64::from(settings.gtk_xft_dpi()) / 1024.0 / 96.0)
        .filter(|scale| *scale > 0.0)
        .unwrap_or(1.0)
}

#[cfg(not(target_os = "linux"))]
fn text_scale() -> f64 {
    1.0
}

/// webkitgtk's dmabuf renderer trips explicit sync on NVIDIA under Wayland and
/// the window stays blank. read by webkit at start, before any thread exists
#[cfg(target_os = "linux")]
pub fn avoid_dmabuf_on_nvidia() {
    const VAR: &str = "WEBKIT_DISABLE_DMABUF_RENDERER";
    let wayland = std::env::var_os("WAYLAND_DISPLAY").is_some();
    let nvidia = std::path::Path::new("/proc/driver/nvidia").exists();
    if wayland && nvidia && std::env::var_os(VAR).is_none() {
        // SAFETY: called first thing in main, no other thread reads the environment yet
        unsafe { std::env::set_var(VAR, "1") };
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_apps_own_pages_stay_in_the_window() {
        let inside = [
            "tauri://localhost/",
            "tauri://localhost/chat/1",
            "http://tauri.localhost/",
        ];
        let outside = [
            "https://bsky.social/oauth/authorize",
            "https://tiles.run/book",
            "http://127.0.0.1:1730/",
            "file:///etc/passwd",
            "http://tauri.localhost.example.com/",
        ];
        for url in inside {
            assert!(is_inside(&url.parse().unwrap()), "{url}");
        }
        for url in outside {
            assert!(!is_inside(&url.parse().unwrap()), "{url}");
        }
    }
}
