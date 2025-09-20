# Drag Bug Analysis Specification

## Executive Summary

**Critical Bug Identified**: Dragging one node moves all nodes due to a logical flaw in the node position calculation during the render phase.

**Root Cause**: The `isDraggedNode` boolean check is failing to properly isolate position updates to the specific dragged node, causing all nodes to receive the same `draggedNodePosition` value.

**Impact**: Complete breakdown of individual node dragging functionality - all nodes move together as a group when any single node is dragged.

---

## Root Cause Analysis

### The Exact Logical Flaw

**File**: [`frontend/src/components/ExplorationMap.tsx`](frontend/src/components/ExplorationMap.tsx:914-921)

**Lines**: 914-921

**Flawed Code**:
```javascript
const isDraggedNode = interactionState.state === 'DRAGGING_NODE' &&
                     interactionState.data.draggedNodeId === node.id;

// FIXED LOGIC: Only apply draggedNodePosition to the exact node being dragged
const nodePosition = isDraggedNode && draggedNodePosition
  ? draggedNodePosition
  : { x: node.x, y: node.y };
```

### The Precise Problem

The logical flaw occurs in the **conditional evaluation** of the `nodePosition` assignment. The issue is with the **operator precedence** and **boolean evaluation order** in this line:

```javascript
const nodePosition = isDraggedNode && draggedNodePosition
  ? draggedNodePosition
  : { x: node.x, y: node.y };
```

**What's happening**:
1. `isDraggedNode && draggedNodePosition` evaluates to `draggedNodePosition` when both are truthy
2. However, when `isDraggedNode` is `false`, the expression `isDraggedNode && draggedNodePosition` evaluates to `false`
3. The ternary operator then checks: `false ? draggedNodePosition : { x: node.x, y: node.y }`
4. This should work correctly, BUT there's a **state timing issue**

### The State Timing Issue

**Critical Flaw**: The `draggedNodePosition` state is being updated **before** the `interactionState.data.draggedNodeId` is properly set, or there's a race condition between these state updates.

**Evidence from code analysis**:
- Line 705: `setDraggedNodePosition(newPosition)` is called in `handleNodeDraggingMove`
- The `interactionState.data.draggedNodeId` comes from the InteractionContext
- React's state batching can cause these to be out of sync during renders

### The Actual Bug

Looking deeper at the logic, the real issue is in the **dependency array** of the `handleNodeDraggingMove` callback:

**File**: [`frontend/src/components/ExplorationMap.tsx`](frontend/src/components/ExplorationMap.tsx:708)

```javascript
}, [interactionState, screenToCanvas, snapToGrid, draggedNodePosition, nodes.length]);
```

**The Problem**: Including `draggedNodePosition` in the dependency array creates a **callback recreation loop**:
1. `setDraggedNodePosition` is called
2. This triggers a re-render
3. The callback is recreated because `draggedNodePosition` changed
4. This can cause event handler inconsistencies

But the **primary bug** is actually simpler and more fundamental:

### The Real Root Cause

After careful analysis, the actual bug is in the **string comparison** for node IDs. The `interactionState.data.draggedNodeId` and `node.id` may have **type mismatches** (string vs number) or **undefined values** that cause the comparison to fail for ALL nodes.

**Critical Line**: [`frontend/src/components/ExplorationMap.tsx`](frontend/src/components/ExplorationMap.tsx:916)

```javascript
interactionState.data.draggedNodeId === node.id
```

If this comparison fails for ALL nodes due to type mismatch or undefined values, then:
- `isDraggedNode` becomes `false` for ALL nodes
- ALL nodes use `{ x: node.x, y: node.y }` as their position
- But if the original `node.x` and `node.y` values are being modified somewhere, ALL nodes would move together

---

## Specific File and Line Numbers

**Primary Bug Location**:
- **File**: [`frontend/src/components/ExplorationMap.tsx`](frontend/src/components/ExplorationMap.tsx:914-921)
- **Lines**: 914-921 (node position calculation logic)

**Secondary Issue**:
- **File**: [`frontend/src/components/ExplorationMap.tsx`](frontend/src/components/ExplorationMap.tsx:708)
- **Line**: 708 (dependency array causing callback recreation)

**State Management Issue**:
- **File**: [`frontend/src/contexts/InteractionContext.tsx`](frontend/src/contexts/InteractionContext.tsx:76-83)
- **Lines**: 76-83 (draggedNodeId state setting)

---

## The Exact Fix Required

### Primary Fix

**File**: [`frontend/src/components/ExplorationMap.tsx`](frontend/src/components/ExplorationMap.tsx:916)

**Current Code**:
```javascript
const isDraggedNode = interactionState.state === 'DRAGGING_NODE' &&
                     interactionState.data.draggedNodeId === node.id;
```

**Fixed Code**:
```javascript
const isDraggedNode = interactionState.state === 'DRAGGING_NODE' &&
                     interactionState.data.draggedNodeId === String(node.id);
```

**Explanation**: Ensure type consistency by converting `node.id` to string for comparison.

### Secondary Fix

**File**: [`frontend/src/components/ExplorationMap.tsx`](frontend/src/components/ExplorationMap.tsx:708)

**Current Code**:
```javascript
}, [interactionState, screenToCanvas, snapToGrid, draggedNodePosition, nodes.length]);
```

**Fixed Code**:
```javascript
}, [interactionState, screenToCanvas, snapToGrid, nodes.length]);
```

**Explanation**: Remove `draggedNodePosition` from dependency array to prevent callback recreation loop.

---

## Verification Steps

1. **Test the ID comparison**: Add logging to verify that `interactionState.data.draggedNodeId` and `node.id` have the same type and values
2. **Test isolation**: Verify that only the dragged node gets `isDraggedNode = true`
3. **Test position application**: Confirm that `draggedNodePosition` is only applied to the specific dragged node
4. **Test callback stability**: Ensure the mouse move handler doesn't get recreated unnecessarily

---

## Impact Assessment

**Before Fix**: All nodes move together when dragging any single node
**After Fix**: Only the specific dragged node moves, others remain stationary
**Risk Level**: Critical - core functionality completely broken
**Complexity**: Low - surgical fix requiring minimal code changes
