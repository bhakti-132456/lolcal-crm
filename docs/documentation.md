# AXON CRM: Sovereign Powerhub Technical Documentation

## 1. Executive Summary
AXON CRM is a **Sovereign Powerhub** designed for local-first intelligence and data ownership. It operates as a self-contained ecosystem within a single project directory, eliminating dependencies on external cloud services or volume mounts.

## 2. Technology Stack
- **Core Engine**: Tauri v2 (Rust-based security and sidecar management).
- **Frontend Framework**: React 19.
- **Styling Engine**: Tailwind CSS v4 (Modern, performance-first utility CSS).
- **Data Orchestration**: TanStack Query (Synchronization and caching).
- **Backend Components**: SQLite (Sovereign Database) and Llama-server (AI) running as localized sidecars.

## 3. Architecture Overview
The system follows a "Sovereign Proxy" architecture. The Rust backend acts as the secure gateway for all operations, managing the local SQLite connection and the lifecycle of background sidecar processes.

### Key Network Mapping
| Component | Port | Description |
|-----------|------|-------------|
| **AXON UI** | `1420` | The main React interface running in Tauri. |
| **Sovereign Vault** | `N/A` | Local SQLite database (`axon_v1.db`). |
| **Sovereign Brain** | `11435` | Llama-server managing local LLM inference. |

---

## 4. The Sovereign Vault (Database)
The database is powered by **SQLite**, managed directly by the Rust core for maximum performance and zero configuration.

- **Storage Strategy**: All data is stored in `axon_v1.db` within the project root.
- **Initialization**: On startup, the system initializes the database and ensures the schema is ready.
- **Lead Intelligence Schema**:
  - `name`, `email`, `company`, `status`, `created_at`
- **Mock Data**: Automated injection of mock data if the vault is empty for immediate exploration.

---

## 5. The Sovereign Brain (AI)
Local intelligence is provided by a **Llama-server** sidecar, which starts automatically on app launch.

- **Model Management**: Models are stored in `src-tauri/models/` in GGUF format.
- **Default Models**: 
  - `Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf`
  - `sarvam-1.Q4_K_M.gguf` (Default on launch)
- **Dynamic Switching**: The `switch_brain` command allows hot-swapping models during runtime.
- **Real-time Monitoring**: The Brain's status is visible in the UI header, toggling between "Active", "Ollama Ready" (fallback), and "Offline".

---

## 6. Security & Connectivity
### Process Maintenance
The system implements a **Nuclear Force Purge** logic via the launcher:
- Before launch, it terminates any existing `llama-server` and `axon` processes to prevent zombie locks.
- It cleans up temporary Vite caches and macOS metadata junk to ensure a stable runtime.

---

## 7. Reliability (The Launcher)
The **Launch_AXON.command** script is the primary entry point for maintenance and operation.
1. **Aggressive Purge**: Kills all relevant PIDs and names.
2. **Auto-Backup**: Detects any existing `pb_data` or `AXON_VAULT` folders and moves them to `vault_backups/` with a timestamp before creating a fresh instance if requested.
3. **Build Redirection**: Redirects all build artifacts to `/Users/apple/.tauri-axon-build` to keep the project folder clean and portable.

## 8. Development & Build
- **Dev Mode**: `npm run tauri dev`
- **Build Mode**: `npm run tauri build`
- **Redirection**: Build output is managed via the `TAURI_BIN_DIR` environment variable.

---
*Documentation Version: 1.2 (Ghostbuster Update)*
