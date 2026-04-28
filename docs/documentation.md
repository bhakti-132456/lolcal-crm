# AXON CRM: Sovereign Powerhub Technical Documentation

## 1. Executive Summary
AXON CRM is a **Sovereign Powerhub** designed for local-first intelligence and data ownership. It operates as a self-contained ecosystem within a single project directory, eliminating dependencies on external cloud services. It combines high-performance Rust backends with a fluid React frontend to provide a premium lead management experience.

## 2. Technology Stack
- **Core Engine**: Tauri v2 (Rust-based security and sidecar management).
- **Frontend Framework**: React 19.
- **Styling Engine**: Tailwind CSS v4 + Lucide Icons.
- **Data Orchestration**: TanStack Query (Synchronization and caching).
- **Backend Components**: SQLite (Sovereign Database) and Llama-server (AI) running as localized sidecars.
- **Utilities**: PapaParse (CSV processing), TanStack Virtual (Grid performance).

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
The database is powered by **SQLite**, managed directly by the Rust core (`src-tauri/src/db.rs`).

- **Storage Strategy**: All data is stored in `core/axon_v1.db`.
- **Initialization**: On startup, `init_db()` ensures the `leads` table exists and the `metadata` column is present.
- **Lead Intelligence Schema**:
  - `id`: UUID (Primary Key)
  - `name`: Full name (Required)
  - `email`: Contact email
  - `company`: Company name or professional context
  - `status`: Lifecycle stage (New, Contacted, Qualified, Lost)
  - `created_at`: Automatic timestamp
  - `metadata`: JSON blob for unstructured intelligence (Custom fields, AI notes)

---

## 5. Lead Management & Grid Features
The `LeadGrid` component is the heart of the application, designed for high-density data management.

### Key Features:
- **Virtualization**: Uses `tanstack/react-virtual` to handle thousands of records without UI lag.
- **Fuzzy Search**: Real-time filtering by name, email, or company.
- **Advanced Filtering**: Sidebar-accessible filters for Status, Company, and Date ranges (Last 7d, 30d, 90d).
- **Bulk Actions**: Select multiple records to perform mass stage updates or deletions.
- **AI Enrichment**: One-click "Sparkle" button to generate professional summaries and sectors for leads using the Sovereign Brain.

---

## 6. CSV Ingestion Intelligence
The CSV import system is designed to be "smart" and resilient.

### How it Works:
1. **Header Normalization**: Automatically trims and lowercases headers to match columns like `First Name`, `Last Name`, `Full Name`, `Email Address`, etc.
2. **Inclusive Requirements**: Requires at least a **Name** or an **Email** to create a record.
3. **Duplicate Resolution**: 
   - Detects duplicates by matching Email (case-insensitive) or Name.
   - **Merge Logic**: If a duplicate is found, the system prompts for a merge. It updates missing fields and merges the new CSV data into the `metadata` JSON blob without losing existing information.
4. **Metadata Preservation**: All non-standard columns in the CSV are automatically ingested into the `metadata` field, ensuring no data is lost during import.

---

## 7. The Sovereign Brain (AI Integration)
Local intelligence is provided by a **Llama-server** sidecar.

- **Model Management**: GGUF models are stored in `src-tauri/models/`.
- **Enrichment Logic**: The `enrichLead` function sends lead context to the Brain, which returns a JSON summary. This summary is then injected into the lead's `metadata`.
- **Sales Assistant**: The `RecordPanel` features an AI Assistant that generates conversation transcripts and call notes tailored to the lead's current stage.

---

## 8. Development & Maintenance
### Process Control
The system implements a **Nuclear Force Purge** logic via `Launch_AXON.command`:
- Terminates existing `llama-server` and `axon` processes.
- Cleans Vite and macOS metadata caches.
- Automates backups of the Vault.

### Codebase Structure
- `src/components/`: React UI components (LeadGrid, RecordPanel, Overview).
- `src/lib/`: Frontend logic (DB wrappers, AI prompt engineering).
- `src-tauri/src/`: Rust backend logic (Database handlers, Tauri commands).
- `core/`: Persistent storage for the SQLite Vault.

---
*Documentation Version: 1.3 (Sovereign Ingestion Update)*
*Last Updated: April 28, 2026*
