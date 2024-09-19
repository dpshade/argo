<script setup>
import { ref, onMounted } from "vue";

const query = ref("");
const emit = defineEmits(["search"]);
const searchInput = ref(null);

function onSubmit(event) {
    event.preventDefault();
    emit("search", query.value);
    query.value = "";
}

function focusInput() {
    if (searchInput.value) {
        searchInput.value.focus();
    }
}

onMounted(() => {
    focusInput();
});

defineExpose({ focusInput });
</script>

<template>
    <form @submit="onSubmit" class="search-bar">
        <input
            ref="searchInput"
            type="text"
            v-model="query"
            placeholder="Search, !bang, or message ID..."
            required
        />
        <button type="submit">Search</button>
    </form>
</template>

<style scoped>
.search-bar {
    display: flex;
    width: 45%;
    margin-bottom: 1rem;
}

input {
    flex-grow: 1;
    padding: 0.5rem 1rem;
    font-size: 1rem;
    border: none;
    border-radius: 5px 0 0 5px;
    background-color: var(--input-bg);
    color: var(--text-color);
}

input:focus {
    outline: none;
    background-color: var(--input-focus-bg);
}

button {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    background-color: var(--button-bg);
    color: white;
    border: none;
    border-radius: 0 5px 5px 0;
    cursor: pointer;
    transition: background-color 0.3s;
}

button:hover {
    background-color: var(--button-hover-bg);
}
</style>
