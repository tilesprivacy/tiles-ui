//! The About item in the Mac app menu, with the version of Tiles itself

use tauri::AppHandle;
use tauri::menu::{AboutMetadata, MenuItemKind, PredefinedMenuItem};

/// Puts the daemon's version in the About panel, where the app's own was
pub fn show(app: &AppHandle, version: &str) {
    // anything on the port answers the ping, only a version goes in the panel
    if !version.starts_with(|c: char| c.is_ascii_digit()) || version.contains(char::is_whitespace) {
        return;
    }
    if let Err(err) = replace(app, version) {
        eprintln!("[about] {err}");
    }
}

fn replace(app: &AppHandle, version: &str) -> tauri::Result<()> {
    // Tauri's default menu has the app's own menu first, with About on top
    let Some(MenuItemKind::Submenu(tiles)) = app
        .menu()
        .and_then(|menu| menu.items().ok()?.into_iter().next())
    else {
        return Ok(());
    };
    if !matches!(tiles.items()?.first(), Some(MenuItemKind::Predefined(_))) {
        return Ok(());
    }
    let about = PredefinedMenuItem::about(
        app,
        None,
        Some(AboutMetadata {
            name: Some(app.package_info().name.clone()),
            version: Some(version.to_owned()),
            // left out, macOS adds the app's build number in brackets
            short_version: Some(String::new()),
            copyright: app.config().bundle.copyright.clone(),
            ..Default::default()
        }),
    )?;
    tiles.remove_at(0)?;
    tiles.insert(&about, 0)
}
