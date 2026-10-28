import * as fs from "fs";
import * as path from "path";
import { Vulnerability, Severity } from "../graph/types.js";

export interface OsvQuery {
  package: {
    name: string;
    ecosystem: string;
  };
  version: string;
}

interface CacheData {
  version: number;
  updated: string;
  entries: Record<string, Vulnerability[]>;
  details: Record<string, any>;
}

const CACHE_FILE = path.join(process.cwd(), ".vulnerability-cache.json");
const CACHE_VERSION = 1;
const CACHE_TTL = 24 * 60 * 60 * 1000;

function createPackageCacheKey(query: OsvQuery): string {
  return `${query.package.ecosystem}:${query.package.name}@${query.version}`;
}

function loadCache(): CacheData {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));

      if (data.version === CACHE_VERSION) {
        const updatedAt = new Date(data.updated).getTime();
        const age = Date.now() - updatedAt;

        if (
          Number.isFinite(updatedAt) &&
          age >= 0 &&
          age < CACHE_TTL
        ) {
          return {
            version: CACHE_VERSION,
            updated: data.updated,
            entries: data.entries || {},
            details: data.details || {},
          };
        }
      }
    } catch {
      // Ignore corrupted or unreadable cache files.
    }
  }

  return {
    version: CACHE_VERSION,
    updated: new Date().toISOString(),
    entries: {},
    details: {},
  };
}

function saveCache(cache: CacheData): void {
  cache.updated = new Date().toISOString();

  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify(cache, null, 2),
    "utf-8",
  );
}

function calculateSeverity(vuln: any): Severity {
  const severity = vuln.database_specific?.severity;

  if (typeof severity === "string") {
    const value = severity.toUpperCase();

    if (value === "MODERATE") {
      return "MEDIUM";
    }

    if (["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(value)) {
      return value as Severity;
    }
  }

  // CVSS fallback. OSV may provide a CVSS vector string rather
  // than a numeric score, so do not interpret vectors as scores.
  const cvssValue = vuln.severity?.[0]?.score;

  const cvss =
    typeof cvssValue === "number"
      ? cvssValue
      : typeof cvssValue === "string" &&
          cvssValue.trim() !== "" &&
          /^\d+(\.\d+)?$/.test(cvssValue.trim())
        ? Number(cvssValue)
        : Number.NaN;

  if (Number.isFinite(cvss) && cvss >= 0 && cvss <= 10) {
    if (cvss >= 9) {
      return "CRITICAL";
    }

    if (cvss >= 7) {
      return "HIGH";
    }

    if (cvss >= 4) {
      return "MEDIUM";
    }

    return "LOW";
  }

  return "UNKNOWN";
}

async function fetchVulnerabilityDetails(
  id: string,
  cache: CacheData,
): Promise<any | null> {
  if (cache.details[id]) {
    return cache.details[id];
  }

  const response = await fetch(
    `https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`,
  );

  if (response.status === 404) {
    // The advisory may have been removed after the batch query.
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch OSV vulnerability ${id}: HTTP ${response.status}`,
    );
  }

  const data = await response.json();

  if (!data || typeof data.id !== "string") {
    throw new Error(
      `Invalid vulnerability details returned by OSV for ${id}`,
    );
  }

  cache.details[id] = data;

  return data;
}

export async function queryOsvBatch(
  queries: OsvQuery[],
): Promise<Vulnerability[][]> {
  const results: Vulnerability[][] = Array.from(
    { length: queries.length },
    () => [],
  );

  if (queries.length === 0) {
    return results;
  }

  const cache = loadCache();

  const pending: {
    query: OsvQuery;
    index: number;
  }[] = [];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const key = createPackageCacheKey(query);

    if (Object.prototype.hasOwnProperty.call(cache.entries, key)) {
      results[i] = cache.entries[key];
    } else {
      pending.push({
        query,
        index: i,
      });
    }
  }

  if (pending.length === 0) {
    return results;
  }

  const CHUNK_SIZE = 1000;
  let cacheChanged = false;

  for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
    const chunk = pending.slice(i, i + CHUNK_SIZE);

    const response = await fetch(
      "https://api.osv.dev/v1/querybatch",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queries: chunk.map((item) => item.query),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `OSV batch API error: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      results?: unknown;
    };

    const batchResults = data.results;

    if (
      !Array.isArray(batchResults) ||
      batchResults.length !== chunk.length
    ) {
      throw new Error(
        `Invalid OSV batch response: expected ${chunk.length} results, received ${
          Array.isArray(batchResults)
            ? batchResults.length
            : "an invalid response"
        }. Results were not cached.`,
      );
    }

    // Build this chunk's results locally. Only commit them to the
    // cache after all advisory details in the chunk were processed.
    const chunkResults: {
      index: number;
      key: string;
      vulnerabilities: Vulnerability[];
    }[] = [];

    for (let j = 0; j < batchResults.length; j++) {
      const osvResult = batchResults[j] as {
        vulns?: { id?: string }[];
      };

      if (
        !osvResult ||
        (osvResult.vulns !== undefined &&
          !Array.isArray(osvResult.vulns))
      ) {
        throw new Error(
          `Invalid OSV result at batch index ${j}. Results were not cached.`,
        );
      }

      const original = chunk[j];
      const vulnerabilities: Vulnerability[] = [];

      if (osvResult.vulns) {
        for (const item of osvResult.vulns) {
          if (typeof item?.id !== "string" || item.id.length === 0) {
            throw new Error(
              `Invalid vulnerability ID at batch index ${j}. Results were not cached.`,
            );
          }

          const detail = await fetchVulnerabilityDetails(
            item.id,
            cache,
          );

          if (!detail) {
            // A 404 means the advisory disappeared between the batch
            // query and the details request. Do not cache this package
            // result because it may be incomplete.
            throw new Error(
              `OSV returned vulnerability ${item.id}, but its details endpoint returned 404. Retry the scan.`,
            );
          }

          vulnerabilities.push({
            id: detail.id,
            severity: calculateSeverity(detail),
            summary:
              detail.summary ||
              detail.details ||
              "No description provided.",
            affectedRange: detail.affected
              ? JSON.stringify(detail.affected)
              : undefined,
            references:
              detail.references?.map(
                (reference: { url?: string }) => reference.url,
              ).filter(
                (url: string | undefined): url is string =>
                  typeof url === "string",
              ) || [],
          });
        }
      }

      chunkResults.push({
        index: original.index,
        key: createPackageCacheKey(original.query),
        vulnerabilities,
      });
    }

    // Commit only after the whole chunk has been processed successfully.
    for (const item of chunkResults) {
      results[item.index] = item.vulnerabilities;
      cache.entries[item.key] = item.vulnerabilities;
      cacheChanged = true;
    }
  }

  if (cacheChanged) {
    saveCache(cache);
  }

  return results;
}