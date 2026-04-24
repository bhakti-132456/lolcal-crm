use tauri_plugin_shell::ShellExt;
use std::path::Path;
use tauri::Emitter;
use std::sync::Mutex;
use tauri::Manager;

mod db;

struct AppState {
    llama_child: Mutex<Option<tauri_plugin_shell::process::CommandChild>>,
}

fn spawn_brain_internal(app: &tauri::AppHandle, state: &tauri::State<'_, AppState>, model_name: &str) -> Result<String, String> {
    let mut child_lock = state.llama_child.lock().unwrap();
    if let Some(child) = child_lock.take() { let _ = child.kill(); }
    
    let model_file = match model_name {
        "sarvam" => "sarvam-1.Q4_K_M.gguf",
        "llama3" => "Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf",
        _ => "sarvam-1.Q4_K_M.gguf",
    };
    
    // Project root logic for models
    let mut project_root = std::env::current_dir().unwrap_or_else(|_| Path::new(".").to_path_buf());
    if project_root.ends_with("src-tauri") { project_root = project_root.parent().unwrap().to_path_buf(); }
    
    let model_path = project_root.join("src-tauri").join("models").join(model_file);
    
    println!("AXON: Spawning Brain with model: {}", model_path.to_string_lossy());
    
    if !model_path.exists() {
        return Err(format!("Model file not found: {:?}", model_path));
    }

    let sidecar_command = app.shell().sidecar("llama-server").map_err(|e| e.to_string())?
        .args(["-m", &model_path.to_string_lossy(), "--port", "11435", "-c", "4096"]);
    
    let (mut rx, child) = sidecar_command.spawn().map_err(|e| e.to_string())?;
    
    // Async logger for Llama stdout/stderr
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(line) => println!("LLAMA: {}", String::from_utf8_lossy(&line).trim()),
                tauri_plugin_shell::process::CommandEvent::Stderr(line) => println!("LLAMA: {}", String::from_utf8_lossy(&line).trim()),
                _ => {}
            }
        }
    });

    *child_lock = Some(child);
    Ok(format!("Brain switched to {}", model_name))
}

#[tauri::command]
fn get_vault_status() -> String {
    let mut root = std::env::current_dir().unwrap_or_else(|_| Path::new(".").to_path_buf());
    if root.ends_with("src-tauri") { root = root.parent().unwrap().to_path_buf(); }
    
    if root.join("core").join("axon_v1.db").exists() {
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
    spawn_brain_internal(&app, &state, &model_name)
}

#[tauri::command]
async fn get_brain_status() -> Result<String, String> {
    let url = "http://127.0.0.1:11435/health";
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(500))
        .build()
        .unwrap_or_default();

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
async fn proxy_brain(prompt: String) -> Result<String, String> {
    println!("AXON: SENDING PROMPT TO ENGINE:\n---\n{}\n---", prompt);
    let url = "http://127.0.0.1:11435/completion";
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .unwrap_or_default();

    let body = serde_json::json!({
        "prompt": prompt,
        "n_predict": 1024,
        "temperature": 0.2,
        "repeat_penalty": 1.25,
        "repeat_last_n": 256,
        "top_p": 0.9,
        "stop": ["<|eot_id|>", "<|start_header_id|>", "###", "</s>", "</thought>"]
    });

    match client.post(url).json(&body).send().await {
        Ok(res) => {
            let status = res.status();
            let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
            println!("AXON: Brain Response Status: {}", status);
            
            if let Some(content) = data["content"].as_str() {
                if content.is_empty() {
                    println!("AXON: Brain returned EMPTY content.");
                    Ok("The brain is awake but decided to stay silent. Try rephrasing your request.".to_string())
                } else {
                    println!("AXON: Brain Response Success ({} chars)", content.len());
                    Ok(content.to_string())
                }
            } else {
                println!("AXON ERROR: Brain response missing 'content' field. Full JSON: {:?}", data);
                Err("Brain responded with an invalid data format.".to_string())
            }
        },
        Err(e) => {
            eprintln!("AXON ERROR: AI Proxy Connection Failed: {}", e);
            Err(format!("AI Core Connection Error: {}", e))
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
            let app_handle = app.handle().clone();
            
            // Auto-start AI Brain (Sarvam)
            let setup_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let state: tauri::State<AppState> = setup_handle.state();
                println!("AXON: Waking up AI Brain...");
                if let Err(e) = spawn_brain_internal(&setup_handle, &state, "sarvam") {
                    eprintln!("AXON ERROR: Failed to start AI Brain: {}", e);
                }
            });

            // SQLite is local and ready immediately
            let loop_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                println!("AXON: Vault is READY and HEALTHY.");
                // sleep a bit to ensure frontend has time to mount and listen
                tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
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
            proxy_brain,
            db::get_leads,
            db::add_lead,
            db::update_lead,
            db::delete_lead,
            db::import_csv_batch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
