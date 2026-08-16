import { useEffect, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";


interface GraphData {
    nodes: any[];
    links?: any[];
    edges?: any[];
}


interface FilteredData {
    nodes: any[];
    links: any[];
}


interface Props {
    data: GraphData;
    selectedNodeId: string | null;
    onNodeClick: (node: any) => void;
    layers: {
        production: boolean;
        transitive: boolean;
        vulnerabilities: boolean;
    };
}



export default function GalaxyGraph({
    data,
    selectedNodeId,
    onNodeClick,
    layers
}: Props) {


    const fgRef = useRef<any>(null);


    const [filteredData, setFilteredData] =
        useState<FilteredData>({
            nodes: [],
            links: []
        });



    useEffect(() => {

        if (!data || !data.nodes) return;


        const nodes = data.nodes.filter((node) => {

            if (node.type === "root")
                return true;


            if (
                node.type === "direct" &&
                layers.production
            )
                return true;


            if (
                node.type === "standard" &&
                layers.transitive
            )
                return true;


            if (
                node.type === "vulnerable" &&
                layers.vulnerabilities
            )
                return true;


            return false;

        });



        const nodeIds =
            new Set(
                nodes.map(node => node.id)
            );



        const links =
            (data.edges || data.links || [])
            .map((edge:any)=>{

                const source =
                    typeof edge.source === "object"
                    ? edge.source.id
                    : edge.source;


                const target =
                    typeof edge.target === "object"
                    ? edge.target.id
                    : edge.target;



                return {
                    source,
                    target,
                    type: edge.type || "dependency",
                    constraint: edge.constraint
                };

            })
            .filter((edge:any)=>
                nodeIds.has(edge.source) &&
                nodeIds.has(edge.target)
            );



        console.log(
            "Galaxy Nodes:",
            nodes.length,
            "Links:",
            links.length
        );



        setFilteredData({
            nodes,
            links
        });


    }, [
        data,
        layers
    ]);





    // Auto fit camera after loading

    useEffect(()=>{

        if(
            fgRef.current &&
            filteredData.nodes.length > 0
        ){

            setTimeout(()=>{

                fgRef.current.zoomToFit(
                    1000,
                    150
                );

            },500);

        }

    },[
        filteredData
    ]);





    // Focus selected node

    useEffect(()=>{


        if(
            !selectedNodeId ||
            !fgRef.current
        )
            return;



        const node =
            filteredData.nodes.find(
                n=>n.id === selectedNodeId
            );


        if(!node)
            return;



        const distance = 180;


        const distRatio =
            1 +
            distance /
            Math.hypot(
                node.x || 0,
                node.y || 0,
                node.z || 0
            );



        fgRef.current.cameraPosition(

            {
                x:(node.x || 0) * distRatio,
                y:(node.y || 0) * distRatio,
                z:(node.z || 0) * distRatio
            },

            node,

            3000
        );


    },[
        selectedNodeId,
        filteredData
    ]);






    return (

        <ForceGraph3D

            ref={fgRef}

            graphData={filteredData}


            cooldownTicks={100}

            warmupTicks={100}

            enableNodeDrag={true}

            showNavInfo={true}


            nodeLabel={(node:any)=>
                `${node.name}@${node.version}`
            }



            nodeColor={(node:any)=>{

                if(node.id === selectedNodeId)
                    return "#ffffff";


                if(node.type === "root")
                    return "#ffd700";


                if(node.type === "vulnerable")
                    return "#ff3333";


                if(node.type === "direct")
                    return "#4488ff";


                return "#888888";

            }}



            nodeVal={(node:any)=>{

                if(node.type==="root")
                    return 25;


                if(node.type==="vulnerable")
                    return 18;


                if(node.type==="direct")
                    return 10;


                return 5;

            }}



            linkWidth={(link:any)=>
                link.type==="attack"
                ? 3
                : 0.5
            }



            linkColor={(link:any)=>
                link.type==="attack"
                ? "#ff0000"
                : "#444444"
            }



            linkDirectionalParticles={(link:any)=>
                link.type==="attack"
                ? 5
                : 0
            }



            linkDirectionalParticleWidth={2}


            backgroundColor="#050505"



            onNodeClick={(node:any)=>{


                if(!node)
                    return;


                onNodeClick(node);



                const distance = 180;


                const distRatio =
                    1 +
                    distance /
                    Math.hypot(
                        node.x || 0,
                        node.y || 0,
                        node.z || 0
                    );


                fgRef.current?.cameraPosition(

                    {
                        x:(node.x || 0) * distRatio,
                        y:(node.y || 0) * distRatio,
                        z:(node.z || 0) * distRatio
                    },

                    node,

                    2000
                );

            }}

        />

    );

}