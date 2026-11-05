//! The Tiles desktop app, the UI in a window of its own, with the menu bar on a
//! Mac and a tray on Linux. It starts the daemon the UI talks to, and Quit stops it

mod daemon;
mod login;
mod menubar;
#[cfg(target_os = "linux")]
mod tray;
mod window;

fn main() {
    #[cfg(target_os = "linux")]
    window::avoid_dmabuf_on_nvidia();

    let builder = tauri::Builder::default()
        // has to be registered first, so a second copy exits before it opens a window
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            window::open(app);
        }))
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .arg(login::BACKGROUND)
                .build(),
        );

    #[cfg(target_os = "macos")]
    let builder = builder
        .plugin(tauri_nspanel::init())
        .invoke_handler(tauri::generate_handler![
            menubar::panel::hide_panel,
            menubar::panel::panel_ready,
            menubar::panel::resize_panel,
            menubar::panel::quit_app,
            menubar::paths::data_dir,
            menubar::paths::reveal_path,
            menubar::clipboard::copy_text,
            menubar::daemon::daemon_health,
            menubar::inference::inference_state,
            menubar::inference::inference_set,
            menubar::account::account_state,
            menubar::atproto::atproto_state,
            menubar::atproto::atproto_login,
            menubar::sessions::sessions_state,
            menubar::remote::remote_state,
            menubar::remote::remote_set,
            menubar::awake::awake_state,
            menubar::awake::awake_start,
            menubar::awake::awake_stop,
            menubar::awake::awake_pause,
            menubar::awake::awake_resume
        ])
        .on_window_event(menubar::on_window_event);

    builder
        .setup(|app| {
            // LSUIElement covers the launch, until the window asks for the Dock
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let problem = daemon::start().err();
            if let Some(problem) = &problem {
                eprintln!("[daemon] {problem}");
            }
            window::init(problem);
            menubar::init(app.handle())?;
            #[cfg(target_os = "macos")]
            let icon = true;
            #[cfg(target_os = "linux")]
            let icon = tray::init(app.handle());
            // at login only the icon comes up, when there is one to come back through
            let background = std::env::args().any(|arg| arg == login::BACKGROUND);
            if !(background && icon) {
                window::open(app.handle());
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to start the Tiles app")
        .run(|app, event| {
            #[cfg(target_os = "linux")]
            if let tauri::RunEvent::ExitRequested {
                code: None, api, ..
            } = event
                // the tray keeps it running with the window closed
                && app.tray_by_id(tray::ID).is_some()
            {
                api.prevent_exit();
            }
            #[cfg(target_os = "macos")]
            match event {
                // the menu bar keeps running with the window closed
                tauri::RunEvent::ExitRequested {
                    code: None, api, ..
                } => api.prevent_exit(),
                // the Dock icon, or opening Tiles.app while it runs
                tauri::RunEvent::Reopen { .. } => window::open(app),
                tauri::RunEvent::Ready => menubar::ready(app),
                // the menu bar's Quit ends here
                tauri::RunEvent::Exit => menubar::exit(app),
                _ => {}
            }
        });
}
