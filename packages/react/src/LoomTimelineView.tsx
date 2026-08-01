import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { LoomTimelineEvent } from '@loomgraph/core';

export interface LoomTimelineViewProps {
  events: LoomTimelineEvent[];
  width?: number;
  height?: number;
  onEventClick?: (id: string) => void;
}

export const LoomTimelineView: React.FC<LoomTimelineViewProps> = ({ 
  events, 
  width = 800, 
  height = 200,
  onEventClick 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);

  // Group events by lane
  const lanes = useMemo(() => {
    const map = new Map<string, LoomTimelineEvent[]>();
    events.forEach(e => {
      const lane = e.lane || 'default';
      if (!map.has(lane)) map.set(lane, []);
      map.get(lane)!.push(e);
    });
    return Array.from(map.entries());
  }, [events]);

  // Determine time scale
  const { minTime, maxTime } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    events.forEach(e => {
      const d = typeof e.dateStart === 'number' ? e.dateStart : new Date(e.dateStart).getTime();
      if (d < min) min = d;
      if (d > max) max = d;
    });
    return { minTime: min === Infinity ? 0 : min, maxTime: max === -Infinity ? 100 : max };
  }, [events]);

  const timeSpan = maxTime - minTime || 1;
  const pixelsPerTime = (width * 2) / timeSpan; // Timeline is 2x width to allow scrolling

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollX(e.currentTarget.scrollLeft);
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        width,
        height,
        backgroundColor: 'var(--loom-paper, #EDE6D6)',
        overflowX: 'auto',
        overflowY: 'hidden',
        position: 'relative',
        borderTop: '1px solid var(--loom-ink-soft, #4A473E)'
      }}
    >
      <div style={{ width: width * 2, height: '100%', position: 'relative' }}>
        {lanes.map(([laneName, laneEvents], laneIdx) => {
          const laneHeight = height / lanes.length;
          const laneTop = laneIdx * laneHeight;

          return (
            <div key={laneName} style={{ position: 'absolute', top: laneTop, width: '100%', height: laneHeight }}>
              {/* Lane line */}
              <div style={{ position: 'absolute', top: '50%', width: '100%', height: '1px', backgroundColor: 'var(--loom-ink-soft, #4A473E)', opacity: 0.3 }} />
              
              {/* Lane Label */}
              <div style={{ position: 'absolute', left: scrollX + 10, top: 4, fontSize: '10px', color: 'var(--loom-ink-soft, #4A473E)' }}>
                {laneName}
              </div>

              {/* Events */}
              {laneEvents.map(e => {
                const d = typeof e.dateStart === 'number' ? e.dateStart : new Date(e.dateStart).getTime();
                const x = (d - minTime) * pixelsPerTime;
                
                // Virtualization: only render if roughly in view
                if (x < scrollX - 100 || x > scrollX + width + 100) return null;

                const isDisputed = e.confidence === 'disputed';

                return (
                  <div
                    key={e.id}
                    onClick={() => onEventClick?.(e.id)}
                    style={{
                      position: 'absolute',
                      left: x,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: isDisputed ? 'var(--loom-gold, #9C7A3C)' : 'var(--loom-ink, #1B1A17)',
                      boxShadow: isDisputed ? '0 0 6px 2px rgba(156, 122, 60, 0.6)' : 'none',
                      cursor: 'pointer'
                    }}
                    title={e.data?.title as string || e.id}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
