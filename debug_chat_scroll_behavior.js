// Debug script to validate chat auto-scroll behavior assumptions
// This will be injected into the browser console to monitor scroll behavior

console.log('🔍 [CHAT SCROLL DEBUG] Starting diagnostic monitoring...');

// Monitor scroll container and auto-scroll behavior
function debugChatScrollBehavior() {
  const messagesContainer = document.querySelector('[class*="messages"]');
  const messagesEnd = document.querySelector('[class*="messagesEnd"]');
  
  if (!messagesContainer) {
    console.error('❌ [CHAT SCROLL DEBUG] Messages container not found');
    return;
  }

  console.log('✅ [CHAT SCROLL DEBUG] Found messages container:', messagesContainer);

  // Track scroll position changes
  let lastScrollTop = messagesContainer.scrollTop;
  let lastScrollHeight = messagesContainer.scrollHeight;
  let isUserAtBottom = true;

  const checkScrollPosition = () => {
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const newIsUserAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    if (scrollTop !== lastScrollTop || scrollHeight !== lastScrollHeight) {
      console.log('📜 [CHAT SCROLL DEBUG] Scroll change detected:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        isUserAtBottom: newIsUserAtBottom,
        scrollFromBottom: scrollHeight - scrollTop - clientHeight,
        contentChanged: scrollHeight !== lastScrollHeight,
        userScrolled: scrollTop !== lastScrollTop && scrollHeight === lastScrollHeight
      });
      
      lastScrollTop = scrollTop;
      lastScrollHeight = scrollHeight;
      isUserAtBottom = newIsUserAtBottom;
    }
  };

  // Monitor for new messages being added
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        console.log('🆕 [CHAT SCROLL DEBUG] New content added:', {
          addedNodes: mutation.addedNodes.length,
          isUserAtBottom,
          shouldAutoScroll: isUserAtBottom,
          currentScrollPosition: messagesContainer.scrollTop,
          scrollHeight: messagesContainer.scrollHeight
        });
        
        // Check if auto-scroll should trigger
        setTimeout(() => {
          const afterScrollTop = messagesContainer.scrollTop;
          const afterScrollHeight = messagesContainer.scrollHeight;
          const afterIsAtBottom = afterScrollHeight - afterScrollTop - messagesContainer.clientHeight < 50;
          
          console.log('⏱️ [CHAT SCROLL DEBUG] Post-content scroll state:', {
            scrolledToBottom: afterIsAtBottom,
            scrollTop: afterScrollTop,
            scrollHeight: afterScrollHeight,
            autoScrollTriggered: afterIsAtBottom && isUserAtBottom
          });
        }, 200);
      }
    });
  });

  // Start monitoring
  messagesContainer.addEventListener('scroll', checkScrollPosition);
  observer.observe(messagesContainer, { childList: true, subtree: true });
  
  // Initial check
  checkScrollPosition();
  
  console.log('🎯 [CHAT SCROLL DEBUG] Monitoring started. Watch for scroll behavior during AI responses.');
  
  return {
    stop: () => {
      messagesContainer.removeEventListener('scroll', checkScrollPosition);
      observer.disconnect();
      console.log('🛑 [CHAT SCROLL DEBUG] Monitoring stopped.');
    }
  };
}

// Auto-start monitoring
const debugMonitor = debugChatScrollBehavior();

// Provide manual controls
window.chatScrollDebug = {
  start: debugChatScrollBehavior,
  stop: () => debugMonitor?.stop(),
  forceScrollToBottom: () => {
    const messagesEnd = document.querySelector('[class*="messagesEnd"]');
    if (messagesEnd) {
      messagesEnd.scrollIntoView({ behavior: 'smooth', block: 'end' });
      console.log('🔽 [CHAT SCROLL DEBUG] Manually scrolled to bottom');
    }
  }
};

console.log('🎮 [CHAT SCROLL DEBUG] Use window.chatScrollDebug.stop() to stop monitoring');
console.log('🎮 [CHAT SCROLL DEBUG] Use window.chatScrollDebug.forceScrollToBottom() to test scroll');