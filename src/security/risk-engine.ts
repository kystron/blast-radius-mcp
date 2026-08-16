import { DependencyGraph } from "../graph/DependencyGraph.js";
import { Severity } from "../graph/types.js";


export interface AttackPath {

    entry: string;

    vulnerable: string;

    depth: number;

    path: string[];

    isDevPath: boolean;

}



export interface VulnerableNode {

    id: string;

    package: string;

    version: string;

    severity: Severity;

    summary: string;

    riskScore: number;

    attackPaths: AttackPath[];

}



export interface SecurityAuditResult {

    summary: {

        critical:number;

        high:number;

        medium:number;

        low:number;

    };

    vulnerabilities: VulnerableNode[];

}



function getSeverityScore(
    severity: Severity
): number {

    switch(severity){

        case "CRITICAL":
            return 100;

        case "HIGH":
            return 80;

        case "MEDIUM":
            return 50;

        case "LOW":
            return 20;

        default:
            return 10;

    }

}



function packageLabel(
    name:string,
    version:string
):string {

    return `${name}@${version}`;

}





export function runSecurityAudit(
    graph: DependencyGraph
): SecurityAuditResult {



    const result: SecurityAuditResult = {

        summary:{

            critical:0,

            high:0,

            medium:0,

            low:0

        },

        vulnerabilities:[]

    };




    for(const node of graph.getAllNodes()){


        const vulnerabilities =
            node.metadata.vulnerabilities;



        if(
            !vulnerabilities ||
            vulnerabilities.length === 0
        ){
            continue;
        }




        // Don't mutate original metadata array

        const topVuln =
            [...vulnerabilities]
            .sort(
                (a,b)=>
                    getSeverityScore(b.severity)
                    -
                    getSeverityScore(a.severity)
            )[0];




        switch(topVuln.severity){

            case "CRITICAL":
                result.summary.critical++;
                break;

            case "HIGH":
                result.summary.high++;
                break;

            case "MEDIUM":
                result.summary.medium++;
                break;

            default:
                result.summary.low++;

        }




        const attackPaths: AttackPath[] = [];



        const visited =
            new Set<string>();



        const queue:{
            id:string;
            depth:number;
            path:string[];
            isDevPath:boolean;
        }[] = [];




        queue.push({

            id:node.id,

            depth:0,

            path:[
                packageLabel(
                    node.name,
                    node.version
                )
            ],

            isDevPath:false

        });



        visited.add(node.id);



        let minProdDepth = Infinity;

        let minDevDepth = Infinity;





        while(queue.length){



            const current =
                queue.shift()!;



            const {
                id,
                depth,
                path,
                isDevPath
            } = current;




            const dependents =
                graph.getDependents(id);




            // Root application entry

            if(
                dependents.length === 0 &&
                depth > 0
            ){

                attackPaths.push({

                    entry:path[path.length - 1],

                    vulnerable:
                        packageLabel(
                            node.name,
                            node.version
                        ),

                    depth,

                    path:[
                        ...path
                    ].reverse(),

                    isDevPath

                });



                if(isDevPath){

                    minDevDepth =
                        Math.min(
                            minDevDepth,
                            depth
                        );

                }
                else{

                    minProdDepth =
                        Math.min(
                            minProdDepth,
                            depth
                        );

                }

            }




            for(const dependentId of dependents){



                if(visited.has(dependentId)){
                    continue;
                }



                const dependentNode =
                    graph.getNode(dependentId);



                if(!dependentNode){
                    continue;
                }



                const edges =
                    graph.getDependencyEdge(
                        dependentId,
                        id
                    );



                const edge =
                    edges[0];



                visited.add(dependentId);



                queue.push({

                    id:dependentId,

                    depth:depth + 1,

                    path:[
                        ...path,
                        packageLabel(
                            dependentNode.name,
                            dependentNode.version
                        )
                    ],

                    isDevPath:
                        isDevPath ||
                        !!edge?.isDev

                });

            }

        }





        let effectiveDepth = 0;

        let reachability = 1.0;




        if(minProdDepth !== Infinity){

            effectiveDepth =
                minProdDepth;

            reachability = 1.0;

        }
        else if(minDevDepth !== Infinity){

            effectiveDepth =
                minDevDepth;

            reachability = 0.3;

        }





        const depthFactor =
            1 /
            Math.log2(
                effectiveDepth + 2
            );



        const riskScore =
            Math.round(
                getSeverityScore(
                    topVuln.severity
                )
                *
                reachability
                *
                depthFactor
            );





        result.vulnerabilities.push({

            id:topVuln.id,

            package:node.name,

            version:node.version,

            severity:topVuln.severity,

            summary:topVuln.summary,

            riskScore,

            attackPaths

        });


    }





    result.vulnerabilities.sort(
        (a,b)=>
            b.riskScore - a.riskScore
    );



    return result;

}