# AXON CRM: Sovereign Lead Management

AXON is a high-performance, local-first CRM built with Tauri, React, and PocketBase. It is designed to run entirely on your local machine ("Sovereign Mode") with zero external cloud dependencies.

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or later
- **Rust**: Latest stable version (via [rustup](https://rustup.rs/))
- **System Dependencies**:
  - **macOS**: None (standard Xcode tools recommended)
  - **Windows**: [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 10/11)

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd lolcal-crm
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```

## 🖥️ Platform Setup (Binaries)

AXON relies on sidecar binaries located in `src-tauri/binaries`. You MUST provide the correct binaries for your operating system and architecture.

### Binary Naming Convention
Binaries must follow the `[name]-[triple]` format.

| OS | Architecture | Triple |
| :--- | :--- | :--- |
| macOS (Intel) | x86_64 | `x86_64-apple-darwin` |
| macOS (M1/M2/M3) | ARM64 | `aarch64-apple-darwin` |
| Windows | x86_64 | `x86_64-pc-windows-msvc` |

### Required Sidecars
Place these in `src-tauri/binaries/`:
1. `pocketbase-[triple]` (e.g., `pocketbase-x86_64-pc-windows-msvc.exe`)
2. `llama-server-[triple]`
3. `whisper-stt-[triple]`

> [!TIP]
> You can download PocketBase from [pocketbase.io](https://pocketbase.io/docs/going-to-production/#self-hosting) and rename it to match your system.

## 🛠️ Development & Launch

### Quick Launch (macOS)
Use the included launcher to clear ghost processes and start the environment:
```bash
./Launch_AXON.command
```

### Standard Launch
```bash
npm run tauri dev
```

## 🏗️ Architecture: Sovereign Mode
- **Vault (PocketBase)**: Runs on `127.0.0.1:9081`. Data is persisted in the `AXON_VAULT` directory.
- **Brain (Llama)**: AI features run on `127.0.0.1:11435`.
- **Proxy**: All frontend requests are proxied through the Rust backend for security and localized path resolution.

## ❓ Troubleshooting

### Data not appearing?
Ensure the `AXON_VAULT` directory exists and has write permissions. Check the console for `403 Forbidden` errors; if they persist, run the schema migrations.

### Port 9081 Busy?
If you see a "Ghost instance detected" error, kill any hanging PocketBase processes:
- **macOS/Linux**: `lsof -ti:9081 | xargs kill -9`
- **Windows**: `taskkill /F /IM pocketbase.exe`

### CSV Import Failures
Make sure your CSV has a `firstName` (or `first_name`) and `email` column. The importer is case-insensitive and attempts to match various header formats.
