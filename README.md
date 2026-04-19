# AXON CRM: Sovereign Lead Management

AXON is a high-performance, local-first CRM built with Tauri, React, and PocketBase. It is designed to run entirely on your local machine ("Sovereign Mode") with zero external cloud dependencies.

## 🚀 Getting Started

### 1. System Requirements

#### 🍎 macOS (Intel & Apple Silicon)
- **Xcode Command Line Tools**: Run `xcode-select --install` in your terminal.
- **Homebrew**: Recommended for managing dependencies. [brew.sh](https://brew.sh/)
- **Node.js**: v18+ (Install via `brew install node`)
- **Rust**:
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

#### 🪟 Windows
- **Microsoft C++ Build Tools**: [Download here](https://visualstudio.microsoft.com/visual-cpp-build-tools/). Select the "Desktop development with C++" workload during installation.
- **WebView2**: Standard on Win 10/11. If missing, [download here](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
- **Node.js**: v18+ (Use the MSI installer from [nodejs.org](https://nodejs.org/))
- **Rust**: [Download and run rustup-init.exe](https://rustup.rs/)

### 2. Sidecar Binary Setup (CRITICAL)

AXON uses external binaries (sidecars) for the database and AI features. You must place the correct versions in `src-tauri/binaries/`.

#### Identifying your Target Triple
Run this command in your terminal to find your system's "triple":
```bash
rustc -vV | grep host | cut -d ' ' -f 2
```

Common triples:
- **Newer Macs (M1/M2/M3)**: `aarch64-apple-darwin`
- **Intel Macs**: `x86_64-apple-darwin`
- **Windows (standard)**: `x86_64-pc-windows-msvc`

#### Required Files
Download/build and rename these files to include your triple:
1. `pocketbase-[triple]` (e.g. `pocketbase-aarch64-apple-darwin`)
2. `llama-server-[triple]`
3. `whisper-stt-[triple]`

*Note: On Windows, ensure these files have the `.exe` extension AFTER the triple (e.g. `pocketbase-x86_64-pc-windows-msvc.exe`).*

### 3. Installation & Development

1. **Clone & Install**:
   ```bash
   git clone https://github.com/bhakti-132456/lolcal-crm.git
   cd lolcal-crm
   npm install
   ```

2. **Run in Development**:
   ```bash
   npm run tauri dev
   ```

3. **Production Build**:
   ```bash
   npm run tauri build
   ```

## 🖥️ Platform Tips

### macOS Quick Launch
We've included a script to handle ghost processes automatically:
```bash
chmod +x Launch_AXON.command
./Launch_AXON.command
```

### Windows Troubleshooting
- If you see `Error: Could not find "pocketbase-..."`, double-check that the file in `src-tauri/binaries/` exactly matches your `rustc -vV` host triple.
- Ensure the `AXON_VAULT` folder has read/write permissions.

## 🏗️ Architecture: Sovereign Mode
- **Vault (PocketBase)**: Port `9081`. Local database storage.
- **Brain (Llama/Whisper)**: Port `11435`. Local AI inference.
- **Frontend**: Vite + React, communicatng via Tauri commands to the Rust core.

## ❓ FAQ

### Port 9081 Busy?
If a ghost instance is detected:
- **macOS**: `lsof -ti:9081 | xargs kill -9`
- **Windows**: `taskkill /F /IM pocketbase.exe`

