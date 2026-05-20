/**
 * 11.2 Duration parser for human-readable time strings
 * Supports: s (seconds), m (minutes), h (hours), d (days)
 * Examples: "10m" → 600000ms, "2h" → 7200000ms, "30s" → 30000ms, "1d" → 86400000ms
 */
export function parseDuration(input: string): number {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("Duration string is empty");
  }

  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([smhd])$/);
  if (!match) {
    throw new Error(
      `Invalid duration format: "${input}". Use number + unit (s=seconds, m=minutes, h=hours, d=days). Examples: "10m", "2h", "30s"`
    );
  }

  const value = parseFloat(match[1]!);
  const unit = match[2]!;

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const multiplier = multipliers[unit];
  if (!multiplier) {
    throw new Error(`Unknown duration unit: ${unit}. Use s, m, h, or d.`);
  }

  return Math.round(value * multiplier);
}
