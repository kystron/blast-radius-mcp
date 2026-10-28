import { PackageRecord, PackageNode, DependencyType } from "./types.js";
import { DependencyGraph } from "./DependencyGraph.js";


function createNodeId(record: PackageRecord): string {
    return `${record.name}@${record.version}#${record.path}`;
}


/**
 * Node.js style dependency resolution
 *
 * Example:
 *
 * node_modules/a/node_modules/b
 *
 * Search:
 *
 * node_modules/a/node_modules/b/node_modules/x
 * node_modules/a/node_modules/x
 * node_modules/x
 */
function resolveDependency(
    sourcePath: string,
    dependencyName: string,
    pathMap: Map<string, PackageRecord>
): PackageRecord | undefined {


    let currentPath = sourcePath;


    while (true) {


        const lookupPath =
            currentPath === ""
                ? `node_modules/${dependencyName}`
                : `${currentPath}/node_modules/${dependencyName}`;



        const found =
            pathMap.get(lookupPath);



        if (found) {
            return found;
        }



        if (currentPath === "") {
            break;
        }



        const lastIndex =
            currentPath.lastIndexOf("/node_modules/");



        if (lastIndex !== -1) {

            currentPath =
                currentPath.substring(0, lastIndex);

        }
        else {

            currentPath = "";

        }

    }


    return undefined;

}



function addDependencyEdges(
    graph: DependencyGraph,
    record: PackageRecord,
    fromId: string,
    dependencies: Record<string, string>,
    dependencyType: DependencyType,
    pathMap: Map<string, PackageRecord>,
    isPeer: boolean = false
): void {


    for (const [packageName, constraint] of Object.entries(dependencies)) {


        const resolved =
            resolveDependency(
                record.path,
                packageName,
                pathMap
            );



        if (!resolved) {
            const isOptionalPeer = isPeer && record.peerDependenciesMeta?.[packageName]?.optional === true;
            if (!isOptionalPeer) {
                console.warn(
                    `[WARN] Could not resolve ${packageName} from ${record.path}`
                );
            }

            continue;

        }



        const targetId =
            createNodeId(resolved);



        graph.addEdge(
            fromId,
            targetId,
            packageName,
            constraint,
            dependencyType,
            isPeer,
            dependencyType === "devDependencies"
        );

    }

}



export function buildGraph(
    records: PackageRecord[]
): DependencyGraph {


    const graph =
        new DependencyGraph();



    const pathMap =
        new Map<string, PackageRecord>();



    /*
        First pass:
        Register packages and create nodes
    */

    for (const record of records) {


        pathMap.set(
            record.path,
            record
        );



        const nodeId =
            createNodeId(record);



        const node: PackageNode = {


            id: nodeId,


            name: record.name,


            version: record.version,


            ecosystem:
                record.ecosystem as
                "npm" | "pip" | "cargo",



            dependencies:
                new Map(),



            dependents:
                new Set(),



            metadata: {}

        };



        graph.addNode(node);

    }





    /*
        Second pass:
        Build dependency edges
    */

    for (const record of records) {


        const fromId =
            createNodeId(record);



        addDependencyEdges(
            graph,
            record,
            fromId,
            record.dependencies,
            "dependencies",
            pathMap
        );



        addDependencyEdges(
            graph,
            record,
            fromId,
            record.devDependencies,
            "devDependencies",
            pathMap
        );



        addDependencyEdges(
            graph,
            record,
            fromId,
            record.optionalDependencies,
            "optionalDependencies",
            pathMap
        );



        addDependencyEdges(
            graph,
            record,
            fromId,
            record.peerDependencies,
            "peerDependencies",
            pathMap,
            true
        );

    }



    return graph;

}