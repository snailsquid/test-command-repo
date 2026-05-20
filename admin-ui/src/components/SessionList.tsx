import { useState } from "react";

interface Session {
  sessionId: string;
  isHealthy: boolean;
}

interface Contact {
  id: number;
  name: string;
  phoneNumber: string;
  wahaSessionId: string;
}

interface SessionListProps {
  contacts: Contact[];
  sessions: Session[];
  onDelete: (contactId: number) => void;
}

export default function SessionList({ contacts, sessions, onDelete }: SessionListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const getSessionHealth = (sessionId: string) => {
    const session = sessions.find((s) => s.sessionId === sessionId);
    return session?.isHealthy ? "connected" : "disconnected";
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phoneNumber.includes(searchTerm) ||
    c.wahaSessionId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
          style={{
            width: "100%",
            padding: "0.5rem 0.85rem",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "0.9rem",
          }}
        />
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Session ID</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map((contact) => {
              const health = getSessionHealth(contact.wahaSessionId);
              return (
                <tr key={contact.id}>
                  <td style={{ fontWeight: 500 }}>{contact.name}</td>
                  <td>{contact.phoneNumber}</td>
                  <td>
                    <code style={{ fontSize: "0.8rem", background: "#f3f4f6", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                      {contact.wahaSessionId}
                    </code>
                  </td>
                  <td>
                    <span className={`badge ${health === "connected" ? "badge-success" : "badge-danger"}`}>
                      {health === "connected" ? "● Connected" : "○ Disconnected"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => onDelete(contact.id)}
                      style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}