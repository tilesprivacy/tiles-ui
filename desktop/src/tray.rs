//! the Linux tray. a menu can't hold the Mac's panel, so it carries the panel's
//! main switches, fed by the same daemon watcher

use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use gtk::gio;
use gtk::glib::ToVariant;
use tauri::menu::{CheckMenuItem, IsMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Listener, Manager, Wry};

use crate::menubar::daemon::{self, Health};
use crate::menubar::inference::{self, Power};
use crate::menubar::remote;
use crate::{login, window};

pub const ID: &str = "tiles";

const INHIBIT: &str = "systemd-inhibit";

struct Items {
    status: MenuItem<Wry>,
    model: MenuItem<Wry>,
    share: MenuItem<Wry>,
    ticket: MenuItem<Wry>,
}

/// the inhibitor while Keep Awake is on
#[derive(Default)]
struct Awake(Mutex<Option<Child>>);

/// `false` when there's no tray to show, the window is then the only way in
pub fn init(app: &AppHandle) -> bool {
    if !appindicator_loads() || !watcher_runs() {
        return false;
    }
    match build(app) {
        Ok(()) => true,
        Err(err) => {
            eprintln!("[tray] couldn't add the tray icon: {err}");
            false
        }
    }
}

fn build(app: &AppHandle) -> tauri::Result<()> {
    let items = Items {
        status: MenuItem::with_id(app, "status", "Starting Tiles…", false, None::<&str>)?,
        model: MenuItem::with_id(app, "model", "Start Model", false, None::<&str>)?,
        share: MenuItem::with_id(app, "share", "Share over Network", false, None::<&str>)?,
        ticket: MenuItem::with_id(app, "ticket", "Share Ticket…", false, None::<&str>)?,
    };
    let awake = can_inhibit()
        .then(|| CheckMenuItem::with_id(app, "awake", "Keep Awake", true, false, None::<&str>))
        .transpose()?;
    let open = MenuItem::with_id(app, "open", "Open Tiles", true, None::<&str>)?;
    let at_login = CheckMenuItem::with_id(
        app,
        "login",
        "Start at Login",
        true,
        login::enabled(app),
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", "Quit Tiles", true, None::<&str>)?;

    let first = PredefinedMenuItem::separator(app)?;
    let second = PredefinedMenuItem::separator(app)?;
    let third = PredefinedMenuItem::separator(app)?;
    let mut entries: Vec<&dyn IsMenuItem<Wry>> = vec![
        &items.status,
        &first,
        &items.model,
        &items.share,
        &items.ticket,
    ];
    if let Some(awake) = &awake {
        entries.push(awake);
    }
    entries.extend([
        &second as &dyn IsMenuItem<Wry>,
        &open,
        &at_login,
        &third,
        &quit,
    ]);
    let menu = Menu::with_items(app, &entries)?;

    app.manage(items);
    app.manage(Awake::default());

    TrayIconBuilder::with_id(ID)
        // the menu bar glyph without the app icon's tile, which shrinks it to a few pixels
        .icon(tauri::include_image!("icons/tray.png"))
        .tooltip("Tiles")
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "model" => toggle_model(app),
            "share" => toggle_share(app),
            "ticket" => show_ticket(app),
            "awake" => {
                if let Some(awake) = &awake {
                    let _ = awake.set_checked(toggle_awake(app));
                }
            }
            "open" => window::open(app),
            "login" => {
                let _ = at_login.set_checked(login::toggle(app));
            }
            // stops Tiles too, like the menu bar's Quit on a Mac
            "quit" => daemon::quit(app),
            _ => {}
        })
        .build(app)?;

    for event in [
        daemon::HEALTH_EVENT,
        inference::STATE_EVENT,
        remote::STATE_EVENT,
    ] {
        let app = app.clone();
        app.clone().listen_any(event, move |_| refresh(&app));
    }
    refresh(app);
    Ok(())
}

/// the menu from what the watcher last saw
fn refresh(app: &AppHandle) {
    let items = app.state::<Items>();
    let up = matches!(daemon::daemon_health(app.clone()), Health::Up { .. });
    let model = inference::inference_state(app.clone());
    let ticket = sharing(app);

    let _ = items.status.set_text(status(app, &model));
    // the label says what a click does, a checkmark only says what is
    let (label, enabled) = match model.power {
        Power::On => ("Stop Model", true),
        Power::Starting => ("Starting Model…", false),
        Power::Off => ("Start Model", up && model.model.is_some()),
        Power::Unknown => ("Start Model", false),
    };
    let _ = items.model.set_text(label);
    let _ = items.model.set_enabled(enabled);
    let _ = items.share.set_text(if ticket.is_some() {
        "Stop Sharing"
    } else {
        "Share over Network"
    });
    // only a running model can be shared, the panel's rule too
    let _ = items
        .share
        .set_enabled(up && (model.power == Power::On || ticket.is_some()));
    let _ = items.ticket.set_enabled(ticket.is_some());

    // a model going down takes the share with it, rather than leaving a dead ticket
    if model.power == Power::Off && ticket.is_some() {
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            let _ = remote::remote_set(app, false).await;
        });
    }
}

fn status(app: &AppHandle, model: &inference::State) -> String {
    match daemon::daemon_health(app.clone()) {
        Health::Down { .. } => "Tiles isn't running".to_owned(),
        Health::Starting => "Starting Tiles…".to_owned(),
        Health::Up { .. } => match (&model.model, model.power) {
            (None, _) => "No model picked".to_owned(),
            (Some(spec), Power::On) => format!("{} · running", model_name(spec)),
            (Some(spec), Power::Starting) => format!("{} · starting", model_name(spec)),
            (Some(spec), _) => format!("{} · stopped", model_name(spec)),
        },
    }
}

/// `unsloth/gemma-4-E4B-it-GGUF:Q4_K_M` reads as `gemma-4-E4B-it`, like the panel
fn model_name(spec: &str) -> &str {
    let base = spec.rsplit('/').next().unwrap_or(spec);
    let stem = base.split(':').next().unwrap_or(base);
    let lower = stem.to_ascii_lowercase();
    ["gguf", "mlx"]
        .into_iter()
        .find(|format| lower.ends_with(format))
        .map_or(stem, |format| {
            stem[..stem.len() - format.len()].trim_end_matches(['-', '_', '.'])
        })
}

fn sharing(app: &AppHandle) -> Option<String> {
    match remote::remote_state(app.clone()) {
        remote::State::Sharing { ticket } => Some(ticket),
        _ => None,
    }
}

fn toggle_model(app: &AppHandle) {
    let on = inference::inference_state(app.clone()).power != Power::On;
    let task = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(err) = inference::inference_set(task.clone(), on).await {
            eprintln!("[tray] couldn't switch the model: {err}");
        }
        refresh(&task);
    });
}

fn toggle_share(app: &AppHandle) {
    let on = sharing(app).is_none();
    let task = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(err) = remote::remote_set(task.clone(), on).await {
            eprintln!("[tray] couldn't change sharing: {err}");
        }
        refresh(&task);
    });
}

/// Wayland only lets an app set the clipboard after a click in its own window,
/// and a tray click lands in the shell, so the ticket gets a window with a Copy button
fn show_ticket(app: &AppHandle) {
    use gtk::prelude::*;

    let Some(ticket) = sharing(app) else {
        return;
    };
    let dialog = gtk::MessageDialog::new(
        None::<&gtk::Window>,
        gtk::DialogFlags::empty(),
        gtk::MessageType::Other,
        gtk::ButtonsType::None,
        "Your model is shared",
    );
    dialog.set_title("Tiles");
    dialog.set_secondary_text(Some(&format!(
        "Anyone with this ticket can use it:\n\n{ticket}"
    )));
    if let Ok(area) = dialog.message_area().downcast::<gtk::Box>() {
        for label in area
            .children()
            .into_iter()
            .filter_map(|child| child.downcast::<gtk::Label>().ok())
        {
            label.set_selectable(true);
        }
    }
    dialog.add_buttons(&[
        ("Close", gtk::ResponseType::Close),
        ("Copy", gtk::ResponseType::Accept),
    ]);
    dialog.set_default_response(gtk::ResponseType::Accept);
    dialog.connect_response(move |dialog, response| {
        if response == gtk::ResponseType::Accept {
            gtk::Clipboard::get(&gtk::gdk::SELECTION_CLIPBOARD).set_text(&ticket);
        }
        dialog.close();
    });
    dialog.present();
}

fn can_inhibit() -> bool {
    std::env::var_os("PATH").is_some_and(|path| {
        std::env::split_paths(&path).any(|dir| Path::new(&dir).join(INHIBIT).is_file())
    })
}

/// systemd-inhibit holds the lock while `cat` runs, and cat ends when its stdin
/// closes, so the lock never outlives the app. returns whether it's held now
fn toggle_awake(app: &AppHandle) -> bool {
    let awake = app.state::<Awake>();
    let mut held = awake.0.lock().expect("the awake lock is never poisoned");
    if let Some(mut child) = held.take() {
        drop(child.stdin.take());
        // waited on, so it doesn't stay a zombie
        std::thread::spawn(move || child.wait());
        return false;
    }
    let started = Command::new(INHIBIT)
        .args([
            "--what=sleep:idle",
            "--who=Tiles",
            "--why=Keeping your model reachable",
            "cat",
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .spawn();
    match started {
        Ok(child) => {
            *held = Some(child);
            true
        }
        Err(err) => {
            eprintln!("[tray] couldn't keep the computer awake: {err}");
            false
        }
    }
}

/// the names libappindicator-sys tries, it panics when none of them load
fn appindicator_loads() -> bool {
    [
        "libayatana-appindicator3.so.1",
        "libappindicator3.so.1",
        "libayatana-appindicator3.so",
        "libappindicator3.so",
    ]
    .into_iter()
    // SAFETY: the same libraries the tray loads right after, nothing runs from them here
    .any(|name| unsafe { libloading::Library::new(name) }.is_ok())
}

/// GNOME shows no tray icons without its AppIndicator extension, which runs this watcher
fn watcher_runs() -> bool {
    let Ok(bus) = gio::bus_get_sync(gio::BusType::Session, gio::Cancellable::NONE) else {
        return false;
    };
    bus.call_sync(
        Some("org.freedesktop.DBus"),
        "/org/freedesktop/DBus",
        "org.freedesktop.DBus",
        "NameHasOwner",
        Some(&("org.kde.StatusNotifierWatcher",).to_variant()),
        None,
        gio::DBusCallFlags::NONE,
        1000,
        gio::Cancellable::NONE,
    )
    .ok()
    .and_then(|reply| reply.get::<(bool,)>())
    .is_some_and(|(owned,)| owned)
}

#[cfg(test)]
mod tests {
    use super::model_name;

    #[test]
    fn model_names_lose_their_repo_quant_and_format() {
        assert_eq!(
            model_name("unsloth/gemma-4-E4B-it-GGUF:Q4_K_M"),
            "gemma-4-E4B-it"
        );
        assert_eq!(model_name("mlx-community/Qwen3-8B-mlx"), "Qwen3-8B");
        assert_eq!(model_name("local-model"), "local-model");
    }
}
