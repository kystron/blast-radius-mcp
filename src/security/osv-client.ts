import * as fs from "fs";
import * as path from "path";
import { Vulnerability, Severity } from "../graph/types.js";


export interface OsvQuery {

    package: {

        name: string;

        ecosystem: string;

    };

    version: string;

}



interface CacheData {

    version: number;

    updated: string;

    entries: Record<string, Vulnerability[]>;

    details: Record<string, any>;

}



const CACHE_FILE =
    path.join(
        process.cwd(),
        ".vulnerability-cache.json"
    );


const CACHE_VERSION = 1;



const CACHE_TTL =
    24 * 60 * 60 * 1000;



function createPackageCacheKey(
    query: OsvQuery
): string {

    return `${query.package.ecosystem}:${query.package.name}@${query.version}`;

}



function loadCache(): CacheData {


    if(fs.existsSync(CACHE_FILE)){


        try {


            const data =
                JSON.parse(
                    fs.readFileSync(
                        CACHE_FILE,
                        "utf-8"
                    )
                );


            if(
                data.version === CACHE_VERSION
            ){

                const age =
                    Date.now()
                    -
                    new Date(
                        data.updated
                    ).getTime();



                if(age < CACHE_TTL){

                    return {

                        version:CACHE_VERSION,

                        updated:data.updated,

                        entries:data.entries || {},

                        details:data.details || {}

                    };

                }

            }


        }
        catch {

            // Ignore corrupted cache

        }

    }



    return {

        version:CACHE_VERSION,

        updated:
            new Date()
            .toISOString(),

        entries:{},

        details:{}

    };

}




function saveCache(
    cache:CacheData
):void {


    cache.updated =
        new Date()
        .toISOString();



    fs.writeFileSync(

        CACHE_FILE,

        JSON.stringify(
            cache,
            null,
            2
        ),

        "utf-8"

    );

}




function calculateSeverity(
    vuln:any
):Severity {


    const severity =
        vuln.database_specific?.severity;



    if(severity){


        const value =
            severity
            .toUpperCase();



        if(value === "MODERATE"){
            return "MEDIUM";
        }


        if(
            [
                "CRITICAL",
                "HIGH",
                "MEDIUM",
                "LOW"
            ]
            .includes(value)
        ){

            return value as Severity;

        }

    }



    // CVSS fallback

    const cvss =
        vuln.severity?.[0]?.score;



    if(typeof cvss === "number"){

        if(cvss >= 9){
            return "CRITICAL";
        }

        if(cvss >= 7){
            return "HIGH";
        }

        if(cvss >= 4){
            return "MEDIUM";
        }

        return "LOW";

    }



    return "UNKNOWN";

}





async function fetchVulnerabilityDetails(
    id:string,
    cache:CacheData
):Promise<any|null>{


    if(cache.details[id]){

        return cache.details[id];

    }



    const response =
        await fetch(
            `https://api.osv.dev/v1/vulns/${id}`
        );



    if(!response.ok){

        return null;

    }



    const data =
        await response.json();



    cache.details[id] =
        data;



    return data;

}





export async function queryOsvBatch(
    queries: OsvQuery[]
): Promise<Vulnerability[][]> {


    const results:
        Vulnerability[][] =
        new Array(
            queries.length
        )
        .fill(null)
        .map(() => []);



    const cache =
        loadCache();



    const pending:
        {
            query:OsvQuery;
            index:number;
        }[] = [];




    for(
        let i=0;
        i<queries.length;
        i++
    ){


        const query =
            queries[i];


        const key =
            createPackageCacheKey(
                query
            );



        if(cache.entries[key]){

            results[i] =
                cache.entries[key];

        }
        else{

            pending.push({

                query,

                index:i

            });

        }

    }




    if(pending.length === 0){

        return results;

    }




    const CHUNK_SIZE = 1000;



    let cacheChanged = false;




    for(
        let i=0;
        i<pending.length;
        i += CHUNK_SIZE
    ){



        const chunk =
            pending.slice(
                i,
                i + CHUNK_SIZE
            );



        const response =
            await fetch(
                "https://api.osv.dev/v1/querybatch",
                {

                    method:"POST",

                    headers:{

                        "Content-Type":
                            "application/json"

                    },

                    body:JSON.stringify({

                        queries:
                            chunk.map(
                                x=>x.query
                            )

                    })

                }
            );




        if(!response.ok){

            throw new Error(
                `OSV API error: ${response.statusText}`
            );

        }




        const data =
            await response.json() as any;



        const batchResults =
            data.results || [];





        for(
            let j=0;
            j<batchResults.length;
            j++
        ){



            const osvResult =
                batchResults[j];



            const original =
                chunk[j];



            const vulnerabilities:
                Vulnerability[] = [];




            if(osvResult.vulns){



                for(
                    const item of osvResult.vulns
                ){



                    const detail =
                        await fetchVulnerabilityDetails(
                            item.id,
                            cache
                        );



                    if(!detail){
                        continue;
                    }




                    vulnerabilities.push({

                        id:
                            detail.id,


                        severity:
                            calculateSeverity(
                                detail
                            ),


                        summary:
                            detail.summary ||
                            detail.details ||
                            "No description provided.",


                        affectedRange:
                            detail.affected
                                ? JSON.stringify(
                                    detail.affected
                                  )
                                : undefined,


                        references:
                            detail.references
                                ?.map(
                                    (r:any)=>r.url
                                )
                                || []

                    });


                }

            }




            const key =
                createPackageCacheKey(
                    original.query
                );



            results[original.index] =
                vulnerabilities;



            cache.entries[key] =
                vulnerabilities;



            cacheChanged = true;

        }

    }



    if(cacheChanged){

        saveCache(cache);

    }



    return results;

}