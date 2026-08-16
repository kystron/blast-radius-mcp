import * as fs from 'fs';
import * as path from 'path';
import { Vulnerability, Severity } from '../graph/types.js';

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
}

const CACHE_FILE = path.join(process.cwd(), '.vulnerability-cache.json');
const CACHE_VERSION = 1;

function loadCache(): CacheData {
    if (fs.existsSync(CACHE_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
            if (data.version === CACHE_VERSION) {
                // Check TTL (e.g., 24 hours)
                const age = Date.now() - new Date(data.updated).getTime();
                if (age < 24 * 60 * 60 * 1000) {
                    return data;
                }
            }
        } catch (e) {
            // Ignore cache read errors
        }
    }
    return { version: CACHE_VERSION, updated: new Date().toISOString(), entries: {} };
}

function saveCache(cache: CacheData) {
    cache.updated = new Date().toISOString();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

export async function queryOsvBatch(queries: OsvQuery[]): Promise<Vulnerability[][]> {
    const CHUNK_SIZE = 1000;
    const allResults: Vulnerability[][] = new Array(queries.length).fill([]);
    const cache = loadCache();
    
    // Identify which queries need to be fetched
    const pendingQueries: { query: OsvQuery; originalIndex: number }[] = [];
    
    for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        const cacheKey = `${q.package.name}@${q.version}`;
        if (cache.entries[cacheKey]) {
            allResults[i] = cache.entries[cacheKey];
        } else {
            pendingQueries.push({ query: q, originalIndex: i });
        }
    }

    if (pendingQueries.length === 0) {
        return allResults;
    }

    let cacheUpdated = false;

    for (let i = 0; i < pendingQueries.length; i += CHUNK_SIZE) {
        const chunk = pendingQueries.slice(i, i + CHUNK_SIZE);
        const queryChunk = chunk.map(c => c.query);
        
        const response = await fetch('https://api.osv.dev/v1/querybatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queries: queryChunk })
        });

        if (!response.ok) {
            throw new Error(`OSV API error: ${response.statusText}`);
        }

        const data = await response.json() as any;
        const results = data.results || [];
        
        for (let j = 0; j < results.length; j++) {
            const res = results[j];
            const originalIndex = chunk[j].originalIndex;
            const q = chunk[j].query;
            const cacheKey = `${q.package.name}@${q.version}`;
            
            const vulns: Vulnerability[] = [];
            
            if (res.vulns) {
                // For each vulnerability ID, we must fetch the full details
                const detailPromises = res.vulns.map(async (v: any) => {
                    const detailRes = await fetch(`https://api.osv.dev/v1/vulns/${v.id}`);
                    if (!detailRes.ok) return null;
                    return await detailRes.json();
                });

                const fullVulns = await Promise.all(detailPromises);

                for (const v of fullVulns) {
                    if (!v) continue;

                    let severity: Severity = "UNKNOWN";
                    if (v.database_specific?.severity) {
                        severity = v.database_specific.severity.toUpperCase() as Severity;
                        if (severity as string === "MODERATE") severity = "MEDIUM";
                    } else if (v.severity && v.severity.length > 0) {
                        severity = "HIGH"; // CVSS heuristic
                    }

                    let affectedRange = "";
                    if (v.affected && v.affected.length > 0) {
                        const affected = v.affected[0];
                        if (affected.ranges && affected.ranges.length > 0) {
                            affectedRange = JSON.stringify(affected.ranges[0].events);
                        }
                    }

                    vulns.push({
                        id: v.id,
                        severity,
                        summary: v.summary || v.details || "No description provided.",
                        affectedRange,
                        references: v.references?.map((r: any) => r.url) || []
                    });
                }
            }
            
            allResults[originalIndex] = vulns;
            cache.entries[cacheKey] = vulns;
            cacheUpdated = true;
        }
    }

    if (cacheUpdated) {
        saveCache(cache);
    }

    return allResults;
}
