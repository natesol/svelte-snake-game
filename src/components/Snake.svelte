<script>
    import { snake } from "../stores";

    export let cellSize;
</script>

{ #each $snake.body as bodyPart, i }
    <div
        class="snake-body {i === 0 ? $snake.direction : ''}"
        style=" top: {bodyPart.y * cellSize}px;
                left: {bodyPart.x * cellSize}px;
                width: {cellSize - 2}px;
                height: {cellSize - 2}px;
            "
    >
        { #if i === 0 }
            <div id="leftEye" class="eyes" />
            <div id="rightEye" class="eyes" />
        { /if }
    </div>
{/each }

<style>
    .snake-body {
        background-color: var(--clr-snake);
        border: var(--clr-border) 1px solid;
        position: absolute;
        width: 48px;
        height: 48px;
        z-index: 3;
    }
    .eyes {
        position: absolute;
        background-color: var(--clr-snake-eyes);
        border-radius: 50%;
        width: 20%;
        height: 20%;
    }
    #leftEye {
        left: 70%;
        top: 10%;
    }
    #rightEye {
        left: 70%;
        bottom: 10%;
    }
    .snake-body.right {
        transform: rotate(0deg);
    }
    .snake-body.left {
        transform: rotate(180deg);
    }
    .snake-body.up {
        transform: rotate(270deg);
    }
    .snake-body.down {
        transform: rotate(90deg);
    }
</style>