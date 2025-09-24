import { Node, Edge } from '@/lib/api';

export interface SpatialBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SpatialNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: Node;
}

export interface SpatialEdge {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  data: Edge;
}

/**
 * Spatial index using a simple grid-based approach for fast spatial queries
 * Optimized for canvas rendering with thousands of nodes
 */
export class SpatialIndex {
  private gridSize: number;
  private nodeGrid: Map<string, Set<SpatialNode>>;
  private edgeGrid: Map<string, Set<SpatialEdge>>;
  private nodes: Map<string, SpatialNode>;
  private edges: Map<string, SpatialEdge>;
  private bounds: SpatialBounds;

  constructor(gridSize: number = 500) {
    this.gridSize = gridSize;
    this.nodeGrid = new Map();
    this.edgeGrid = new Map();
    this.nodes = new Map();
    this.edges = new Map();
    this.bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  /**
   * Get grid cell key for coordinates
   */
  private getGridKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    return `${gridX},${gridY}`;
  }

  /**
   * Get all grid cells that intersect with a rectangle
   */
  private getIntersectingCells(minX: number, minY: number, maxX: number, maxY: number): string[] {
    const cells: string[] = [];
    const startGridX = Math.floor(minX / this.gridSize);
    const endGridX = Math.floor(maxX / this.gridSize);
    const startGridY = Math.floor(minY / this.gridSize);
    const endGridY = Math.floor(maxY / this.gridSize);

    for (let gridX = startGridX; gridX <= endGridX; gridX++) {
      for (let gridY = startGridY; gridY <= endGridY; gridY++) {
        cells.push(`${gridX},${gridY}`);
      }
    }

    return cells;
  }

  /**
   * Add or update a node in the spatial index
   */
  addNode(node: Node, width: number = 240, height: number = 120): void {
    const spatialNode: SpatialNode = {
      id: node.id,
      x: node.x,
      y: node.y,
      width,
      height,
      data: node
    };

    // Remove existing node if it exists
    this.removeNode(node.id);

    // Add to nodes map
    this.nodes.set(node.id, spatialNode);

    // Add to grid cells
    const cells = this.getIntersectingCells(node.x, node.y, node.x + width, node.y + height);
    cells.forEach(cellKey => {
      if (!this.nodeGrid.has(cellKey)) {
        this.nodeGrid.set(cellKey, new Set());
      }
      this.nodeGrid.get(cellKey)!.add(spatialNode);
    });

    // Update bounds
    this.updateBounds(node.x, node.y, node.x + width, node.y + height);
  }

  /**
   * Remove a node from the spatial index
   */
  removeNode(nodeId: string): void {
    const existingNode = this.nodes.get(nodeId);
    if (!existingNode) return;

    // Remove from grid cells
    const cells = this.getIntersectingCells(
      existingNode.x, 
      existingNode.y, 
      existingNode.x + existingNode.width, 
      existingNode.y + existingNode.height
    );
    
    cells.forEach(cellKey => {
      const cellNodes = this.nodeGrid.get(cellKey);
      if (cellNodes) {
        cellNodes.delete(existingNode);
        if (cellNodes.size === 0) {
          this.nodeGrid.delete(cellKey);
        }
      }
    });

    // Remove from nodes map
    this.nodes.delete(nodeId);
  }

  /**
   * Add or update an edge in the spatial index
   */
  addEdge(edge: Edge, fromNode: Node, toNode: Node): void {
    const spatialEdge: SpatialEdge = {
      id: edge.id,
      fromX: fromNode.x + 120, // center of node
      fromY: fromNode.y + 60,
      toX: toNode.x + 120,
      toY: toNode.y + 60,
      data: edge
    };

    // Remove existing edge if it exists
    this.removeEdge(edge.id);

    // Add to edges map
    this.edges.set(edge.id, spatialEdge);

    // Add to grid cells (line bounding box)
    const minX = Math.min(spatialEdge.fromX, spatialEdge.toX);
    const minY = Math.min(spatialEdge.fromY, spatialEdge.toY);
    const maxX = Math.max(spatialEdge.fromX, spatialEdge.toX);
    const maxY = Math.max(spatialEdge.fromY, spatialEdge.toY);

    const cells = this.getIntersectingCells(minX, minY, maxX, maxY);
    cells.forEach(cellKey => {
      if (!this.edgeGrid.has(cellKey)) {
        this.edgeGrid.set(cellKey, new Set());
      }
      this.edgeGrid.get(cellKey)!.add(spatialEdge);
    });

    // Update bounds
    this.updateBounds(minX, minY, maxX, maxY);
  }

  /**
   * Remove an edge from the spatial index
   */
  removeEdge(edgeId: string): void {
    const existingEdge = this.edges.get(edgeId);
    if (!existingEdge) return;

    // Remove from grid cells
    const minX = Math.min(existingEdge.fromX, existingEdge.toX);
    const minY = Math.min(existingEdge.fromY, existingEdge.toY);
    const maxX = Math.max(existingEdge.fromX, existingEdge.toX);
    const maxY = Math.max(existingEdge.fromY, existingEdge.toY);

    const cells = this.getIntersectingCells(minX, minY, maxX, maxY);
    cells.forEach(cellKey => {
      const cellEdges = this.edgeGrid.get(cellKey);
      if (cellEdges) {
        cellEdges.delete(existingEdge);
        if (cellEdges.size === 0) {
          this.edgeGrid.delete(cellKey);
        }
      }
    });

    // Remove from edges map
    this.edges.delete(edgeId);
  }

  /**
   * Query nodes within a rectangular region
   */
  queryNodes(minX: number, minY: number, maxX: number, maxY: number): SpatialNode[] {
    const result: SpatialNode[] = [];
    const seen = new Set<string>();

    const cells = this.getIntersectingCells(minX, minY, maxX, maxY);
    
    cells.forEach(cellKey => {
      const cellNodes = this.nodeGrid.get(cellKey);
      if (cellNodes) {
        cellNodes.forEach(node => {
          if (!seen.has(node.id)) {
            // Check if node actually intersects with query rectangle
            if (!(node.x + node.width < minX || 
                  node.x > maxX || 
                  node.y + node.height < minY || 
                  node.y > maxY)) {
              result.push(node);
              seen.add(node.id);
            }
          }
        });
      }
    });

    return result;
  }

  /**
   * Query edges within a rectangular region
   */
  queryEdges(minX: number, minY: number, maxX: number, maxY: number): SpatialEdge[] {
    const result: SpatialEdge[] = [];
    const seen = new Set<string>();

    const cells = this.getIntersectingCells(minX, minY, maxX, maxY);
    
    cells.forEach(cellKey => {
      const cellEdges = this.edgeGrid.get(cellKey);
      if (cellEdges) {
        cellEdges.forEach(edge => {
          if (!seen.has(edge.id)) {
            // Check if edge line intersects with query rectangle
            const edgeMinX = Math.min(edge.fromX, edge.toX);
            const edgeMinY = Math.min(edge.fromY, edge.toY);
            const edgeMaxX = Math.max(edge.fromX, edge.toX);
            const edgeMaxY = Math.max(edge.fromY, edge.toY);

            if (!(edgeMaxX < minX || edgeMinX > maxX || edgeMaxY < minY || edgeMinY > maxY)) {
              result.push(edge);
              seen.add(edge.id);
            }
          }
        });
      }
    });

    return result;
  }

  /**
   * Find nodes near a point (for hit testing)
   */
  findNodesNearPoint(x: number, y: number, radius: number = 10): SpatialNode[] {
    return this.queryNodes(x - radius, y - radius, x + radius, y + radius)
      .filter(node => {
        // More precise hit testing
        return x >= node.x && x <= node.x + node.width &&
               y >= node.y && y <= node.y + node.height;
      });
  }

  /**
   * Find edges near a point (for hit testing)
   */
  findEdgesNearPoint(x: number, y: number, threshold: number = 8): SpatialEdge[] {
    return this.queryEdges(x - threshold, y - threshold, x + threshold, y + threshold)
      .filter(edge => {
        // Calculate distance from point to line segment
        const distance = this.distanceToLineSegment(x, y, edge.fromX, edge.fromY, edge.toX, edge.toY);
        return distance <= threshold;
      });
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) {
      return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
  }

  /**
   * Update spatial bounds
   */
  private updateBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    if (this.nodes.size === 0 && this.edges.size === 0) {
      this.bounds = { minX, minY, maxX, maxY };
    } else {
      this.bounds.minX = Math.min(this.bounds.minX, minX);
      this.bounds.minY = Math.min(this.bounds.minY, minY);
      this.bounds.maxX = Math.max(this.bounds.maxX, maxX);
      this.bounds.maxY = Math.max(this.bounds.maxY, maxY);
    }
  }

  /**
   * Get current spatial bounds
   */
  getBounds(): SpatialBounds {
    return { ...this.bounds };
  }

  /**
   * Clear all data from the index
   */
  clear(): void {
    this.nodeGrid.clear();
    this.edgeGrid.clear();
    this.nodes.clear();
    this.edges.clear();
    this.bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  /**
   * Get statistics about the spatial index
   */
  getStats(): {
    nodeCount: number;
    edgeCount: number;
    gridCells: number;
    averageNodesPerCell: number;
    averageEdgesPerCell: number;
  } {
    const nodeGridCells = this.nodeGrid.size;
    const edgeGridCells = this.edgeGrid.size;
    const totalNodeCells = Array.from(this.nodeGrid.values()).reduce((sum, set) => sum + set.size, 0);
    const totalEdgeCells = Array.from(this.edgeGrid.values()).reduce((sum, set) => sum + set.size, 0);

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      gridCells: Math.max(nodeGridCells, edgeGridCells),
      averageNodesPerCell: nodeGridCells > 0 ? totalNodeCells / nodeGridCells : 0,
      averageEdgesPerCell: edgeGridCells > 0 ? totalEdgeCells / edgeGridCells : 0
    };
  }
}

// Global spatial index instance
export const globalSpatialIndex = new SpatialIndex(500);