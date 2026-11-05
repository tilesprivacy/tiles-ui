//! The Tiles desktop app, the UI in a window of its own and on a Mac the menu
//! bar. It starts the daemon the UI talks to, and the menu bar's Quit stops it

mod daemon;
#[cfg(target_os = "macos")]
mod menubar;
mod window;

fn main() {
    #[cfg(target_os = "linux")]
    window::avoid_dmabuf_on_nvidia();

    let builder = tauri::Builder::default()
        // has to be registered first, so a second copy exits before it opens a window
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            window::open(app);
        }));

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
            #[cfg(target_os = "macos")]
            menubar::init(app.handle())?;
            window::open(app.handle());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to start the Tiles app")
        .run(|app, event| {
            #[cfg(not(target_os = "macos"))]
            let _ = (app, event);
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
