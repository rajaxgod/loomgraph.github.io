export interface LoomNode {
  id: string;
  data: Record<string, unknown>;
  groupKey?: string;
  position?: { x: number; y: number };
  pinned?: boolean;
}

export interface LoomEdge {
  id: string;
  source: string;
  target: string;
  data?: Record<string, unknown>;
  weight?: number;
}

export interface LoomGraph {
  nodes: LoomNode[];
  edges: LoomEdge[];
}

export interface LoomTimelineEvent {
  id: string;
  dateStart: number | string | Date; // Can be a timestamp, ISO string, or Date object. The engine should normalize this.
  dateEnd?: number | string | Date;
  confidence?: 'exact' | 'circa' | 'disputed'; // mapped from PRD FR-9
  lane?: string;
  data?: Record<string, unknown>;
}
