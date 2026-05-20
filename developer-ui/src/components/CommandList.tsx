import { useState } from "react";

interface Command {
  id: number;
  slug: string;
  name: string;
  description: string;
  status: "active" | "disabled" | "pending";
  installationCount: number;
}

interface CommandListProps {
  commands: Command[];
  onRefresh: () => void;
  onEnable?: (id: number) => void;
  onDisable?: (id: number) => void;
  onEdit?: (command: Command) => void;
}

export default function CommandList({
  commands,
  onRefresh,
  onEnable,
  onDisable,
  onEdit,
}: CommandListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCommands = commands.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="badge badge-success">Active</span>;
      case "disabled":
        return <span className="badge badge-danger">Disabled</span>;
      default:
        return <span className="badge badge-neutral">Pending</span>;
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search commands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
          style={{
            flex: 1,
            padding: "0.5rem 0.85rem",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "0.9rem",
            marginRight: "0.5rem",
          }}
        />
        <button className="btn btn-ghost" onClick={onRefresh}>🔄</button>
      </div>
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Slug</th>
                <th>Name</th>
                <th>Description</th>
                <th>Installs</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommands.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: "2rem" }}>
                    No commands yet. Click "Register WhatsApp Command" to get started.
                  </td>
                </tr>
              ) : (
                filteredCommands.map((cmd) => (
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
                    <td>{cmd.installationCount || 0}</td>
                    <td>{statusBadge(cmd.status)}</td>
                    <td style={{ display: "flex", gap: "0.3rem" }}>
                      {cmd.status === "active" && onDisable && (
                        <button
                          className="btn btn-danger"
                          onClick={() => onDisable(cmd.id)}
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                        >
                          Disable
                        </button>
                      )}
                      {cmd.status === "disabled" && onEnable && (
                        <button
                          className="btn btn-primary"
                          onClick={() => onEnable(cmd.id)}
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                        >
                          Enable
                        </button>
                      )}
                      {onEdit && (
                        <button
                          className="btn btn-ghost"
                          onClick={() => onEdit(cmd)}
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}