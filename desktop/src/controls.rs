//! controls for the Linux window's panel, see Controls.svelte

use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::{Mutex, MutexGuard};

use serde::Serialize;
use tauri::{AppHandle, Listener, Manager};

use crate::login;
use crate::menubar::inference::{self, Power};
use crate::menubar::{daemon, remote};

const INHIBIT: &str = "systemd-inhibit";

// systemd-inhibit process for Keep Awake
#[derive(Default)]
struct Awake(Mutex<Option<Child>>);

#[derive(Serialize)]
pub struct Controls {
    // None if systemd-inhibit is missing
    awake: Option<bool>,
    login: bool,
}

pub fn init(app: &AppHandle) {
    app.manage(Awake::default());
    for event in [inference::STATE_EVENT, remote::STATE_EVENT] {
        let app = app.clone();
        app.clone().listen_any(event, move |_| end_dead_share(&app));
    }
}

// stop sharing once the model is off
fn end_dead_share(app: &AppHandle) {
    let off = inference::inference_state(app.clone()).power == Power::Off;
    let sharing = matches!(
        remote::remote_state(app.clone()),
        remote::State::Sharing { .. }
    );
    if off && sharing {
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            let _ = remote::remote_set(app, false).await;
        });
    }
}

#[tauri::command]
pub fn controls(app: AppHandle) -> Controls {
    Controls {
        awake: can_inhibit().then(|| held(&app).is_some()),
        login: login::enabled(&app),
    }
}

// returns the new state
#[tauri::command]
pub fn keep_awake(app: AppHandle, on: bool) -> bool {
    let mut held = held(&app);
    if !on {
        if let Some(mut child) = held.take() {
            drop(child.stdin.take());
            // collect the finished child
            std::thread::spawn(move || child.wait());
        }
        return false;
    }
    if held.is_none() {
        match inhibit() {
            Ok(child) => *held = Some(child),
            Err(err) => eprintln!("[controls] couldn't keep the computer awake: {err}"),
        }
    }
    held.is_some()
}

// returns the new state
#[tauri::command]
pub fn start_at_login(app: AppHandle, on: bool) -> bool {
    if login::enabled(&app) == on {
        return on;
    }
    login::toggle(&app)
}

// stops the daemon too
#[tauri::command]
pub fn quit_app(app: AppHandle) {
    daemon::quit(&app);
}

fn held(app: &AppHandle) -> MutexGuard<'_, Option<Child>> {
    app.state::<Awake>()
        .inner()
        .0
        .lock()
        .expect("the awake lock is never poisoned")
}

fn can_inhibit() -> bool {
    std::env::var_os("PATH").is_some_and(|path| {
        std::env::split_paths(&path).any(|dir| Path::new(&dir).join(INHIBIT).is_file())
    })
}

// the lock is held until cat's stdin closes
fn inhibit() -> std::io::Result<Child> {
    Command::new(INHIBIT)
        .args([
            "--what=sleep:idle",
            "--who=Tiles",
            "--why=Keeping your model reachable",
            "cat",
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .spawn()
}
