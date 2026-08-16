import * as path from "path";
import * as fs from "fs";

import { parseNpmLock } from "../parsers/npm-lock.js";
import { buildGraph } from "../graph/builder.js";
import { reverseBFS } from "../graph/traversal.js";


export interface MultiTargetBlastRadiusResult {

    targets: string[];

    blastRadius:
        Record<string, Record<string,string[]>>;

    maxDepth:number;

}



export function runBlastRadiusAnalysis(
    packageName:string,
    lockfilePath?:string
):MultiTargetBlastRadiusResult {



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
            `Package ${packageName} not found in dependency tree.`
        );

    }



    const result:MultiTargetBlastRadiusResult = {

        targets:[],

        blastRadius:{},

        maxDepth:0

    };



    for(const target of targets) {


        const displayId =
            `${target.name}@${target.version}`;



        result.targets.push(
            displayId
        );



        const bfs =
            reverseBFS(
                graph,
                target.id
            );



        result.blastRadius[displayId] =
            bfs.blastRadius;



        result.maxDepth =
            Math.max(
                result.maxDepth,
                bfs.maxDepth
            );

    }



    return result;

}