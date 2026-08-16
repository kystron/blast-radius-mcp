import { useState, useEffect } from "react";
import GalaxyGraph from "./components/GalaxyGraph";

import {
    Shield,
    Layers,
    Server,
    AlertTriangle
} from "lucide-react";



interface GraphData {

    nodes:any[];

    edges:any[];

}




function App() {


    const [graphData,setGraphData] =
        useState<GraphData | null>(null);



    const [auditData,setAuditData] =
        useState<any>(null);



    const [selectedNode,setSelectedNode] =
        useState<any>(null);



    const [focusId,setFocusId] =
        useState<string | null>(null);




    const [layers,setLayers] =
        useState({

            production:true,

            transitive:true,

            vulnerabilities:true

        });






    useEffect(()=>{


        /*
            Load dependency graph
        */

        fetch("/api/graph")

            .then(res=>res.json())

            .then(data=>{


                setGraphData({

                    nodes:data.nodes,

                    edges:data.edges

                });


            })

            .catch(console.error);






        /*
            Load security audit
        */

        fetch("/api/audit")

            .then(res=>res.json())

            .then(data=>{

                setAuditData(data);

            })

            .catch(console.error);







        /*
            Deep linking

            Example:

            localhost:3000?focus=lodash@4.17.21

        */

        const params =
            new URLSearchParams(
                window.location.search
            );


        const focus =
            params.get("focus");


        if(focus){

            setFocusId(focus);

        }



    }, []);







    return (

<div
style={{
    width:"100vw",
    height:"100vh",
    overflow:"hidden",
    background:"#050505",
    color:"white",
    fontFamily:"sans-serif"
}}
>



{/* Header */}

<div
style={{
    position:"absolute",
    top:20,
    left:20,
    zIndex:10,
    background:"rgba(0,0,0,0.7)",
    padding:"15px 20px",
    borderRadius:8,
    border:"1px solid #333"
}}
>


<h1
style={{
    margin:0,
    fontSize:"1.2rem",
    display:"flex",
    alignItems:"center",
    gap:10
}}
>

<Shield size={20} color="#ff3333"/>

Blast Radius

</h1>



{
auditData &&

<div
style={{
    marginTop:10,
    display:"flex",
    gap:15,
    fontSize:"0.9rem",
    color:"#aaa"
}}
>


<span>

Critical:

<strong style={{color:"#ff3333"}}>

{auditData.summary.critical}

</strong>

</span>



<span>

High:

<strong style={{color:"#ff8833"}}>

{auditData.summary.high}

</strong>

</span>


</div>

}


</div>








{/* Layer Controls */}

<div
style={{
    position:"absolute",
    bottom:20,
    left:20,
    zIndex:10,
    background:"rgba(0,0,0,0.7)",
    padding:15,
    borderRadius:8,
    border:"1px solid #333"
}}
>


<h3
style={{
    margin:"0 0 10px 0",
    fontSize:"0.9rem",
    display:"flex",
    alignItems:"center",
    gap:5
}}
>

<Layers size={16}/>

Layers

</h3>




<label>

<input

type="checkbox"

checked={layers.production}

onChange={
e=>
setLayers(
l=>({
    ...l,
    production:e.target.checked
})
)
}

/>

Direct Dependencies

</label>




<br/>




<label>

<input

type="checkbox"

checked={layers.transitive}

onChange={
e=>
setLayers(
l=>({
    ...l,
    transitive:e.target.checked
})
)
}

/>

Transitive Dependencies

</label>




<br/>




<label>

<input

type="checkbox"

checked={layers.vulnerabilities}

onChange={
e=>
setLayers(
l=>({
    ...l,
    vulnerabilities:e.target.checked
})
)
}

/>

Vulnerabilities

</label>



</div>








{/* Side Panel */}

{
selectedNode &&


<div

style={{

position:"absolute",

top:20,

right:20,

zIndex:10,

width:350,

background:"rgba(10,10,10,0.85)",

padding:20,

borderRadius:8,

border:"1px solid #333",

backdropFilter:"blur(5px)"

}}

>



<h2
style={{
margin:"0 0 10px",
fontSize:"1.1rem",
display:"flex",
alignItems:"center",
gap:8
}}
>

<Server size={18}/>

{selectedNode.name}

</h2>



<p
style={{
color:"#888",
fontSize:"0.85rem"
}}
>

Version:

{selectedNode.version}

</p>






<div
style={{
background:"#111",
padding:10,
borderRadius:6
}}
>


<div>

Risk Score:

<strong>

{selectedNode.riskScore || 0}

</strong>

</div>



<div>

Layer:

<strong>

Depth {selectedNode.layer}

</strong>

</div>



</div>








{
selectedNode.vulnerabilityDetails &&


<div>


<h3
style={{
color:"#ff3333",
display:"flex",
alignItems:"center",
gap:5
}}
>

<AlertTriangle size={16}/>

Vulnerability

</h3>



<p>

{
selectedNode.vulnerabilityDetails.summary
}

</p>



<p
style={{
fontSize:"0.8rem",
color:"#aaa"
}}
>

ID:

{
selectedNode.vulnerabilityDetails.id
}

</p>



<span
style={{
color:"#ff3333",
fontWeight:"bold"
}}
>

{
selectedNode.vulnerabilityDetails.severity
}

</span>



</div>


}



</div>

}








{/* Galaxy */}

{
graphData ?


<GalaxyGraph

data={graphData}

selectedNodeId={focusId}

onNodeClick={
(node)=>{

setSelectedNode(node);

setFocusId(node.id);

}

}

layers={layers}

/>


:

<div style={{ height:"100%", display:"flex",alignItems:"center", justifyContent:"center"}}> Loading Security Galaxy... </div>


}



</div>

);


}



export default App;