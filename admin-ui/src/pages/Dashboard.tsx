import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../App";
import { apiFetch } from "../lib/api";
import Sidebar from "../components/Sidebar";
import SessionList from "../components/SessionList";
import AddSessionForm from "../components/AddSessionForm";

export default function DashboardPage() {
  const { token, logout } = useContext(AuthContext)!;
  const [contacts, setContacts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contactsData, sessionsData] = await Promise.all([
        apiFetch("/admin/contacts"),
        apiFetch("/admin/sessions"),
      ]);
      setContacts(contactsData.contacts || []);
      setSessions(sessionsData.sessions || []);
      setError("");
    } catch (err: any) {
      if (err.message === "Unauthorized") {
        logout();
        navigate("/login");
      } else {
        setError(err.message || "Failed to fetch data");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddSession = async (data: { name: string; phoneNumber: string; wahaSessionId: string }) => {
    try {
      const newContact = await apiFetch("/admin/contacts", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setContacts((prev) => [...prev, newContact.contact]);
      setShowAddForm(false);
    } catch (err: any) {
      throw new Error(err.message || "Failed to add session");
    }
  };

  const handleDeleteSession = async (contactId: number) => {
    if (typeof window !== "undefined" && !window.confirm("Are you sure you want to remove this session?")) return;
    try {
      await apiFetch(`/admin/contacts/${contactId}`, { method: "DELETE" });
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (err: any) {
      alert(err.message || "Failed to delete session");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getSessionHealth = (sessionId: string) => {
    const session = sessions.find((s) => s.sessionId === sessionId);
    return session?.isHealthy ? "connected" : "disconnected";
  };

  return (
    <div className="app-container">
      <Sidebar
        items={[{ label: "Dashboard", href: "/dashboard", active: true }]}
        onLogout={handleLogout}
        username="Admin"
      />
      <main className="main-content">
        <div className="page-header">
          <h1>WhatsApp Sessions</h1>
          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              ➕ Add Session
            </button>
            <button className="btn btn-ghost" onClick={fetchData} disabled={loading}>
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{contacts.length}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {contacts.filter((c) => getSessionHealth(c.wahaSessionId) === "connected").length}
            </div>
            <div className="stat-label">Connected</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {contacts.filter((c) => getSessionHealth(c.wahaSessionId) !== "connected").length}
            </div>
            <div className="stat-label">Disconnected</div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {showAddForm && (
          <div style={{ marginBottom: "1.5rem" }}>
            <AddSessionForm
              onSubmit={handleAddSession}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        <div className="card">
          <h2>Contacts & Sessions</h2>
          {loading ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: "2rem" }}>
              Loading sessions...
            </p>
          ) : contacts.length === 0 ? (
            <div className="empty-state">
              <p>No sessions configured yet</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddForm(true)}
                style={{ marginTop: "1rem" }}
              >
                ➕ Add First Session
              </button>
            </div>
          ) : (
            <SessionList
              contacts={contacts}
              sessions={sessions}
              onDelete={handleDeleteSession}
            />
          )}
        </div>
      </main>
    </div>
  );
}