import * as path from "path";
import * as fs from "fs";

import { parseNpmLock } from "../parsers/npm-lock.js";
import { buildGraph } from "../graph/builder.js";

import { scanGraphVulnerabilities } from "../security/vulnerability-scanner.js";

import {
    runSecurityAudit,
    SecurityAuditResult
} from "../security/risk-engine.js";



export async function runFullSecurityAudit(
    lockfilePath?: string
): Promise<SecurityAuditResult> {


    const targetPath =
        lockfilePath ||
        path.join(
            process.cwd(),
            "package-lock.json"
        );



    if(!fs.existsSync(targetPath)){

        throw new Error(
            `package-lock.json not found at ${targetPath}`
        );

    }



    /*
        1. Parse npm lockfile
    */

    const records =
        parseNpmLock(
            targetPath
        );



    /*
        2. Build dependency graph
    */

    const graph =
        buildGraph(
            records
        );



    /*
        3. Query OSV and attach
           vulnerabilities to nodes
    */

    await scanGraphVulnerabilities(
        graph
    );



    /*
        4. Calculate attack paths
           and risk scores
    */

    return runSecurityAudit(
        graph
    );

}