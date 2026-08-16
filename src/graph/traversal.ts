import { DependencyGraph } from "./DependencyGraph.js";


export interface BlastRadiusResult {

    target: string;

    blastRadius: Record<string, string[]>;

    maxDepth: number;

}



function formatNode(node: any): string {

    return `${node.name}@${node.version}`;

}



export function reverseBFS(
    graph: DependencyGraph,
    targetId: string
): BlastRadiusResult {


    const visited = new Set<string>();

    const queue: {
        id:string;
        depth:number;
    }[] = [];



    const blastRadius:
        Record<string,string[]> = {};



    let maxDepth = 0;



    queue.push({
        id: targetId,
        depth:0
    });


    visited.add(targetId);




    while(queue.length > 0) {


        const current =
            queue.shift()!;


        const {
            id,
            depth
        } = current;




        if(depth > 0) {


            const key =
                `depth_${depth}`;



            if(!blastRadius[key]) {

                blastRadius[key] = [];

            }



            const node =
                graph.getNode(id);



            if(node) {

                blastRadius[key].push(
                    formatNode(node)
                );

            }



            maxDepth =
                Math.max(
                    maxDepth,
                    depth
                );

        }




        const dependents =
            graph.getDependents(id);



        for(const dependentId of dependents) {


            if(!visited.has(dependentId)) {


                visited.add(dependentId);


                queue.push({

                    id: dependentId,

                    depth: depth + 1

                });

            }

        }

    }



    for(const key of Object.keys(blastRadius)) {

        blastRadius[key] =
            Array.from(
                new Set(
                    blastRadius[key]
                )
            );

    }



    return {

        target: targetId,

        blastRadius,

        maxDepth

    };

}