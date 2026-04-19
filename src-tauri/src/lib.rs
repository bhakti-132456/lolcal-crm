use tauri_plugin_shell::ShellExt;
use std::path::Path;
use tauri::Emitter;
use std::sync::Mutex;

mod db;

struct AppState {
    llama_child: Mutex<Option<tauri_plugin_shell::process::CommandChild>>,
}

#[tauri::command]
fn get_vault_status() -> String {
    let mut root = std::env::current_dir().unwrap_or_else(|_| Path::new(".").to_path_buf());
    if root.ends_with("src-tauri") { root = root.parent().unwrap().to_path_buf(); }
    
    if root.join("axon_v1.db").exists() {
        "Sovereign".to_string()
    } else {
        "Initializing".to_string()
    }
}

#[tauri::command]
async fn ping_vault() -> Result<String, String> {
    Ok("Active".to_string())
}

#[tauri::command]
async fn switch_brain(app: tauri::AppHandle, state: tauri::State<'_, AppState>, model_name: String) -> Result<String, String> {
    let mut child_lock = state.llama_child.lock().unwrap();
    if let Some(child) = child_lock.take() { let _ = child.kill(); }
    
    let model_file = match model_name.as_str() {
        "sarvam" => "sarvam-1.Q4_K_M.gguf",
        "llama3" => "Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf",
        _ => "sarvam-1.Q4_K_M.gguf",
    };
    
    // Project root logic for models
    let mut project_root = std::env::current_dir().unwrap_or_else(|_| Path::new(".").to_path_buf());
    if project_root.ends_with("src-tauri") { project_root = project_root.parent().unwrap().to_path_buf(); }
    
    let model_path = project_root.join("src-tauri").join("models").join(model_file);
    
    println!("AXON: Brain Model Path: {}", model_path.to_string_lossy());
    
    let sidecar_command = app.shell().sidecar("llama-server").map_err(|e| e.to_string())?
        .args(["-m", &model_path.to_string_lossy(), "--port", "11435", "-ctx", "4096"]);
    
    let (mut rx, child) = sidecar_command.spawn().map_err(|e| e.to_string())?;
    
    // Async logger for Llama stdout/stderr
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(line) => println!("LLAMA STDOUT: {}", String::from_utf8_lossy(&line).trim()),
                tauri_plugin_shell::process::CommandEvent::Stderr(line) => eprintln!("LLAMA ERROR: {}", String::from_utf8_lossy(&line).trim()),
                _ => {}
            }
        }
    });

    *child_lock = Some(child);
    Ok(format!("Brain switched to {}", model_name))
}

#[tauri::command]
async fn get_brain_status() -> Result<String, String> {
    let url = "http://127.0.0.1:11435/health";
    let client = reqwest::Client::new();
    match client.get(url).send().await {
        Ok(res) if res.status().is_success() => Ok("Active".to_string()),
        _ => {
            // Check Ollama as well
            let ollama_url = "http://127.0.0.1:11434/api/tags";
            match client.get(ollama_url).send().await {
                Ok(res) if res.status().is_success() => Ok("Ollama Ready".to_string()),
                _ => Ok("Offline".to_string())
            }
        }
    }
}

#[tauri::command]
async fn process_whisper() -> Result<String, String> { Ok("Processed".to_string()) }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState { 
            llama_child: Mutex::new(None),
        })
        .manage(db::DbState {
            conn: Mutex::new(Some(db::init_db().expect("Failed to init SQLite"))),
        })
        .setup(|app| {
            let app_handle = app.handle();
            let loop_handle = app_handle.clone();
            
            // SQLite is local and ready immediately
            tauri::async_runtime::spawn(async move {
                println!("AXON: Vault is READY and HEALTHY.");
                // sleep a bit to ensure frontend has time to mount and listen
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                loop_handle.emit("vault-ready", ()).ok();
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_vault_status, 
            process_whisper, 
            switch_brain, 
            ping_vault, 
            get_brain_status,
            db::get_leads,
            db::add_lead,
            db::update_lead,
            db::import_csv_batch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
