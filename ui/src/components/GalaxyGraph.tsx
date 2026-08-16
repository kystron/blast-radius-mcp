import { useEffect, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';

interface GraphData {
    nodes: any[];
    links: any[];
}

export default function GalaxyGraph({ data, selectedNodeId, onNodeClick, layers }: { data: GraphData, selectedNodeId: string | null, onNodeClick: (node: any) => void, layers: any }) {
    const fgRef = useRef<any>();
    const [filteredData, setFilteredData] = useState<GraphData>({ nodes: [], links: [] });

    // Filter nodes based on active layers
    useEffect(() => {
        if (!data || !data.nodes) return;
        
        const nodes = data.nodes.filter(n => {
            if (n.type === 'root') return true;
            if (n.type === 'direct' && layers.production) return true;
            if (n.type === 'standard' && layers.transitive) return true;
            if (n.type === 'vulnerable' && layers.vulnerabilities) return true;
            return false;
        });
        
        const nodeIds = new Set(nodes.map(n => n.id));
        const links = data.links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

        setFilteredData({ nodes, links });
    }, [data, layers]);

    // Handle focus from URL
    useEffect(() => {
        if (selectedNodeId && fgRef.current && filteredData.nodes.length > 0) {
            const node = filteredData.nodes.find(n => n.id === selectedNodeId);
            if (node) {
                // Focus camera on node
                const distance = 150;
                const distRatio = 1 + distance/Math.hypot(node.x || 0, node.y || 0, node.z || 0);
                fgRef.current.cameraPosition(
                    { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                    node,
                    3000 // ms transition duration
                );
            }
        }
    }, [selectedNodeId, filteredData.nodes]);

    return (
        <ForceGraph3D
            ref={fgRef}
            graphData={filteredData}
            nodeLabel="id"
            nodeColor={(node: any) => {
                if (node.id === selectedNodeId) return '#ffffff';
                if (node.type === 'root') return '#ffd700'; // Gold
                if (node.type === 'vulnerable') return '#ff3333'; // Red
                if (node.type === 'direct') return '#4488ff'; // Blue
                return '#888888'; // Grey for transitive
            }}
            nodeRelSize={4}
            nodeVal={(node: any) => {
                if (node.type === 'root') return 20;
                if (node.type === 'vulnerable') return 15;
                if (node.type === 'direct') return 10;
                return 5;
            }}
            linkWidth={(link: any) => link.type === 'attack' ? 2 : 0.5}
            linkColor={(link: any) => link.type === 'attack' ? '#ff0000' : '#444444'}
            linkDirectionalParticles={(link: any) => link.type === 'attack' ? 4 : 0}
            linkDirectionalParticleWidth={2}
            backgroundColor="#050505"
            onNodeClick={(node) => {
                onNodeClick(node);
                const distance = 150;
                const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
                fgRef.current?.cameraPosition(
                    { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                    node,
                    2000
                );
            }}
        />
    );
}
