use serde::Serialize;

#[cfg(desktop)]
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize)]
struct GreetResponse {
    message_key: String,
    name: String,
    source: String,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> GreetResponse {
    GreetResponse {
        message_key: "successGreeting".to_string(),
        name: name.to_string(),
        source: "Tauri".to_string(),
    }
}

#[cfg(desktop)]
fn check_for_updates(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        match app.updater() {
            Ok(updater) => match updater.check().await {
                Ok(Some(update)) => {
                    if let Err(error) = update.download_and_install(|_, _| {}, || {}).await {
                        eprintln!("failed to install update: {error}");
                        return;
                    }

                    app.restart();
                }
                Ok(None) => {}
                Err(error) => eprintln!("failed to check for updates: {error}"),
            },
            Err(error) => eprintln!("failed to initialize updater: {error}"),
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                check_for_updates(app.handle().clone());
            }

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
