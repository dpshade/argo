<script setup>
import { ref } from "vue";

const props = defineProps(["longUrl"]);
const emit = defineEmits(["submit"]);

const url = ref(props.longUrl);

function onSubmit(event) {
    event.preventDefault();
    emit("submit", url.value);
}
</script>

<template>
    <form @submit="onSubmit">
        <input type="url" v-model="url" placeholder="Enter long URL" required />
        <button type="submit">Submit URL</button>
    </form>
</template>
