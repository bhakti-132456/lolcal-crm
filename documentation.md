# AXON CRM: Sovereign Powerhub Technical Documentation

## 1. Executive Summary
AXON CRM is a **Sovereign Powerhub** designed for local-first intelligence and data ownership. It operates as a self-contained ecosystem within a single project directory, eliminating dependencies on external cloud services or volume mounts.

## 2. Technology Stack
- **Core Engine**: Tauri v2 (Rust-based security and sidecar management).
- **Frontend Framework**: React 19.
- **Styling Engine**: Tailwind CSS v4 (Modern, performance-first utility CSS).
- **Data Orchestration**: TanStack Query (Synchronization and caching).
- **Backend Components**: PocketBase (Database) and Llama-server (AI) running as localized sidecars.

## 3. Architecture Overview
The system follows a "Sovereign Proxy" architecture. The Rust backend acts as the secure gateway (Proxy) for all operations, bypassing browser CORS restrictions and managing the lifecycle of background sidecar processes.

### Key Network Mapping
| Component | Port | Description |
|-----------|------|-------------|
| **AXON UI** | `1420` | The main React interface running in Tauri. |
| **Sovereign Vault** | `9081` | PocketBase instance managing persistence. |
| **Sovereign Brain** | `11435` | Llama-server managing local LLM inference. |

---

## 4. The Sovereign Vault (Database)
The database is powered by **PocketBase**, localized to ensure data sovereignty.

- **Storage Strategy**: All data is stored in the `AXON_VAULT` directory within the project root.
- **Initialization**: On startup, the system verifies the vault path and runs automated migrations.
- **Lead Intelligence Schema**:
  - `firstName`, `lastName`, `email`, `phone`, `jobTitle`
  - `linkedin` (URL/Handle)
  - `location` (Physical location)
  - `industry` (Sector intelligence)
  - `status` (New, Contacted, Qualified, Lost)
- **Migration Logic**: Found in `pb_migrations/`. The initial schema defines these fields with "Public" (null) API rules for local Sovereign access.
- **Pathing**: Strictly absolute pathing derived from the project root.

---

## 5. The Sovereign Brain (AI)
Local intelligence is provided by a **Llama-server** sidecar.

- **Model Management**: Models are stored in `src-tauri/models/` in GGUF format.
- **Default Models**: 
  - `Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf`
  - `sarvam-1.Q4_K_M.gguf`
- **Dynamic Switching**: The `switch_brain` command in `lib.rs` kills existing instances and hot-swaps the model by restarting the sidecar.
- **Real-time Monitoring**: Async stdout/stderr listeners pipe AI logs directly to the user's terminal for advanced debugging.

---

## 6. Security & Connectivity
### The Rust Proxy (`proxy_vault`)
To ensure security and bypass browser limitations (CORS), **ALL** frontend-to-sidecar communication (GET, POST, PATCH) is proxied through Rust:
- `invoke("proxy_vault", { path: "...", method: "...", body: ... })`
- This ensures that lead creation and imports work reliably regardless of browser security policies.

### Port & Process Maintenance
The system implements a **Nuclear Force Purge** logic:
- Before launch, the system wipes ports `1420`, `8091`, `9081`, and `11435`.
- It explicitly terminates `pocketbase`, `llama-server`, and `axon` processes by name to prevent zombie locks on the database.

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
