# Architecture Requirements Update

## Application Context Integration

Based on the provided system overview, the new interaction architecture must support these critical features:

### Core Application Flow
1. **Left Sidebar**: Agent toggle controls (Strategist Agent activation)
2. **Right Sidebar**: Chat interface with Strategist Agent
3. **Canvas**: Dynamic mind map with draggable nodes and connections
4. **Node Types**: 
   - Blue nodes (AI agent inputs)
   - Olive nodes (human user inputs)
5. **Interactive Features**:
   - "Add to Map" buttons in chat messages
   - Fully moveable nodes (drag and reposition)
   - Auto-generated connections (deletable)
   - Individual node deletion
   - Tooltip pop-up cards with summary/edit functionality

### Architecture Compatibility Requirements

#### 1. **Preserve Existing Node Creation Flow**
The new InteractionManager must not interfere with:
- Chat message → "Add to Map" → Node creation
- AI summarization and key message extraction
- Automatic node positioning and connection generation

#### 2. **Maintain Node Type Distinction**
- Blue nodes (AI): Must retain visual styling and behavior
- Olive nodes (Human): Must retain visual styling and behavior
- Node type-specific interactions should remain unchanged

#### 3. **Preserve Tooltip System**
- Node hover/click → Tooltip display
- Summary content display
- Edit functionality within tooltips
- Modal interactions for full context

#### 4. **Connection Management**
- Auto-generated connections must remain functional
- User ability to delete connections must be preserved
- Connection creation tools must continue working

### Updated InteractionManager Design

#### Enhanced Event Handling Priority
```typescript
export class InteractionManager {
  // Priority order for event handling
  private handleMouseDown(event: MouseEvent, target: 'canvas' | 'node', nodeId?: string): void {
    // 1. HIGHEST PRIORITY: Tooltip interactions
    if (this.isTooltipInteraction(event)) {
      return; // Let tooltip handle the event
    }
    
    // 2. HIGH PRIORITY: Node editing/summary interactions
    if (this.isNodeEditingInteraction(event)) {
      return; // Let node editing handle the event
    }
    
    // 3. MEDIUM PRIORITY: Connection management
    if (event.ctrlKey && target === 'node' && nodeId) {
      this.handleConnectionClick(nodeId);
      return;
    }
    
    // 4. STANDARD PRIORITY: Node dragging
    if (target === 'node' && nodeId && this.mode === 'IDLE') {
      this.startNodeDrag(event, nodeId);
      return;
    }
    
    // 5. LOW PRIORITY: Canvas panning
    if (target === 'canvas' && this.mode === 'IDLE') {
      this.startCanvasPan(event);
      return;
    }
  }
  
  private isTooltipInteraction(event: MouseEvent): boolean {
    // Check if event target is within tooltip or tooltip trigger
    const target = event.target as HTMLElement;
    return target.closest('.tooltip') || 
           target.closest('[data-tooltip]') ||
           target.closest('.node-tooltip');
  }
  
  private isNodeEditingInteraction(event: MouseEvent): boolean {
    // Check if event target is within node editing UI
    const target = event.target as HTMLElement;
    return target.closest('.node-edit-button') ||
           target.closest('.node-summary-edit') ||
           target.closest('input') ||
           target.closest('textarea');
  }
}
```

#### Node Type Preservation
```typescript
interface NodeInteractionContext {
  nodeId: string;
  nodeType: 'ai' | 'human'; // Preserve node type information
  isFromChat: boolean; // Track if node originated from chat
  hasTooltip: boolean; // Track tooltip state
  isEditable: boolean; // Track edit state
}

// Enhanced drag context with node type awareness
interface DragContext {
  nodeId: string;
  nodeType: 'ai' | 'human';
  startPosition: Point;
  currentPosition: Point;
  offset: Point;
  initialNodePosition: Point;
  preserveConnections: boolean; // Maintain connections during drag
}
```

#### Chat Integration Compatibility
```typescript
// Ensure InteractionManager doesn't interfere with chat-to-map flow
export class InteractionManager {
  // Method to temporarily disable interactions during node creation
  public setCreationMode(isCreating: boolean): void {
    if (isCreating) {
      this.mode = 'CREATING_NODE';
      // Disable dragging during node creation from chat
    } else {
      this.mode = 'IDLE';
    }
  }
  
  // Method to handle new nodes added from chat
  public onNodeAddedFromChat(nodeId: string, nodeType: 'ai' | 'human'): void {
    // Register new node with interaction system
    // Ensure it's immediately draggable after creation
    console.log(`New ${nodeType} node added from chat: ${nodeId}`);
  }
}
```

### Implementation Adjustments

#### 1. **Tooltip Integration**
- InteractionManager must detect and avoid interfering with tooltip interactions
- Tooltip hover/click events take precedence over dragging
- Edit mode within tooltips must be fully preserved

#### 2. **Node Creation Flow**
- "Add to Map" button functionality must remain unchanged
- New nodes from chat must be immediately draggable
- AI summarization process must not be affected

#### 3. **Connection System**
- Auto-generated connections must be preserved during node dragging
- Connection deletion functionality must remain accessible
- Connection creation tools must continue working

#### 4. **Visual Styling**
- Blue node styling (AI) must be preserved
- Olive node styling (Human) must be preserved
- Hover effects and visual feedback must remain consistent

### Testing Requirements Update

#### Additional Test Cases
1. **Chat Integration Tests**:
   - Add message to map → Verify node is draggable
   - Drag newly created node → Verify connections are preserved
   - Test both AI and Human node creation from chat

2. **Tooltip Interaction Tests**:
   - Hover node → Verify tooltip appears
   - Click tooltip edit → Verify dragging is disabled
   - Edit node content → Verify changes are saved
   - Close tooltip → Verify dragging is re-enabled

3. **Connection Management Tests**:
   - Drag node → Verify connections move with node
   - Delete connection → Verify node dragging still works
   - Create new connection → Verify both nodes remain draggable

4. **Node Type Tests**:
   - Drag blue (AI) node → Verify styling is preserved
   - Drag olive (Human) node → Verify styling is preserved
   - Test mixed dragging of both node types

### Success Criteria Update

The new architecture must achieve:

1. **Functional Compatibility**: All existing features work exactly as before
2. **Dragging Resolution**: Every node (AI and Human) is consistently draggable
3. **No Feature Regression**: Chat integration, tooltips, connections all preserved
4. **Visual Consistency**: Node styling and interactions remain identical
5. **Performance**: No degradation in responsiveness or user experience

This updated architecture ensures the node dragging fix integrates seamlessly with the existing application flow while preserving all critical features.