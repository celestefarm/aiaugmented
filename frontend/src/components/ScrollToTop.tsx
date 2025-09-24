import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    console.log('ScrollToTop: Route changed to:', pathname);
    console.log('ScrollToTop: Current scroll position before reset:', window.scrollY);
    
    // Disable browser scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Multiple scroll reset strategies
    const scrollToTop = () => {
      // Strategy 1: Standard window scroll
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
      });
      
      // Strategy 2: Alternative window scroll
      window.scrollTo(0, 0);
      
      // Strategy 3: Document element scroll
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      
      // Strategy 4: Body element scroll
      if (document.body) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }
      
      // Strategy 5: Find and scroll any scrollable containers
      const scrollableElements = document.querySelectorAll('[data-scroll-container], .overflow-y-auto, .overflow-auto');
      scrollableElements.forEach(element => {
        if (element instanceof HTMLElement) {
          element.scrollTop = 0;
          element.scrollLeft = 0;
        }
      });
      
      // Strategy 6: Check for main content containers
      const mainContainers = document.querySelectorAll('main, #root, .app, [role="main"]');
      mainContainers.forEach(element => {
        if (element instanceof HTMLElement) {
          element.scrollTop = 0;
          element.scrollLeft = 0;
        }
      });
    };
    
    // Execute immediately
    scrollToTop();
    
    // Use requestAnimationFrame to ensure it happens after rendering
    requestAnimationFrame(() => {
      scrollToTop();
      
      // Double-check with another frame
      requestAnimationFrame(() => {
        scrollToTop();
        console.log('ScrollToTop: After requestAnimationFrame, position:', window.scrollY);
      });
    });
    
    // Execute again after a short delay to handle any async rendering
    setTimeout(() => {
      scrollToTop();
      console.log('ScrollToTop: Final scroll position:', window.scrollY);
      
      // Final check and warning
      if (window.scrollY !== 0) {
        console.warn('ScrollToTop: All strategies failed. Current position:', window.scrollY);
        console.warn('ScrollToTop: Document element scrollTop:', document.documentElement?.scrollTop);
        console.warn('ScrollToTop: Body scrollTop:', document.body?.scrollTop);
        
        // Last resort: Force scroll with a longer delay
        setTimeout(() => {
          console.log('ScrollToTop: Last resort attempt...');
          scrollToTop();
          console.log('ScrollToTop: Last resort result:', window.scrollY);
        }, 500);
      } else {
        console.log('ScrollToTop: Successfully scrolled to top');
      }
    }, 100);
    
  }, [pathname]);

  return null;
};

export default ScrollToTop;