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

/// traffic lights, centred in the title bar the UI draws
#[cfg(target_os = "macos")]
const LIGHTS_AT: (f64, f64) = (14.0, 22.5);
/// width the UI leaves for them
#[cfg(target_os = "macos")]
const LIGHTS_WIDTH: u32 = 84;

static TEXT_SCALE: OnceLock<f64> = OnceLock::new();
static PROBLEM: OnceLock<String> = OnceLock::new();
#[cfg(target_os = "linux")]
static TITLEBAR: OnceLock<serde_json::Value> = OnceLock::new();

/// on the main thread, where gtk can be asked. `problem` is why Tiles couldn't be started
pub fn init(problem: Option<String>) {
    TEXT_SCALE.get_or_init(text_scale);
    #[cfg(target_os = "linux")]
    TITLEBAR.get_or_init(titlebar);
    if let Some(problem) = problem {
        let _ = PROBLEM.set(problem);
    }
}

/// the window to the front, made if there's none
pub fn open(app: &AppHandle) {
    show(app, None);
}

/// the window on one of the UI's pages, like `/chat/<id>`
#[cfg(target_os = "macos")]
pub fn open_at(app: &AppHandle, path: &str) {
    show(app, Some(path));
}

fn show(app: &AppHandle, path: Option<&str>) {
    #[cfg(target_os = "macos")]
    in_dock(app, true);
    if let Some(window) = app.get_webview_window(LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        // the layout routes it without a reload, see `tiles:open` in +layout.svelte
        if let Some(path) = path {
            let path = serde_json::to_string(path).expect("a string always serializes");
            let _ = window.eval(format!(
                "window.dispatchEvent(new CustomEvent('tiles:open', {{ detail: {path} }}))"
            ));
        }
        return;
    }
    // the app's pages fall back to index.html, which routes to the path
    let url = path.map_or_else(WebviewUrl::default, |path| {
        WebviewUrl::App(path.trim_start_matches('/').into())
    });
    match build(app, url) {
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

fn build(app: &AppHandle, url: WebviewUrl) -> tauri::Result<WebviewWindow> {
    let scale = TEXT_SCALE.get().copied().unwrap_or(1.0);
    let window = WebviewWindowBuilder::new(app, LABEL, url)
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
        });
    // the UI draws the title bar, see Titlebar.svelte
    #[cfg(target_os = "linux")]
    let window = window.decorations(false);
    #[cfg(target_os = "macos")]
    let window = window
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true)
        .traffic_light_position(tauri::LogicalPosition::new(LIGHTS_AT.0, LIGHTS_AT.1));
    window.build()
}

/// tells the UI where the daemon is, see desktop.ts
fn desktop_script() -> String {
    let mut desktop = serde_json::json!({ "daemon": daemon::url() });
    if let Some(problem) = PROBLEM.get() {
        desktop["problem"] = problem.as_str().into();
    }
    #[cfg(target_os = "linux")]
    if let Some(titlebar) = TITLEBAR.get() {
        desktop["titlebar"] = titlebar.clone();
    }
    #[cfg(target_os = "macos")]
    {
        desktop["titlebar"] =
            serde_json::json!({ "left": [], "right": [], "lights": LIGHTS_WIDTH });
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

/// the window buttons where the desktop puts them, from gtk's `gtk-decoration-layout`
#[cfg(target_os = "linux")]
fn titlebar() -> serde_json::Value {
    use gtk::prelude::GtkSettingsExt;

    let layout = gtk::Settings::default()
        .and_then(|settings| settings.gtk_decoration_layout())
        .map_or_else(
            || ":minimize,maximize,close".to_owned(),
            |layout| layout.to_string(),
        );
    buttons(&layout)
}

/// `icon:minimize,maximize,close` is left of the colon and right of it, a layout
/// without one is all left. names the UI doesn't draw, like icon or menu, are dropped
#[cfg(target_os = "linux")]
fn buttons(layout: &str) -> serde_json::Value {
    let (left, right) = layout.split_once(':').unwrap_or((layout, ""));
    let side = |names: &str| -> Vec<String> {
        names
            .split(',')
            .map(str::trim)
            .filter(|name| matches!(*name, "minimize" | "maximize" | "close"))
            .map(str::to_owned)
            .collect()
    };
    serde_json::json!({ "left": side(left), "right": side(right) })
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

    #[cfg(target_os = "linux")]
    #[test]
    fn window_buttons_follow_the_desktop() {
        let sides = |layout| {
            let buttons = buttons(layout);
            (buttons["left"].clone(), buttons["right"].clone())
        };
        assert_eq!(
            sides("icon:minimize,maximize,close"),
            (
                serde_json::json!([]),
                serde_json::json!(["minimize", "maximize", "close"])
            )
        );
        assert_eq!(
            sides("appmenu:close"),
            (serde_json::json!([]), serde_json::json!(["close"]))
        );
        assert_eq!(
            sides("close,minimize:"),
            (
                serde_json::json!(["close", "minimize"]),
                serde_json::json!([])
            )
        );
        assert_eq!(
            sides("close"),
            (serde_json::json!(["close"]), serde_json::json!([]))
        );
    }
}
