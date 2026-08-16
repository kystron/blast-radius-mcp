import express from "express";

import { runFullSecurityAudit } from "../tools/audit.js";
import { buildGraph } from "../graph/builder.js";
import { parseNpmLock } from "../parsers/npm-lock.js";

import * as path from "path";


export const apiRouter =
    express.Router();



function getGraph(){

    const targetPath =
        path.join(
            process.cwd(),
            "package-lock.json"
        );


    const records =
        parseNpmLock(targetPath);


    return buildGraph(records);

}





apiRouter.get(
"/graph",
async(req,res)=>{

try{


    const audit =
        await runFullSecurityAudit();



    const graph =
        getGraph();




    /*
        Store vulnerable nodes
    */

    const vulnNodes =
        new Map<string,any>();


    for(const vuln of audit.vulnerabilities){

        vulnNodes.set(
            `${vuln.package}@${vuln.version}`,
            vuln
        );

    }




    /*
        Store attack paths by name
        because risk engine returns names
    */

    const attackEdges =
        new Set<string>();


    for(const vuln of audit.vulnerabilities){


        for(const attack of vuln.attackPaths){


            for(
                let i = 0;
                i < attack.path.length - 1;
                i++
            ){

                attackEdges.add(
                    `${attack.path[i]}->${attack.path[i+1]}`
                );

            }

        }

    }






    const nodes:any[] = [];

    const edges:any[] = [];






    for(const node of graph.getAllNodes()){


        const dependents =
            graph.getDependents(
                node.id
            );



        let layer = 2;



        // Root application

        if(dependents.length === 0){

            layer = 0;

        }
        else{


            for(const parentId of dependents){


                const parent =
                    graph.getNode(
                        parentId
                    );


                if(
                    parent &&
                    graph.getDependents(
                        parent.id
                    ).length === 0
                ){

                    layer = 1;

                    break;

                }

            }

        }





        const vulnerability =
            vulnNodes.get(
                node.id
            );



        let type = "standard";


        if(layer === 0)
            type = "root";


        else if(layer === 1)
            type = "direct";



        if(vulnerability)
            type = "vulnerable";






        nodes.push({

            id: node.id,

            name: node.name,

            version: node.version,

            type,

            layer,

            riskScore:
                vulnerability?.riskScore ?? 0,


            severity:
                vulnerability?.severity ?? "NONE",


            vulnerabilityDetails:
                vulnerability ?? null

        });







        /*
            Create graph edges
        */


        for(
            const edge of graph.getDependencies(
                node.id
            )
        ){


            const target =
                graph.getNode(
                    edge.targetId
                );


            if(!target)
                continue;





            const attackById =
                `${node.id}->${target.id}`;



            const attackByName =
                `${node.name}->${target.name}`;




            edges.push({

                source: node.id,

                target: target.id,


                type:
                    attackEdges.has(attackById) ||
                    attackEdges.has(attackByName)
                    ? "attack"
                    : "dependency",


                constraint:
                    edge.constraint,


                dependencyType:
                    edge.dependencyType

            });


        }


    }





    res.json({

        nodes,

        edges

    });



}
catch(err:any){


    res.status(500).json({

        error: err.message

    });


}


});








apiRouter.get(
"/audit",
async(req,res)=>{


try{


    const audit =
        await runFullSecurityAudit();



    res.json(audit);


}
catch(err:any){


    res.status(500).json({

        error: err.message

    });


}


});