import React from 'react';
import { LoomGraphView } from '@loomgraph/react';
import type { LoomGraph } from '@loomgraph/core';

const dummyGraph: LoomGraph = {
  nodes: [
    { id: '1', data: { label: 'Lord Varyn' } },
    { id: '2', data: { label: 'King Aerys' } },
    { id: '3', data: { label: 'The Citadel' } },
    { id: '4', data: { label: 'The Wall' } },
    { id: '5', data: { label: 'Jon Snow' } },
  ],
  edges: [
    { id: 'e1', source: '1', target: '2' },
    { id: 'e2', source: '2', target: '3' },
    { id: 'e3', source: '4', target: '5' },
    { id: 'e4', source: '1', target: '3' },
  ]
};

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
      <LoomGraphView graph={dummyGraph} width={800} height={600} />
    </div>
  );
}

export default App;
