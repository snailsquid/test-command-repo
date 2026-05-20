import { useState } from "react";

interface AddSessionFormProps {
  onSubmit: (data: { name: string; phoneNumber: string; wahaSessionId: string }) => Promise<void>;
  onCancel: () => void;
}

export default function AddSessionForm({ onSubmit, onCancel }: AddSessionFormProps) {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [wahaSessionId, setWahaSessionId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !phoneNumber || !wahaSessionId) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ name, phoneNumber, wahaSessionId });
      setName("");
      setPhoneNumber("");
      setWahaSessionId("");
    } catch (err: any) {
      setError(err.message || "Failed to add session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <h2>Add New Session</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Contact Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="e.g. John Doe"
            required
          />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber((e.target as HTMLInputElement).value)}
            placeholder="e.g. +1234567890"
            required
          />
        </div>
        <div className="form-group">
          <label>WAHA Session ID</label>
          <input
            type="text"
            value={wahaSessionId}
            onChange={(e) => setWahaSessionId((e.target as HTMLInputElement).value)}
            placeholder="e.g. session-abc123"
            required
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Adding..." : "Add Session"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}