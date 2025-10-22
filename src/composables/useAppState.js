import { ref, computed, onMounted } from "vue";

export function useAppState() {
  const currentView = ref("search");
  const isHeadless = ref(false);
  const isDarkMode = ref(localStorage.getItem("darkMode") === "true");

  // NEW: Launch mode state for HyperBEAM hashpath functionality
  const launchMode = ref(null); // null | 'hashpath'
  const hashpathInput = ref("");

  const showBangEditor = computed(() => currentView.value === "bangEditor");
  const showHashpathLauncher = computed(() => launchMode.value === "hashpath");

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
      console.log("Headless mode activated with query:", query);
    }
  }

  // NEW: Hashpath launch mode functions
  function enterHashpathMode() {
    launchMode.value = "hashpath";
    currentView.value = "hashpath";
    console.log("Entered HyperBEAM hashpath launch mode");
  }

  function exitHashpathMode() {
    launchMode.value = null;
    currentView.value = "search";
    hashpathInput.value = "";
    console.log("Exited HyperBEAM hashpath launch mode");
  }

  return {
    currentView,
    isHeadless,
    isDarkMode,
    launchMode,
    hashpathInput,
    showBangEditor,
    showHashpathLauncher,
    toggleDarkMode,
    handleUrlParams,
    enterHashpathMode,
    exitHashpathMode,
  };
}
