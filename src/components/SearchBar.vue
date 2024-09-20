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
        <div class="input-wrapper">
            <input
                ref="searchInput"
                type="text"
                v-model="query"
                placeholder="Search, !bang, or message ID..."
                required
            />
            <button type="submit">Search</button>
        </div>
    </form>
</template>

<style scoped>
.search-bar {
    display: flex;
    width: 100%;
    max-width: 600px;
    margin-bottom: 1rem;
    margin-top: 15px;
}

.input-wrapper {
    display: flex;
    width: 100%;
}

input {
    flex-grow: 1;
    padding: 0.6rem 1rem;
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

@media screen and (max-width: 768px) {
    .search-bar {
        width: 95%;
    }

    .input-wrapper {
        flex-direction: column;
    }

    input {
        border-radius: 5px 5px 0 0;
        font-size: 16px; /* Prevent zoom on mobile */
    }

    button {
        border-radius: 0 0 5px 5px;
        padding: 0.7rem 1rem;
    }
}
</style>
