// Fetch wrapper with automatic auth header injection
import { getAuthToken, setAuthToken, removeAuthToken, isAuthenticated } from "./auth";

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Record<string, string>;
    throw new Error(errorData.error || response.statusText);
  }

  // Handle empty responses (e.g., DELETE)
  if (response.status === 204) return null;

  return response.json();
}

export { getAuthToken, setAuthToken, removeAuthToken, isAuthenticated };