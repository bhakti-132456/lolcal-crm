use rusqlite::{params, Connection, Result as SqlResult};
use std::path::Path;
use std::sync::Mutex;
use tauri::State;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Lead {
    pub id: Option<String>,
    pub name: String,
    pub email: String,
    pub company: String,
    pub status: String,
    pub created_at: Option<String>,
    pub metadata: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportLead {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub company: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub metadata: Option<String>,
}

pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
}

pub fn init_db() -> SqlResult<Connection> {
    let mut project_root = std::env::current_dir().unwrap_or_else(|_| Path::new(".").to_path_buf());
    if project_root.ends_with("src-tauri") { 
        project_root = project_root.parent().unwrap().to_path_buf(); 
    }
    
    // vault prep
    let db_path = project_root.join("core").join("axon_v1.db");
    // Later you can change this to:
    // let db_path = Path::new("/Volumes/AXON_VAULT/axon_v1.db");
    
    println!("Database path: {:?}", db_path);
    
    let conn = Connection::open(db_path)?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS leads (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            company TEXT,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    let _ = conn.execute("ALTER TABLE leads ADD COLUMN metadata TEXT", []);
    
    // Inject mock data if table is empty
    let count: i64 = conn.query_row("SELECT count(*) FROM leads", [], |row| row.get(0)).unwrap_or(0);
    if count == 0 {
        let mocks = vec![
            ("Alex Mercer", "alex.m@acmecorp.com", "Acme Corp", "Qualified"),
            ("Sarah Jenkins", "sarah@techflow.io", "TechFlow", "Contacted"),
            ("Marcus Chen", "m.chen@globaltrade.net", "Global Trade", "New"),
            ("Elena Rodriguez", "elena.r@innovatespace.io", "Innovate Space", "New"),
            ("David Kim", "dkim@futurefinance.org", "Future Finance", "Qualified"),
        ];
        
        for (name, email, company, status) in mocks {
            let id = uuid::Uuid::new_v4().to_string();
            let _ = conn.execute(
                "INSERT INTO leads (id, name, email, company, status) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, name, email, company, status],
            );
        }
    }
    
    Ok(conn)
}

#[tauri::command]
pub fn get_leads(state: State<'_, DbState>) -> Result<Vec<Lead>, String> {
    let conn_guard = state.conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    let mut stmt = conn.prepare("SELECT id, name, email, company, status, created_at, metadata FROM leads ORDER BY created_at DESC").map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(Lead {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            email: row.get(2).unwrap_or_default(),
            company: row.get(3).unwrap_or_default(),
            status: row.get(4).unwrap_or_default(),
            created_at: Some(row.get(5).unwrap_or_default()),
            metadata: row.get(6).unwrap_or_default(),
        })
    }).map_err(|e| e.to_string())?;
    
    let mut leads = Vec::new();
    for lead in rows {
        if let Ok(l) = lead {
            leads.push(l);
        }
    }
    
    Ok(leads)
}

#[tauri::command]
pub fn add_lead(state: State<'_, DbState>, name: String, email: String, company: String, status: String) -> Result<String, String> {
    let conn_guard = state.conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    let id = uuid::Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO leads (id, name, email, company, status) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, name, email, company, status],
    ).map_err(|e| e.to_string())?;
    
    Ok(id)
}

#[tauri::command]
pub fn update_lead(
    state: State<'_, DbState>, 
    id: String, 
    name: Option<String>,
    email: Option<String>,
    company: Option<String>, 
    status: Option<String>,
    metadata: Option<String>
) -> Result<(), String> {
    let conn_guard = state.conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    if let Some(ref n) = name {
        conn.execute("UPDATE leads SET name = ?1 WHERE id = ?2", params![n, id]).map_err(|e| e.to_string())?;
    }
    
    if let Some(ref e) = email {
        conn.execute("UPDATE leads SET email = ?1 WHERE id = ?2", params![e, id]).map_err(|e| e.to_string())?;
    }
    
    if let Some(ref c) = company {
        conn.execute("UPDATE leads SET company = ?1 WHERE id = ?2", params![c, id]).map_err(|e| e.to_string())?;
    }
    
    if let Some(ref s) = status {
         conn.execute("UPDATE leads SET status = ?1 WHERE id = ?2", params![s, id]).map_err(|e| e.to_string())?;
    }

    if let Some(ref m) = metadata {
         conn.execute("UPDATE leads SET metadata = ?1 WHERE id = ?2", params![m, id]).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn delete_lead(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn_guard = state.conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    conn.execute("DELETE FROM leads WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn import_csv_batch(state: State<'_, DbState>, leads: Vec<ImportLead>) -> Result<usize, String> {
    let mut conn_guard = state.conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Database not initialized")?;
    
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    let mut count = 0;
    for lead in leads {
        let id = uuid::Uuid::new_v4().to_string();
        let res = tx.execute(
            "INSERT INTO leads (id, name, email, company, status, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, lead.name, lead.email, lead.company, lead.status, lead.metadata],
        );
        if res.is_ok() { count += 1; }
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    
    Ok(count)
}
