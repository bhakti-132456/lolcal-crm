import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

// ROBUST ERROR BOUNDARY: Catch React lifetime crashes
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("AXON CRITICAL BOOT ERROR:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#ff4444', fontFamily: 'monospace', background: '#000', height: '100vh' }}>
          <h1 style={{ borderBottom: '2px solid #ff4444', paddingBottom: '10px' }}>AXON: BOOT SEQUENCE FAILURE</h1>
          <p style={{ color: '#fff', marginTop: '20px' }}>The CRM core failed to initialize during render. This is likely a missing import or logic bug.</p>
          <pre style={{ background: '#111', padding: '20px', borderRadius: '8px', overflow: 'auto', border: '1px solid #333' }}>
            {this.state.error?.stack || String(this.state.error)}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', background: '#ff4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px' }}>
            FORCE RELOAD CORE
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");

if (rootElement) {
  console.log("AXON_CORE: Mounting React Tree...");
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
