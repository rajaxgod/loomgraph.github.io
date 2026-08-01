import React, { useState } from 'react';
import { LoomGraphView, LoomTimelineView } from '@loomgraph/react';
import type { LoomGraph, LoomTimelineEvent } from '@loomgraph/core';

const dummyGraph: LoomGraph = {
  nodes: [
    { id: '1', data: { label: 'Node 1' } },
    { id: '2', data: { label: 'Node 2' } }
  ],
  edges: [
    { id: 'e1', source: '1', target: '2' }
  ]
};

const handleLoomLog = (level: string, message: string, data?: any) => {
  const envLevel = (import.meta as any).env?.VITE_LOG_LEVEL || 'warn';
  if (envLevel === 'verbose' || level === 'error' || level === 'warn') {
    if (level === 'error') console.error(`[Loomgraph] ${message}`, data || '');
    else if (level === 'warn') console.warn(`[Loomgraph] ${message}`, data || '');
    else console.log(`[Loomgraph] ${message}`, data || '');
  }
};

const dummyEvents: LoomTimelineEvent[] = [
  { id: 't1', dateStart: 1000, lane: 'Third Age', data: { title: 'Sauron returns' }, confidence: 'exact' },
  { id: 't2', dateStart: 2941, lane: 'Third Age', data: { title: 'The Hobbit' }, confidence: 'exact' },
  { id: 't3', dateStart: 3018, lane: 'Third Age', data: { title: 'War of the Ring' }, confidence: 'exact' },
  { id: 't4', dateStart: 500, lane: 'Second Age', data: { title: 'Rings Forged' }, confidence: 'disputed' },
];

function App() {
  const [mode, setMode] = useState<'deepWork' | 'review'>('deepWork');

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#151417', color: '#E8E3D6', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header / Mode Switcher */}
      <div style={{ height: '50px', borderBottom: '1px solid #4A473E', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 'bold' }}>Lore Architect</h1>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => setMode('deepWork')} style={{ background: 'transparent', color: '#fff', border: 'none', borderBottom: mode === 'deepWork' ? '2px solid var(--loom-seal, #A23B2E)' : '2px solid transparent', padding: '4px 2px', cursor: 'pointer', fontFamily: 'var(--loom-font-ui, Inter, sans-serif)', fontSize: '14px', fontWeight: 500 }}>Deep Work</button>
          <button onClick={() => setMode('review')} style={{ background: 'transparent', color: '#fff', border: 'none', borderBottom: mode === 'review' ? '2px solid var(--loom-seal, #A23B2E)' : '2px solid transparent', padding: '4px 2px', cursor: 'pointer', fontFamily: 'var(--loom-font-ui, Inter, sans-serif)', fontSize: '14px', fontWeight: 500 }}>Review</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Manuscript Editor (Deep Work mode) */}
        {mode === 'deepWork' && (
          <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Chapter 1: The Shadow</h2>
            <p style={{ lineHeight: '1.6', maxWidth: '600px', color: '#E8E3D6' }}>
              The sky over the eastern mountains had grown dark, not with storm clouds, but with a lingering ash that blotted out the sun...
            </p>
          </div>
        )}

        {/* Graph Codex */}
        <div style={{ flex: mode === 'deepWork' ? '0 0 500px' : 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #4A473E', backgroundColor: '#EDE6D6' }}>
          
          <div style={{ flex: 1, position: 'relative' }}>
            {/* The actual graph renderer */}
            <LoomGraphView graph={dummyGraph} width={mode === 'deepWork' ? 500 : window.innerWidth} height={window.innerHeight - 250} onLog={handleLoomLog as any} />
            
            {/* Reference Sidebar Overlay */}
            <div style={{ position: 'absolute', top: 20, right: 20, width: '250px', backgroundColor: '#DED4BD', border: '1px solid #4A473E', padding: '16px', borderRadius: '6px', color: '#1B1A17', boxShadow: '0 4px 12px rgba(27, 26, 23, 0.15)' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', borderBottom: '1px solid #4A473E', paddingBottom: '4px' }}>Entity Reference</h3>
              <p style={{ fontSize: '12px', color: '#4A473E' }}>Select a node in the graph to view details here.</p>
            </div>
          </div>

          <div style={{ height: '200px', borderTop: '2px solid #4A473E' }}>
             <LoomTimelineView events={dummyEvents} width={mode === 'deepWork' ? 500 : window.innerWidth} height={200} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
