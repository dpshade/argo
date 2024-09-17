<script setup>
defineProps(["message"]);
</script>

<template>
    <div v-if="message" id="result" v-html="message"></div>
</template>
