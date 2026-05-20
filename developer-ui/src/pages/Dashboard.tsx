import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../App";
import { apiFetch } from "../lib/api";
import Sidebar from "../components/Sidebar";

interface Repository {
  repoUrl: string;
  commands: any[];
  manifestVersion: string | null;
}

export default function DashboardPage() {
  const { token, logout } = useContext(AuthContext)!;
  const [repos, setRepos] = useState<Repository[]>([]);
  const [activeTab, setActiveTab] = useState("repos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [addingRepo, setAddingRepo] = useState(false);
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
      const reposData = await apiFetch("/developer/repos");
      setRepos(reposData.repos || []);
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoUrl.trim()) return;

    setAddingRepo(true);
    try {
      await apiFetch("/developer/repos", {
        method: "POST",
        body: JSON.stringify({ repoUrl: newRepoUrl.trim(), skipValidation: true }),
      });
      setNewRepoUrl("");
      setActiveTab("repos");
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to add repository");
    } finally {
      setAddingRepo(false);
    }
  };

  const handleRefreshRepo = async (repoUrl: string) => {
    try {
      await apiFetch(`/developer/repos/${encodeURIComponent(repoUrl)}/refresh`, {
        method: "POST",
        body: JSON.stringify({ skipValidation: true }),
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to refresh repository");
    }
  };

  const handleDeleteRepo = async (repoUrl: string) => {
    if (!confirm(`Delete all commands from "${repoUrl}"?`)) return;

    try {
      await apiFetch(`/developer/repos/${encodeURIComponent(repoUrl)}`, {
        method: "DELETE",
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to delete repository");
    }
  };

  // Extract repository name from URL
  const getRepoName = (repoUrl: string) => {
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    return match ? match[1] : repoUrl;
  };

  return (
    <div className="app-container">
      <Sidebar
        items={[
          { label: "Commands", active: activeTab === "repos", onClick: () => setActiveTab("repos") },
        ]}
        onLogout={handleLogout}
        username="Developer"
      />
      <main className="main-content">
        <div className="page-header">
          <h1>Developer Dashboard</h1>
          <div className="actions">
            <button
              className="btn btn-secondary"
              onClick={() => setActiveTab("add-repo")}
            >
              ➕ Register WhatsApp Command
            </button>
            <button className="btn btn-ghost" onClick={() => {
              setActiveTab("repos");
              fetchData();
            }} disabled={loading}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <p style={{ color: "#9ca3af", textAlign: "center", padding: "2rem" }}>
            Loading...
          </p>
        ) : (
          <>
            {activeTab === "add-repo" && (
              <div className="card" style={{ maxWidth: "500px", margin: "0 auto" }}>
                <h2 style={{ marginBottom: "1rem" }}>Register WhatsApp Command</h2>
                <form onSubmit={handleAddRepo}>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                      Repository URL
                    </label>
                    <input
                      type="text"
                      value={newRepoUrl}
                      onChange={(e) => setNewRepoUrl(e.target.value)}
                      placeholder="https://github.com/username/repo"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "1rem",
                      }}
                      required
                    />
                    <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      The repository must contain an <code>akka.yaml</code> file with command definitions. All metadata (slug, name, description, usage) is read from the manifest.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="submit" className="btn btn-primary" disabled={addingRepo}>
                      {addingRepo ? "Registering..." : "Register Command"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setActiveTab("repos");
                        setNewRepoUrl("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "repos" && (
              <div>
                {repos.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                    <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
                      No commands registered yet.
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setActiveTab("add-repo")}
                    >
                      ➕ Register Your First Command
                    </button>
                  </div>
                ) : (
                  repos.map((repo) => (
                    <div key={repo.repoUrl} className="card" style={{ marginBottom: "1.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <div>
                          <h3 style={{ margin: 0 }}>{getRepoName(repo.repoUrl)}</h3>
                          <code style={{ fontSize: "0.8rem", color: "#6b7280" }}>{repo.repoUrl}</code>
                          {repo.manifestVersion && (
                            <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#9ca3af" }}>
                              v{repo.manifestVersion}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleRefreshRepo(repo.repoUrl)}
                          >
                            🔄 Refresh
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDeleteRepo(repo.repoUrl)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      {repo.commands.length === 0 ? (
                        <p style={{ color: "#9ca3af" }}>No commands in this repository.</p>
                      ) : (
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Slug</th>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {repo.commands.map((cmd: any) => (
                                <tr key={cmd.id}>
                                  <td>
                                    <code style={{ fontSize: "0.8rem", background: "#f3f4f6", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                                      {cmd.slug}
                                    </code>
                                  </td>
                                  <td style={{ fontWeight: 500 }}>{cmd.name}</td>
                                  <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {cmd.description}
                                  </td>
                                  <td>
                                    <span className={`badge ${cmd.status === "active" ? "badge-success" : "badge-danger"}`}>
                                      {cmd.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}