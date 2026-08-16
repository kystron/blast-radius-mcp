export type DependencyType = "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies";

export interface PackageRecord {
    name: string;
    version: string;
    path: string; // The physical path in node_modules, e.g., "node_modules/a/node_modules/b"
    isDev: boolean;
    // Map of packageName -> semver constraint (e.g. "^4.0.0")
    dependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
    ecosystem: string;
}

export interface DependencyEdge {
    targetId: string; // e.g. "lodash@4.17.20"
    packageName: string; // e.g. "lodash"
    constraint: string; // e.g. "^4.17.0"
    isPeer?: boolean;
    isDev?: boolean;
    dependencyType: DependencyType;
}

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface Vulnerability {
    id: string; // e.g., "CVE-2023-xxxx" or "GHSA-xxxx"
    severity: Severity;
    summary: string;
    affectedRange?: string;
    fixedVersions?: string[];
    references?: string[];
}

export interface PackageNode {
    id: string; // e.g., "lodash@4.17.21"
    name: string;
    version: string;
    ecosystem: "npm" | "pip" | "cargo";
    // Keyed by package name
    dependencies: Map<string, DependencyEdge>;
    // Dependents holds node IDs that depend on this node
    dependents: Set<string>;
    metadata: {
        license?: string;
        vulnerabilities?: Vulnerability[];
    };
}
