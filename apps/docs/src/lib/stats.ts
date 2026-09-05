import { branding } from "./branding";

/**
 * The numbers on the front page that come from outside the repository.
 *
 * Fetched at build time and revalidated hourly, so the page is static and the
 * figures are never more than an hour stale. Either source being unreachable
 * leaves its number out rather than failing the build or printing a zero: an
 * absent stat is an absent stat, and a fabricated zero is a claim.
 *
 * A real zero is left out too. It is not a lie, but it is not information
 * either: a package published last week has no downloads to report, and a
 * front page announcing that says something about the page's judgement rather
 * than about the package. The figure appears once there is a figure.
 */
export interface EcosystemStats {
  /** npm downloads of the component package in the last month. */
  downloads?: number;
  /** GitHub stargazers. */
  stars?: number;
}

const REVALIDATE_SECONDS = 60 * 60;

async function fetchJson<T>(
  url: string,
  headers: Record<string, string> = {},
): Promise<T | undefined> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json", ...headers },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return undefined;
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

function positive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

export async function getEcosystemStats(): Promise<EcosystemStats> {
  const pkg = `${branding.packageScope}/react`;

  const [npm, github] = await Promise.all([
    fetchJson<{ downloads?: number }>(
      `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkg)}`,
    ),
    fetchJson<{ stargazers_count?: number }>(
      `https://api.github.com/repos/${branding.repository}`,
      { accept: "application/vnd.github+json" },
    ),
  ]);

  return {
    downloads: positive(npm?.downloads),
    stars: positive(github?.stargazers_count),
  };
}
