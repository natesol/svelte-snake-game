<script>
    import { onMount } from 'svelte';
    import Snake from "./Snake.svelte";
    import Food from "./Food.svelte";

    const viewPortWidth = window.innerWidth;
    const viewPortHeight = window.innerHeight;
    
    export let width;
    export let height;
    export let cellSize;
</script>


<div
    class="board"
    style="
        width: {width*cellSize}px;
        height: {height*cellSize}px
    "
>
    <Snake />
    <Food />
</div>

<style>
    .board {
        width: 100%;
        max-width: 900px;
        border: solid var(--clr-snake-eyes) 1px;
        position: relative;
        margin: 20px auto;
        background-size: cover;
    }
</style>