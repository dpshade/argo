import { ref, computed, onMounted } from "vue";

export function useAppState() {
  const currentView = ref("search");
  const isHeadless = ref(false);
  const isDarkMode = ref(localStorage.getItem("darkMode") === "true");

  const showBangEditor = computed(() => currentView.value === "bangEditor");

  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value;
    applyDarkMode();
  }

  function applyDarkMode() {
    document.body.classList.toggle("dark-mode", isDarkMode.value);
    localStorage.setItem("darkMode", isDarkMode.value);
  }

  onMounted(() => {
    applyDarkMode();
  });

  async function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");

    if (query) {
      isHeadless.value = true;
    }
  }

  return {
    currentView,
    isHeadless,
    isDarkMode,
    toggleDarkMode,
    showBangEditor,
    toggleDarkMode,
    handleUrlParams,
  };
}
