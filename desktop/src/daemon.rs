//! starting the Tiles daemon, which the UI talks to

use std::env;
use std::path::PathBuf;
use std::process::{Command, Stdio};

const PORT: u16 = 1729;

const NOT_INSTALLED: &str =
    "Tiles isn't installed. Install it from https://tiles.run, then open this app again.";

/// where the UI finds the daemon. `TILES_DAEMON` points a dev build at another one
pub fn url() -> String {
    if cfg!(debug_assertions)
        && let Ok(url) = env::var("TILES_DAEMON")
    {
        return url;
    }
    format!("http://127.0.0.1:{PORT}")
}

/// Starts the daemon in the background, `Err` says why it can't.
/// A dev build only starts the one `TILES_BIN` names, the dev daemon is started by hand
pub fn start() -> Result<(), String> {
    if cfg!(debug_assertions) && env::var_os("TILES_BIN").is_none() {
        return Ok(());
    }
    let tiles = tiles().ok_or(NOT_INSTALLED)?;
    // a daemon already up on this version answers right away
    let mut child = Command::new(&tiles)
        .args(["daemon", "start"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .spawn()
        .map_err(|err| format!("Couldn't start Tiles with {}: {err}", tiles.display()))?;
    // waited on, so it doesn't stay a zombie
    std::thread::spawn(move || child.wait());
    Ok(())
}

/// Stops the daemon and waits for it, for the tray's Quit
#[cfg(target_os = "linux")]
pub fn stop() {
    if cfg!(debug_assertions) && env::var_os("TILES_BIN").is_none() {
        return;
    }
    let Some(tiles) = tiles() else {
        return;
    };
    let stopped = Command::new(&tiles)
        .args(["daemon", "stop"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .status();
    if let Err(err) = stopped {
        eprintln!(
            "[daemon] couldn't stop Tiles with {}: {err}",
            tiles.display()
        );
    }
}

/// the `tiles` CLI. a Mac app gets no shell PATH, the install folders come first
fn tiles() -> Option<PathBuf> {
    if let Some(bin) = env::var_os("TILES_BIN") {
        return Some(PathBuf::from(bin));
    }
    let installed = [
        env::var_os("HOME").map(|home| PathBuf::from(home).join(".local/bin/tiles")),
        Some(PathBuf::from("/usr/local/bin/tiles")),
    ];
    let on_path: Vec<PathBuf> = env::var_os("PATH")
        .map(|path| {
            env::split_paths(&path)
                .map(|dir| dir.join("tiles"))
                .collect()
        })
        .unwrap_or_default();
    installed
        .into_iter()
        .flatten()
        .chain(on_path)
        .find(|path| path.is_file())
}
