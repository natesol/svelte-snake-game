<script>
    import { food } from "../stores";

    export let cellSize;
</script>

<div
    class="food"
    style=" top: {$food.y * cellSize}px;
            left: {$food.x * cellSize}px;
            width: {cellSize - 2}px;
            height: {cellSize - 2}px;
        "
/>

<style>
    .food {
        width: 48px;
        height: 48px;
        position: absolute;
        border: solid var(--clr-border) 1px;
        background-color: var(--clr-food);
        border-radius: 50%;
        z-index: 0;
    }
</style>
