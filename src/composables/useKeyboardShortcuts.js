import { onMounted, onUnmounted } from "vue";

export function useKeyboardShortcuts(handlers) {
  function handleKeyboardShortcut(event) {
    // Check if user is typing in an input/textarea
    const isTyping = event.target.tagName === 'INPUT' ||
                     event.target.tagName === 'TEXTAREA' ||
                     event.target.isContentEditable;

    // NEW: Tab key handling for empty input
    if (event.key === "Tab" && !isTyping) {
      event.preventDefault();
      handlers.handleTabKey?.();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      handlers.handleSearchShortcut();
    } else if ((event.metaKey || event.ctrlKey) && event.key === "e") {
      event.preventDefault();
      handlers.handleEditorShortcut();
    } else if (event.key === "/" && !isTyping) {
      // Only handle "/" when not already typing in an input
      event.preventDefault();
      handlers.handleSearchShortcut();
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", handleKeyboardShortcut);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyboardShortcut);
  });
}
