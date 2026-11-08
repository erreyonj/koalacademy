export interface TraceNode {
  id: string;
  x: number;
  y: number;
}

export type TraceEdge = readonly [string, string];

export interface TraceFigure {
  id: string;
  title: string;
  componentName: string;
  nodes: readonly TraceNode[];
  edges: readonly TraceEdge[];
}

export interface TraceState {
  currentNodeId: string | null;
  nodePath: readonly string[];
  usedEdgeIndices: readonly number[];
}

export function edgeKey(a: string, b: string): string {
  return a < b ? `${a}--${b}` : `${b}--${a}`;
}

export function createTraceState(): TraceState {
  return {
    currentNodeId: null,
    nodePath: [],
    usedEdgeIndices: [],
  };
}

/**
 * Compute vertex degrees for every node in the figure.
 */
export function degrees(figure: TraceFigure): Record<string, number> {
  const result: Record<string, number> = {};
  for (const node of figure.nodes) {
    result[node.id] = 0;
  }
  for (const [a, b] of figure.edges) {
    result[a] = (result[a] ?? 0) + 1;
    result[b] = (result[b] ?? 0) + 1;
  }
  return result;
}

/**
 * Valid starting nodes for a one-line Eulerian trace:
 * - If the graph has odd-degree vertices, you must start on one of the odd-degree vertices.
 * - If all vertices have even degree, any non-isolated vertex is a valid start.
 */
export function validStartNodes(figure: TraceFigure): string[] {
  const deg = degrees(figure);
  const oddNodes = figure.nodes
    .filter((node) => (deg[node.id] ?? 0) % 2 === 1)
    .map((node) => node.id);

  if (oddNodes.length > 0) {
    return oddNodes;
  }

  return figure.nodes
    .filter((node) => (deg[node.id] ?? 0) > 0)
    .map((node) => node.id);
}

/**
 * Verify that the figure has a valid one-line trace (Eulerian path or circuit):
 * - At least 1 edge
 * - All endpoints exist in figure.nodes, no self-loops, no duplicate undirected edges
 * - All non-isolated vertices belong to a single connected component
 * - Exactly 0 or 2 vertices have odd degree
 */
export function isEulerian(figure: TraceFigure): boolean {
  if (figure.edges.length === 0 || figure.nodes.length < 2) {
    return false;
  }

  const nodeIds = new Set(figure.nodes.map((n) => n.id));
  if (nodeIds.size !== figure.nodes.length) {
    return false;
  }

  const seenEdges = new Set<string>();
  const adjacency = new Map<string, Set<string>>();
  for (const id of nodeIds) {
    adjacency.set(id, new Set());
  }

  for (const [a, b] of figure.edges) {
    if (!nodeIds.has(a) || !nodeIds.has(b) || a === b) {
      return false;
    }
    const key = edgeKey(a, b);
    if (seenEdges.has(key)) {
      return false;
    }
    seenEdges.add(key);
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  }

  const deg = degrees(figure);
  const activeNodes = figure.nodes
    .map((n) => n.id)
    .filter((id) => (deg[id] ?? 0) > 0);

  if (activeNodes.length !== figure.nodes.length) {
    return false;
  }

  // BFS connectivity check across all nodes
  const visited = new Set<string>([activeNodes[0]]);
  const queue: string[] = [activeNodes[0]];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const next of adjacency.get(curr) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  if (visited.size !== activeNodes.length) {
    return false;
  }

  const oddCount = activeNodes.filter((id) => deg[id] % 2 === 1).length;
  return oddCount === 0 || oddCount === 2;
}

/**
 * Find the index of an unused edge connecting `fromId` and `toId`, or -1 if none.
 */
export function findUnusedEdgeIndex(
  figure: TraceFigure,
  state: TraceState,
  fromId: string,
  toId: string,
): number {
  const used = new Set(state.usedEdgeIndices);
  for (let idx = 0; idx < figure.edges.length; idx++) {
    if (used.has(idx)) continue;
    const [a, b] = figure.edges[idx];
    if ((a === fromId && b === toId) || (a === toId && b === fromId)) {
      return idx;
    }
  }
  return -1;
}

/**
 * Return all neighbor node IDs reachable from `state.currentNodeId` via an unused edge.
 */
export function availableNeighbors(
  figure: TraceFigure,
  state: TraceState,
): string[] {
  if (state.currentNodeId === null) {
    return figure.nodes.map((n) => n.id);
  }

  const used = new Set(state.usedEdgeIndices);
  const neighbors: string[] = [];
  for (let idx = 0; idx < figure.edges.length; idx++) {
    if (used.has(idx)) continue;
    const [a, b] = figure.edges[idx];
    if (a === state.currentNodeId) {
      neighbors.push(b);
    } else if (b === state.currentNodeId) {
      neighbors.push(a);
    }
  }
  return neighbors;
}

/**
 * Step the trace to `nodeId`:
 * - If no start node has been picked yet, selects `nodeId` as the start node.
 * - Otherwise, traverses the unused edge between `currentNodeId` and `nodeId`.
 * - Rejects non-adjacent or already-used edges by returning `state` unchanged.
 */
export function extendTrace(
  figure: TraceFigure,
  state: TraceState,
  nodeId: string,
): TraceState {
  const exists = figure.nodes.some((n) => n.id === nodeId);
  if (!exists) return state;

  if (state.currentNodeId === null) {
    return {
      currentNodeId: nodeId,
      nodePath: [nodeId],
      usedEdgeIndices: [],
    };
  }

  if (state.currentNodeId === nodeId) {
    return state;
  }

  const edgeIdx = findUnusedEdgeIndex(
    figure,
    state,
    state.currentNodeId,
    nodeId,
  );
  if (edgeIdx === -1) {
    return state;
  }

  return {
    currentNodeId: nodeId,
    nodePath: [...state.nodePath, nodeId],
    usedEdgeIndices: [...state.usedEdgeIndices, edgeIdx],
  };
}

export function isComplete(figure: TraceFigure, state: TraceState): boolean {
  return (
    figure.edges.length > 0 &&
    state.usedEdgeIndices.length === figure.edges.length
  );
}

export function isStuck(figure: TraceFigure, state: TraceState): boolean {
  if (state.currentNodeId === null) return false;
  if (isComplete(figure, state)) return false;
  return availableNeighbors(figure, state).length === 0;
}

/**
 * Find a valid Eulerian node path of length `edges.length + 1` for a figure.
 */
export function findEulerianPath(figure: TraceFigure): string[] | null {
  if (!isEulerian(figure)) return null;
  const starts = validStartNodes(figure);

  function dfs(state: TraceState): string[] | null {
    if (isComplete(figure, state)) {
      return [...state.nodePath];
    }
    for (const nextId of availableNeighbors(figure, state)) {
      const nextState = extendTrace(figure, state, nextId);
      const solved = dfs(nextState);
      if (solved) return solved;
    }
    return null;
  }

  for (const startId of starts) {
    const initial = extendTrace(figure, createTraceState(), startId);
    const solved = dfs(initial);
    if (solved) return solved;
  }

  return null;
}
