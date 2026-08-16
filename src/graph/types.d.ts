export interface PackageRecord {
    name: string;
    version: string;
    dependencies: string[];
    ecosystem: string;
}
export interface PackageNode {
    id: string;
    name: string;
    version: string;
    ecosystem: "npm" | "pip" | "cargo";
    dependencies: Set<string>;
    dependents: Set<string>;
    metadata: {
        license?: string;
        vulnerabilities?: string[];
    };
}
//# sourceMappingURL=types.d.ts.map