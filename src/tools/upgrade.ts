import * as path from "path";
import * as fs from "fs";
import semver from "semver";

import { parseNpmLock } from "../parsers/npm-lock.js";
import { buildGraph } from "../graph/builder.js";


export interface UpgradeImpactResult {

    upgrade: {

        package:string;

        from:string[];

        to:string;

    };


    impact: Record<string, any[]>;


    summary: {

        safe:number;

        warning:number;

        break:number;

    };

}




export function runUpgradeAnalysis(
    packageName:string,
    targetVersion:string,
    lockfilePath?:string
):UpgradeImpactResult {



    const targetPath =
        lockfilePath ||
        path.join(
            process.cwd(),
            "package-lock.json"
        );



    if(!fs.existsSync(targetPath)) {

        throw new Error(
            `package-lock.json not found at ${targetPath}`
        );

    }



    const records =
        parseNpmLock(targetPath);



    const graph =
        buildGraph(records);



    const targets =
        graph.findPackages(packageName);



    if(targets.length === 0) {

        throw new Error(
            `${packageName} not found`
        );

    }



    const result:UpgradeImpactResult = {

        upgrade: {

            package:packageName,

            from:
                targets.map(
                    t => t.version
                ),

            to:targetVersion

        },


        impact:{},


        summary:{

            safe:0,

            warning:0,

            break:0

        }

    };



    const visited =
        new Set<string>();


    const queue:{
        id:string;
        depth:number;
    }[]=[];



    for(const target of targets){

        queue.push({

            id:target.id,

            depth:0

        });


        visited.add(target.id);

    }




    while(queue.length){


        const {
            id,
            depth
        } =
            queue.shift()!;



        if(depth>0){


            const key =
                `depth_${depth}`;



            if(!result.impact[key]){

                result.impact[key]=[];

            }



            const node =
                graph.getNode(id);



            if(node){


                let status =
                    "WARNING";


                let reason =
                    "Transitive dependency requires validation";



                const edges =
                    graph.getDependencies(id);



                const edge =
                    edges.find(
                        e =>
                        e.packageName === packageName
                    );



                if(edge){


                    if(
                        semver.satisfies(
                            targetVersion,
                            edge.constraint
                        )
                    ){

                        status="SAFE";

                        reason =
                            `supports ${edge.constraint}`;

                        result.summary.safe++;


                    }
                    else if(edge.isPeer){


                        status="WARNING";

                        reason =
                            `peer dependency requires ${edge.constraint}`;

                        result.summary.warning++;


                    }
                    else{


                        status="BREAK";

                        reason =
                            `requires ${edge.constraint} (does not satisfy ${targetVersion})`;

                        result.summary.break++;

                    }

                }



                result.impact[key].push({

                    name:
                        node.name,

                    version:
                        node.version,

                    status,

                    reason

                });

            }

        }



        for(const dependent of graph.getDependents(id)){


            if(!visited.has(dependent)){


                visited.add(dependent);


                queue.push({

                    id:dependent,

                    depth:depth+1

                });

            }

        }


    }



    return result;

}