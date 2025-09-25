/**
 * TransformManager - Centralized canvas transform management
 * 
 * This class handles all canvas positioning logic including:
 * - Centralized state management for transform (x, y, scale)
 * - Viewport-aware auto-centering
 * - localStorage persistence
 * - Subscriber pattern for transform change notifications
 */

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface NodeBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ViewportDimensions {
  width: number;
  height: number;
}

type TransformSubscriber = (transform: Transform) => void;

export class TransformManager {
  private static readonly STORAGE_KEY = 'canvas-transform';
  private static readonly DEFAULT_SCALE = 1;
  private static readonly MIN_SCALE = 0.1;
  private static readonly MAX_SCALE = 3;
  
  private transform: Transform;
  private subscribers: Set<TransformSubscriber> = new Set();

  constructor() {
    console.log('🔍 [TRANSFORM-MANAGER] Initializing TransformManager');
    
    // PADDING FIX: Always start with clean default transform to prevent accumulation
    // Only load from storage if it's a valid, reasonable transform
    const storedTransform = this.loadFromStorage();
    const isStoredTransformReasonable = storedTransform && this.isReasonableTransform(storedTransform);
    
    this.transform = isStoredTransformReasonable ? storedTransform : {
      x: 0,
      y: 0,
      scale: TransformManager.DEFAULT_SCALE
    };
    
    console.log('🔍 [TRANSFORM-MANAGER] Initial transform set:', this.transform);
    console.log('🔍 [TRANSFORM-MANAGER] Transform source:', isStoredTransformReasonable ? 'localStorage (validated)' : 'default (clean)');
    
    // Clear any potentially corrupted stored values if they were unreasonable
    if (storedTransform && !isStoredTransformReasonable) {
      console.log('🔍 [TRANSFORM-MANAGER] 🧹 Clearing corrupted localStorage transform:', storedTransform);
      this.clearStorage();
    }
  }

  /**
   * Get the current transform state
   */
  public getTransform(): Transform {
    return { ...this.transform };
  }

  /**
   * Update the transform state and notify subscribers
   */
  public setTransform(newTransform: Partial<Transform>): void {
    console.log('🔍 [TRANSFORM-MANAGER] setTransform called with:', newTransform);
    const previousTransform = { ...this.transform };
    console.log('🔍 [TRANSFORM-MANAGER] Previous transform:', previousTransform);
    
    // Update transform with new values
    this.transform = {
      ...this.transform,
      ...newTransform
    };
    console.log('🔍 [TRANSFORM-MANAGER] Transform after merge:', this.transform);

    // Clamp scale to valid range
    const unclampedScale = this.transform.scale;
    this.transform.scale = Math.max(
      TransformManager.MIN_SCALE,
      Math.min(TransformManager.MAX_SCALE, this.transform.scale)
    );
    
    if (unclampedScale !== this.transform.scale) {
      console.log('🔍 [TRANSFORM-MANAGER] Scale clamped from', unclampedScale, 'to', this.transform.scale);
    }

    console.log('🔍 [TRANSFORM-MANAGER] Final transform after clamping:', this.transform);

    // Only notify and persist if transform actually changed
    const hasChanged = this.hasTransformChanged(previousTransform, this.transform);
    console.log('🔍 [TRANSFORM-MANAGER] Transform changed:', hasChanged);
    
    if (hasChanged) {
      console.log('🔍 [TRANSFORM-MANAGER] 💾 Saving to localStorage and notifying subscribers');
      this.saveToStorage();
      this.notifySubscribers();
    } else {
      console.log('🔍 [TRANSFORM-MANAGER] No change detected, skipping save and notify');
    }
  }

  /**
   * Calculate optimal transform to center canvas content within viewport
   * This replaces the old flawed auto-centering logic
   */
  public calculateOptimalCenterTransform(
    nodeBounds: NodeBounds,
    viewport: ViewportDimensions,
    padding: number = 50
  ): Transform {
    console.log('🔍 [TRANSFORM-MANAGER] 🎯 calculateOptimalCenterTransform called');
    console.log('🔍 [TRANSFORM-MANAGER] Input nodeBounds:', nodeBounds);
    console.log('🔍 [TRANSFORM-MANAGER] Input viewport:', viewport);
    console.log('🔍 [TRANSFORM-MANAGER] Input padding:', padding);
    
    // PADDING FIX: Validate inputs to prevent excessive padding calculations
    const safePadding = Math.min(Math.max(padding, 10), Math.min(viewport.width, viewport.height) * 0.2);
    if (safePadding !== padding) {
      console.log('🔍 [TRANSFORM-MANAGER] 🛡️ Padding clamped from', padding, 'to', safePadding);
    }
    
    // Calculate content dimensions
    const contentWidth = nodeBounds.maxX - nodeBounds.minX;
    const contentHeight = nodeBounds.maxY - nodeBounds.minY;
    console.log('🔍 [TRANSFORM-MANAGER] Content dimensions:', { contentWidth, contentHeight });
    
    // PADDING FIX: Validate content dimensions
    if (contentWidth <= 0 || contentHeight <= 0) {
      console.log('🔍 [TRANSFORM-MANAGER] ⚠️ Invalid content dimensions, using default transform');
      return {
        x: 0,
        y: 0,
        scale: TransformManager.DEFAULT_SCALE
      };
    }
    
    // Calculate content center
    const contentCenterX = nodeBounds.minX + contentWidth / 2;
    const contentCenterY = nodeBounds.minY + contentHeight / 2;
    console.log('🔍 [TRANSFORM-MANAGER] Content center:', { contentCenterX, contentCenterY });
    
    // Calculate available viewport space (accounting for safe padding)
    const availableWidth = viewport.width - (safePadding * 2);
    const availableHeight = viewport.height - (safePadding * 2);
    console.log('🔍 [TRANSFORM-MANAGER] Available space after safe padding:', { availableWidth, availableHeight });
    
    // Calculate scale to fit content within viewport
    let optimalScale = TransformManager.DEFAULT_SCALE;
    
    if (availableWidth > 0 && availableHeight > 0) {
      const scaleX = availableWidth / contentWidth;
      const scaleY = availableHeight / contentHeight;
      console.log('🔍 [TRANSFORM-MANAGER] Scale calculations:', { scaleX, scaleY });
      
      optimalScale = Math.min(scaleX, scaleY);
      console.log('🔍 [TRANSFORM-MANAGER] Optimal scale before clamping:', optimalScale);
      
      // Clamp to valid scale range
      const unclampedScale = optimalScale;
      optimalScale = Math.max(
        TransformManager.MIN_SCALE,
        Math.min(TransformManager.MAX_SCALE, optimalScale)
      );
      
      if (unclampedScale !== optimalScale) {
        console.log('🔍 [TRANSFORM-MANAGER] Scale clamped from', unclampedScale, 'to', optimalScale);
      }
    }
    
    console.log('🔍 [TRANSFORM-MANAGER] Final optimal scale:', optimalScale);
    
    // Calculate translation to center content in viewport
    const viewportCenterX = viewport.width / 2;
    const viewportCenterY = viewport.height / 2;
    console.log('🔍 [TRANSFORM-MANAGER] Viewport center:', { viewportCenterX, viewportCenterY });
    
    // PADDING FIX: Use precise centering calculations
    const optimalX = Math.round(viewportCenterX - (contentCenterX * optimalScale));
    const optimalY = Math.round(viewportCenterY - (contentCenterY * optimalScale));
    console.log('🔍 [TRANSFORM-MANAGER] Translation calculations:', {
      calculation: `${viewportCenterX} - (${contentCenterX} * ${optimalScale})`,
      optimalX,
      optimalY
    });
    
    const result = {
      x: optimalX,
      y: optimalY,
      scale: optimalScale
    };
    
    console.log('🔍 [TRANSFORM-MANAGER] 🎯 Final optimal transform:', result);
    return result;
  }

  /**
   * Auto-center the canvas content and update transform
   */
  public centerContent(nodeBounds: NodeBounds, viewport: ViewportDimensions, padding?: number): void {
    const optimalTransform = this.calculateOptimalCenterTransform(nodeBounds, viewport, padding);
    this.setTransform(optimalTransform);
  }

  /**
   * Apply a translation delta to the current transform
   */
  public translate(deltaX: number, deltaY: number): void {
    this.setTransform({
      x: this.transform.x + deltaX,
      y: this.transform.y + deltaY
    });
  }

  /**
   * Apply a scale change at a specific point (for zoom operations)
   */
  public scaleAt(scaleDelta: number, centerX: number, centerY: number): void {
    const newScale = this.transform.scale * scaleDelta;
    
    // Calculate new position to maintain zoom center
    const newX = centerX - (centerX - this.transform.x) * scaleDelta;
    const newY = centerY - (centerY - this.transform.y) * scaleDelta;
    
    this.setTransform({
      x: newX,
      y: newY,
      scale: newScale
    });
  }

  /**
   * Reset transform to default state
   */
  public reset(): void {
    this.setTransform({
      x: 0,
      y: 0,
      scale: TransformManager.DEFAULT_SCALE
    });
  }

  /**
   * Subscribe to transform changes
   */
  public subscribe(callback: TransformSubscriber): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get the number of active subscribers (useful for debugging)
   */
  public getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Save current transform to localStorage
   */
  private saveToStorage(): void {
    try {
      console.log('🔍 [TRANSFORM-MANAGER] 💾 Saving transform to localStorage:', this.transform);
      localStorage.setItem(TransformManager.STORAGE_KEY, JSON.stringify(this.transform));
      console.log('🔍 [TRANSFORM-MANAGER] ✅ Transform saved to localStorage successfully');
    } catch (error) {
      console.warn('🔍 [TRANSFORM-MANAGER] ❌ Failed to save transform to localStorage:', error);
    }
  }

  /**
   * Load transform from localStorage
   */
  private loadFromStorage(): Transform | null {
    try {
      console.log('🔍 [TRANSFORM-MANAGER] 📖 Loading transform from localStorage');
      const stored = localStorage.getItem(TransformManager.STORAGE_KEY);
      console.log('🔍 [TRANSFORM-MANAGER] Raw stored value:', stored);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('🔍 [TRANSFORM-MANAGER] Parsed stored transform:', parsed);
        
        // Validate the loaded data
        const isValid = this.isValidTransform(parsed);
        console.log('🔍 [TRANSFORM-MANAGER] Transform validation result:', isValid);
        
        if (isValid) {
          console.log('🔍 [TRANSFORM-MANAGER] ✅ Loaded valid transform from localStorage:', parsed);
          return parsed;
        } else {
          console.log('🔍 [TRANSFORM-MANAGER] ❌ Invalid transform in localStorage, ignoring');
        }
      } else {
        console.log('🔍 [TRANSFORM-MANAGER] No stored transform found in localStorage');
      }
    } catch (error) {
      console.warn('🔍 [TRANSFORM-MANAGER] ❌ Failed to load transform from localStorage:', error);
    }
    
    console.log('🔍 [TRANSFORM-MANAGER] Returning null (will use default transform)');
    return null;
  }

  /**
   * Validate that an object is a valid Transform
   */
  private isValidTransform(obj: any): obj is Transform {
    return (
      obj &&
      typeof obj.x === 'number' &&
      typeof obj.y === 'number' &&
      typeof obj.scale === 'number' &&
      !isNaN(obj.x) &&
      !isNaN(obj.y) &&
      !isNaN(obj.scale) &&
      obj.scale > 0
    );
  }

  /**
   * Check if two transforms are different
   */
  private hasTransformChanged(prev: Transform, current: Transform): boolean {
    const epsilon = 1e-10; // Small threshold for floating point comparison
    
    return (
      Math.abs(prev.x - current.x) > epsilon ||
      Math.abs(prev.y - current.y) > epsilon ||
      Math.abs(prev.scale - current.scale) > epsilon
    );
  }

  /**
   * Notify all subscribers of transform changes
   */
  private notifySubscribers(): void {
    const currentTransform = this.getTransform();
    console.log('🔍 [TRANSFORM-MANAGER] 📢 Notifying', this.subscribers.size, 'subscribers of transform change:', currentTransform);
    
    let index = 0;
    this.subscribers.forEach((callback) => {
      try {
        index++;
        console.log('🔍 [TRANSFORM-MANAGER] Calling subscriber', index);
        callback(currentTransform);
        console.log('🔍 [TRANSFORM-MANAGER] ✅ Subscriber', index, 'notified successfully');
      } catch (error) {
        console.error('🔍 [TRANSFORM-MANAGER] ❌ Error in transform subscriber callback', index, ':', error);
      }
    });
    
    console.log('🔍 [TRANSFORM-MANAGER] 📢 All subscribers notified');
  }

  /**
   * Clear all subscribers (useful for cleanup)
   */
  public clearSubscribers(): void {
    this.subscribers.clear();
  }

  /**
   * Clear stored transform from localStorage (for debugging/reset)
   */
  public clearStorage(): void {
    try {
      console.log('🔍 [TRANSFORM-MANAGER] 🧹 Clearing localStorage transform');
      localStorage.removeItem(TransformManager.STORAGE_KEY);
      console.log('🔍 [TRANSFORM-MANAGER] ✅ localStorage cleared successfully');
    } catch (error) {
      console.warn('🔍 [TRANSFORM-MANAGER] ❌ Failed to clear localStorage:', error);
    }
  }

  /**
   * Validate that a transform has reasonable values (not excessive padding)
   */
  private isReasonableTransform(transform: Transform): boolean {
    // Check for reasonable bounds - prevent excessive translations
    const MAX_REASONABLE_TRANSLATION = 10000;
    const MIN_REASONABLE_SCALE = 0.01;
    const MAX_REASONABLE_SCALE = 10;
    
    const isReasonable = (
      Math.abs(transform.x) < MAX_REASONABLE_TRANSLATION &&
      Math.abs(transform.y) < MAX_REASONABLE_TRANSLATION &&
      transform.scale >= MIN_REASONABLE_SCALE &&
      transform.scale <= MAX_REASONABLE_SCALE &&
      !isNaN(transform.x) &&
      !isNaN(transform.y) &&
      !isNaN(transform.scale)
    );
    
    if (!isReasonable) {
      console.log('🔍 [TRANSFORM-MANAGER] ❌ Unreasonable transform detected:', transform);
    }
    
    return isReasonable;
  }

  /**
   * Get transform as CSS transform string
   */
  public toCSSTransform(): string {
    return `translate(${this.transform.x}px, ${this.transform.y}px) scale(${this.transform.scale})`;
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  public screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.transform.x) / this.transform.scale,
      y: (screenY - this.transform.y) / this.transform.scale
    };
  }

  /**
   * Convert canvas coordinates to screen coordinates
   */
  public canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    return {
      x: canvasX * this.transform.scale + this.transform.x,
      y: canvasY * this.transform.scale + this.transform.y
    };
  }
}