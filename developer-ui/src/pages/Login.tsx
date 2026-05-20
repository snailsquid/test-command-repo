import { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../App";
import { apiFetch } from "../lib/api";

type LoginStep = "username" | "waiting" | "expired";

export default function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [step, setStep] = useState<LoginStep>("username");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [waUrl, setWaUrl] = useState("");
  const [phone, setPhone] = useState("");
  const { login } = useContext(AuthContext)!;
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/developer/auth/init", {
        method: "POST",
        body: JSON.stringify({ username }),
      });

      if (data.error) {
        setError(data.error);
        return;
      }

      setAuthToken(data.token);
      setWaUrl(data.waUrl);
      setPhone(data.phone);
      setStep("waiting");
      startPolling(data.token);
    } catch (err: any) {
      setError(err.message || "Failed to initiate login");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (token: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const data = await apiFetch(`/developer/auth/status?token=${encodeURIComponent(token)}`);

        if (data.status === "complete" && data.sessionToken) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          login(data.sessionToken);
          onLogin(data.sessionToken);
        } else if (data.status === "expired") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStep("expired");
        }
        // "pending" — keep polling
      } catch {
        // Network error — keep polling
      }
    }, 2000);
  };

  const handleRetry = () => {
    setStep("username");
    setAuthToken("");
    setWaUrl("");
    setPhone("");
    setError("");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo">🛠️</div>
        <h1>Developer Dashboard</h1>
        <p className="subtitle">Register and manage your WhatsApp commands</p>

        {error && <div className="error-message">{error}</div>}

        {step === "username" && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={loading}>
              {loading ? "Connecting..." : "Login with WhatsApp"}
            </button>
          </form>
        )}

        {step === "waiting" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
              <h2 style={{ margin: 0 }}>Waiting for WhatsApp confirmation</h2>
              <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
                Send the login message from WhatsApp to confirm your identity.
              </p>
            </div>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{
                display: "inline-block",
                textDecoration: "none",
                marginBottom: "1.5rem",
                padding: "0.75rem 1.5rem",
              }}
            >
              Open WhatsApp
            </a>

            <div style={{
              background: "#f3f4f6",
              borderRadius: "8px",
              padding: "1rem",
              marginTop: "1rem",
              textAlign: "left",
            }}>
              <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", color: "#6b7280" }}>
                Can't open the link? Send this message to {phone} on WhatsApp:
              </p>
              <code style={{
                display: "block",
                padding: "0.5rem",
                background: "#fff",
                borderRadius: "4px",
                fontSize: "0.85rem",
                wordBreak: "break-all",
                userSelect: "all",
              }}>
                .login {authToken}
              </code>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                Token expires in 10 minutes. This page will update automatically.
              </p>
            </div>
          </div>
        )}

        {step === "expired" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏰</div>
            <h2 style={{ margin: 0 }}>Token expired</h2>
            <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
              Your login token has expired. Please generate a new one.
            </p>
            <button className="btn btn-secondary" onClick={handleRetry} style={{ marginTop: "1rem" }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}