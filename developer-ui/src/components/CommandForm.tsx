import { useState } from "react";

interface CommandFormProps {
  onSubmit: (data: {
    slug: string;
    name: string;
    description: string;
    usage: string;
    repoUrl: string;
  }) => Promise<void>;
  onCancel: () => void;
  initialValues?: {
    slug?: string;
    name?: string;
    description?: string;
    usage?: string;
    repoUrl?: string;
  };
}

export default function CommandForm({
  onSubmit,
  onCancel,
  initialValues,
}: CommandFormProps) {
  const [slug, setSlug] = useState(initialValues?.slug || "");
  const [name, setName] = useState(initialValues?.name || "");
  const [description, setDescription] = useState(initialValues?.description || "");
  const [usage, setUsage] = useState(initialValues?.usage || "");
  const [repoUrl, setRepoUrl] = useState(initialValues?.repoUrl || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!slug || !name || !description || !usage || !repoUrl) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ slug, name, description, usage, repoUrl });
      // Clear form on success
      setSlug("");
      setName("");
      setDescription("");
      setUsage("");
      setRepoUrl("");
    } catch (err: any) {
      setError(err.message || "Failed to register command");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>{initialValues ? "Edit Command" : "Register New Command"}</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Slug (e.g. "remind-me")</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug((e.target as HTMLInputElement).value)}
            placeholder="my-command"
            required
          />
        </div>
        <div className="form-group">
          <label>Command Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="My Cool Command"
            required
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription((e.target as HTMLInputElement).value)}
            placeholder="What does this command do?"
            required
          />
        </div>
        <div className="form-group">
          <label>Usage</label>
          <input
            type="text"
            value={usage}
            onChange={(e) => setUsage((e.target as HTMLInputElement).value)}
            placeholder=".my-command <arg1> <arg2>"
            required
          />
        </div>
        <div className="form-group">
          <label>GitHub Repository URL</label>
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl((e.target as HTMLInputElement).value)}
            placeholder="https://github.com/user/repo"
            required
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Submitting..." : initialValues ? "Update" : "Register"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}