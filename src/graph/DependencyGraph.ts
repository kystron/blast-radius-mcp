import { PackageNode, DependencyEdge, DependencyType } from "./types.js";

export class DependencyGraph {

    private nodes: Map<string, PackageNode>;


    constructor() {
        this.nodes = new Map();
    }


    public addNode(node: PackageNode): void {

        if (!this.nodes.has(node.id)) {
            this.nodes.set(node.id, node);
        }

    }



    public addEdge(
        fromId: string,
        toId: string,
        packageName: string,
        constraint: string,
        dependencyType: DependencyType,
        isPeer: boolean = false,
        isDev: boolean = false
    ): void {


        const fromNode = this.nodes.get(fromId);

        const toNode = this.nodes.get(toId);



        if (!fromNode || !toNode) {
            return;
        }



        /*
            Multiple dependency types can point
            to the same package.

            Example:

            app
             |
             ├── dependencies -> lodash@4
             |
             └── peerDependencies -> lodash@4

        */


        const edgeKey =
            `${toId}:${dependencyType}`;



        const edge: DependencyEdge = {

            targetId: toId,

            packageName,

            constraint,

            isPeer,

            isDev,

            dependencyType

        };



        fromNode.dependencies.set(
            edgeKey,
            edge
        );


        toNode.dependents.add(fromId);

    }




    public getNode(
        id: string
    ): PackageNode | undefined {

        return this.nodes.get(id);

    }




    public getDependents(
        id: string
    ): string[] {


        const node =
            this.nodes.get(id);


        return node
            ? Array.from(node.dependents)
            : [];

    }




    public getDependencies(
        id: string
    ): DependencyEdge[] {


        const node =
            this.nodes.get(id);


        return node
            ? Array.from(node.dependencies.values())
            : [];

    }




    public getDependencyEdge(
        fromId: string,
        targetId: string
    ): DependencyEdge[] {


        const fromNode =
            this.nodes.get(fromId);



        if (!fromNode) {
            return [];
        }



        return Array.from(
            fromNode.dependencies.values()
        ).filter(
            edge => edge.targetId === targetId
        );

    }




    public findPackages(
        name: string
    ): PackageNode[] {


        const results: PackageNode[] = [];



        for (const node of this.nodes.values()) {

            if (node.name === name) {

                results.push(node);

            }

        }



        return results;

    }




    public getAllNodes(): PackageNode[] {

        return Array.from(
            this.nodes.values()
        );

    }

}