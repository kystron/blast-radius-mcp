export interface PackageRecord {
    name: string;
    version: string;
    // Map of packageName -> semver constraint (e.g. "^4.0.0")
    dependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
    ecosystem: string;
}

export interface DependencyEdge {
    targetId: string;
    packageName: string;
    constraint: string;
    isPeer?: boolean;
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
