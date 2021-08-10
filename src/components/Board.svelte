<script>
    import Snake from "./Snake.svelte";
    import Food from "./Food.svelte";

    export let width;
    export let height;
    export let cellSize;
</script>

<div
    class="board"
    style="width: {width*cellSize}px; height: {height*cellSize}px"
>
    <Snake
        {cellSize}
    />
    <Food
        {cellSize}
    />
</div>

<style>
    .board {
        border: solid black 1px;
        position: relative;
        margin: 20px auto;
        /* background-image: url('../background.jpg'); */
        background-size: cover;
    }
</style>