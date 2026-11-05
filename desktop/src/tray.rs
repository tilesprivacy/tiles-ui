//! the Linux tray, a plain menu where the Mac has its panel

use gtk::gio;
use gtk::glib::ToVariant;
use tauri::AppHandle;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;

use crate::{daemon, login, window};

pub const ID: &str = "tiles";

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
    let menu = Menu::with_items(
        app,
        &[
            &open,
            &at_login,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    TrayIconBuilder::with_id(ID)
        // the menu bar glyph without the app icon's tile, which shrinks it to a few pixels
        .icon(tauri::include_image!("icons/tray.png"))
        .tooltip("Tiles")
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "open" => window::open(app),
            "login" => {
                let _ = at_login.set_checked(login::toggle(app));
            }
            "quit" => {
                // stops Tiles too, like the menu bar's Quit on a Mac
                let app = app.clone();
                std::thread::spawn(move || {
                    daemon::stop();
                    app.exit(0);
                });
            }
            _ => {}
        })
        .build(app)?;
    Ok(())
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
