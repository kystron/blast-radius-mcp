import { Vulnerability, Severity } from '../graph/types.js';

export interface OsvQuery {
    package: {
        name: string;
        ecosystem: string;
    };
    version: string;
}

export async function queryOsvBatch(queries: OsvQuery[]): Promise<Vulnerability[][]> {
    const CHUNK_SIZE = 1000;
    const allResults: Vulnerability[][] = [];

    for (let i = 0; i < queries.length; i += CHUNK_SIZE) {
        const chunk = queries.slice(i, i + CHUNK_SIZE);
        
        const response = await fetch('https://api.osv.dev/v1/querybatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queries: chunk })
        });

        if (!response.ok) {
            throw new Error(`OSV API error: ${response.statusText}`);
        }

        const data = await response.json() as any;
        const results = data.results || [];
        
        for (const res of results) {
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
                        // Attempt to parse CVSS
                        severity = "HIGH";
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
            allResults.push(vulns);
        }
    }

    return allResults;
}
