import { useState, useEffect } from 'react';
import GalaxyGraph from './components/GalaxyGraph';
import { Shield, Layers, Server, AlertTriangle } from 'lucide-react';

function App() {
    const [graphData, setGraphData] = useState<any>(null);
    const [auditData, setAuditData] = useState<any>(null);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [focusId, setFocusId] = useState<string | null>(null);

    const [layers, setLayers] = useState({
        production: true,
        transitive: true,
        vulnerabilities: true,
    });

    useEffect(() => {
        // Fetch Graph Data
        fetch('/api/graph')
            .then(res => res.json())
            .then(data => {
                // Ensure data is formatted for 3d-force-graph (nodes, links)
                setGraphData({ nodes: data.nodes, links: data.edges });
            })
            .catch(err => console.error(err));

        // Fetch Audit Data
        fetch('/api/audit')
            .then(res => res.json())
            .then(data => setAuditData(data))
            .catch(err => console.error(err));

        // Handle URL params for deep linking
        const params = new URLSearchParams(window.location.search);
        const focus = params.get('focus');
        if (focus) {
            setFocusId(focus);
            setTimeout(() => setFocusId(null), 5000); // Clear after focus
        }
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#050505', color: 'white', fontFamily: 'sans-serif' }}>
            {/* Header Overlay */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '15px 20px', borderRadius: 8, border: '1px solid #333' }}>
                <h1 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield size={20} color="#ff3333" /> Blast Radius
                </h1>
                {auditData && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 15, fontSize: '0.9rem', color: '#aaa' }}>
                        <span>Critical: <strong style={{ color: '#ff3333' }}>{auditData.summary.critical}</strong></span>
                        <span>High: <strong style={{ color: '#ff8833' }}>{auditData.summary.high}</strong></span>
                    </div>
                )}
            </div>

            {/* Controls Overlay */}
            <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '15px', borderRadius: 8, border: '1px solid #333' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 5 }}><Layers size={16} /> Layers</h3>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={layers.production} onChange={e => setLayers(l => ({ ...l, production: e.target.checked }))} /> Direct Dependencies
                </label>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={layers.transitive} onChange={e => setLayers(l => ({ ...l, transitive: e.target.checked }))} /> Transitive Dependencies
                </label>
                <label style={{ display: 'block', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={layers.vulnerabilities} onChange={e => setLayers(l => ({ ...l, vulnerabilities: e.target.checked }))} /> Vulnerabilities
                </label>
            </div>

            {/* Side Panel */}
            {selectedNode && (
                <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, width: 350, background: 'rgba(10,10,10,0.85)', padding: '20px', borderRadius: 8, border: '1px solid #333', backdropFilter: 'blur(5px)' }}>
                    <h2 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Server size={18} /> {selectedNode.name}
                    </h2>
                    <p style={{ margin: '0 0 15px 0', color: '#888', fontSize: '0.85rem' }}>Version: {selectedNode.version}</p>
                    
                    <div style={{ background: '#111', padding: '10px', borderRadius: 6, marginBottom: 15 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>Risk Score</span>
                            <strong style={{ color: selectedNode.riskScore > 0 ? '#ff3333' : '#4488ff' }}>{selectedNode.riskScore || 0}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>Layer</span>
                            <strong style={{ color: '#ccc' }}>Depth {selectedNode.layer}</strong>
                        </div>
                    </div>

                    {selectedNode.vulnerabilityDetails && (
                        <div>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#ff3333', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <AlertTriangle size={16} /> Vulnerability Profile
                            </h3>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                {selectedNode.vulnerabilityDetails.summary}
                            </p>
                            <span style={{ display: 'inline-block', background: '#ff333333', color: '#ff3333', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold' }}>
                                {selectedNode.vulnerabilityDetails.severity}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* 3D Force Graph */}
            {graphData ? (
                <GalaxyGraph 
                    data={graphData} 
                    selectedNodeId={focusId} 
                    onNodeClick={setSelectedNode} 
                    layers={layers}
                />
            ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <p>Loading Security Galaxy...</p>
                </div>
            )}
        </div>
    );
}

export default App;
