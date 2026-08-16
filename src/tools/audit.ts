import * as path from 'path';
import * as fs from 'fs';
import { parseNpmLockfile } from '../parsers/npm-lock.js';
import { buildGraph } from '../graph/builder.js';
import { scanGraphVulnerabilities } from '../security/vulnerability-scanner.js';
import { runSecurityAudit, SecurityAuditResult } from '../security/risk-engine.js';

export async function runFullSecurityAudit(lockfilePath?: string): Promise<SecurityAuditResult> {
    const targetPath = lockfilePath || path.join(process.cwd(), 'package-lock.json');
    if (!fs.existsSync(targetPath)) {
        throw new Error(`package-lock.json not found at ${targetPath}`);
    }

    // 1. Parse and Build Topology
    const records = parseNpmLockfile(targetPath);
    const graph = buildGraph(records);

    // 2. Scan OSV for vulnerabilities (batches the graph nodes)
    await scanGraphVulnerabilities(graph);

    // 3. Run Risk Engine and generate Attack Paths
    const result = runSecurityAudit(graph);
    
    return result;
}
