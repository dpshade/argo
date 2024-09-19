import { onMounted, onUnmounted } from "vue";

export function useKeyboardShortcuts(handlers) {
  function handleKeyboardShortcut(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      handlers.handleSearchShortcut();
    } else if ((event.metaKey || event.ctrlKey) && event.key === "e") {
      event.preventDefault();
      handlers.handleEditorShortcut();
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", handleKeyboardShortcut);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyboardShortcut);
  });
}
