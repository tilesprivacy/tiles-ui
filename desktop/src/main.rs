//! The Tiles desktop app, the UI in a window of its own. It starts the daemon
//! the UI talks to, and leaves it running when it quits

mod daemon;
mod window;

fn main() {
    #[cfg(target_os = "linux")]
    window::avoid_dmabuf_on_nvidia();

    tauri::Builder::default()
        // has to be registered first, so a second copy exits before it opens a window
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            window::open(app);
        }))
        .setup(|app| {
            let problem = daemon::start().err();
            if let Some(problem) = &problem {
                eprintln!("[daemon] {problem}");
            }
            window::init(problem);
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
                // a Mac app stays in the Dock with its window closed
                tauri::RunEvent::ExitRequested {
                    code: None, api, ..
                } => api.prevent_exit(),
                // the Dock icon, or opening Tiles.app while it runs
                tauri::RunEvent::Reopen { .. } => window::open(app),
                _ => {}
            }
        });
}
