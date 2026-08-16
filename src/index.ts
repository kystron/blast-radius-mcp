#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { runBlastRadiusAnalysis } from "./tools/analyze.js";
import { runUpgradeAnalysis } from "./tools/upgrade.js";
import { runFullSecurityAudit } from "./tools/audit.js";

import express from "express";
import cors from "cors";
import fs from "fs";

import { apiRouter } from "./api/routes.js";

import path from "path";
import { fileURLToPath } from "url";


const server = new McpServer({

    name:"blast-radius-mcp",

    version:"1.0.0"

});



server.tool(

    "dependency_blast_radius",

    "Analyzes dependency blast radius using reverse BFS.",

    {
        packageName:z.string(),
        lockfilePath:z.string().optional()
    },


    async({packageName,lockfilePath})=>{

        try{

            const result =
                runBlastRadiusAnalysis(
                    packageName,
                    lockfilePath
                );


            return {

                content:[{

                    type:"text",

                    text:
                        JSON.stringify(
                            result,
                            null,
                            2
                        )

                }]

            };


        }
        catch(error:any){

            return {

                isError:true,

                content:[{

                    type:"text",

                    text:error.message

                }]

            };

        }

    }

);




server.tool(

    "dependency_upgrade_analysis",

    "Simulates dependency upgrade impact.",

    {
        packageName:z.string(),

        targetVersion:z.string(),

        lockfilePath:z.string().optional()

    },


    async(args)=>{


        try{


            const result =
                runUpgradeAnalysis(
                    args.packageName,
                    args.targetVersion,
                    args.lockfilePath
                );


            return {

                content:[{

                    type:"text",

                    text:
                        JSON.stringify(
                            result,
                            null,
                            2
                        )

                }]

            };


        }
        catch(error:any){

            return {

                isError:true,

                content:[{

                    type:"text",

                    text:error.message

                }]

            };

        }

    }

);





server.tool(

    "security_audit_graph",

    "Runs OSV vulnerability analysis and attack path mapping.",

    {
        lockfilePath:
            z.string().optional()
    },


    async({lockfilePath})=>{


        try{


            const result =
                await runFullSecurityAudit(
                    lockfilePath
                );


            return {

                content:[{

                    type:"text",

                    text:
                        JSON.stringify(
                            result,
                            null,
                            2
                        )

                }]

            };


        }
        catch(error:any){

            return {

                isError:true,

                content:[{

                    type:"text",

                    text:error.message

                }]

            };

        }


    }

);





server.tool(

    "open_dependency_visualizer",

    "Launches 3D dependency security galaxy.",

    {
        focus:z.string().optional()
    },


    async({focus})=>{


        let url =
            process.env.VISUALIZER_URL ||
            "http://localhost:3000";


        if(focus){

            url +=
                `?focus=${encodeURIComponent(focus)}`;

        }



        return {

            content:[{

                type:"text",

                text:
                    `3D Security Galaxy:
${url}`

            }]

        };


    }

);





async function main(){


    const app =
        express();


    app.use(cors());

    app.use(express.json());


    app.use("/api",apiRouter);



    const __dirname =
        path.dirname(
            fileURLToPath(import.meta.url)
        );


    const uiDistPath = path.resolve(
      process.cwd(),
      "ui",
      "dist"
    );



    if(fs.existsSync(uiDistPath)){


        app.use(
            express.static(uiDistPath)
        );



        app.get(
            "/{*splat}",
            (req,res)=>{

                res.sendFile(
                    path.join(
                        uiDistPath,
                        "index.html"
                    )
                );

            }
        );


    }




    const PORT =
        Number(process.env.PORT) || 3000;



    const httpServer =
        app.listen(
            PORT,
            ()=>{

                console.error(
                    `Galaxy API running on ${PORT}`
                );

            }
        );




    const transport =
        new StdioServerTransport();


    await server.connect(
        transport
    );



    console.error(
        "Blast Radius MCP Server running"
    );



    process.on(
        "SIGINT",
        ()=>{

            httpServer.close();

            process.exit(0);

        }
    );


    process.on(
        "SIGTERM",
        ()=>{

            httpServer.close();

            process.exit(0);

        }
    );


}



main();