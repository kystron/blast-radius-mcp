import { PackageNode } from './types';
export declare class DependencyGraph {
    private nodes;
    constructor();
    addNode(node: PackageNode): void;
    addEdge(fromId: string, toId: string): void;
    getNode(id: string): PackageNode | undefined;
    getDependents(id: string): string[];
    getDependencies(id: string): string[];
    findPackages(name: string): PackageNode[];
    getAllNodes(): PackageNode[];
}
//# sourceMappingURL=DependencyGraph.d.ts.map