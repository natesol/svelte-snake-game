<script>
    const leftClick = () => {
        dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowLeft",
            keyCode: 37,
            code: "ArrowLeft",
            which: 37,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false
        }));
    }
    const upClick = () => {
        dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowUp",
            keyCode: 38,
            code: "ArrowUp",
            which: 38,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false
        }));
    }
    const rightClick = () => {
        dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowRight",
            keyCode: 39,
            code: "ArrowRight",
            which: 39,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false
        }));
    }
    const downClick = () => {
        dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown",
            keyCode: 40,
            code: "ArrowDown",
            which: 40,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false
        }));
    }
</script>


<div class="controls">
    <div>
        <button on:click={upClick}><i class="fas fa-arrow-up"></i></button>
    </div>
    <div>
        <button on:click={leftClick}><i class="fas fa-arrow-left"></i></button>
        <button on:click={downClick}><i class="fas fa-arrow-down"></i></button>
        <button on:click={rightClick}><i class="fas fa-arrow-right"></i></button>
    </div>
</div>


<style>
    .controls {
        text-align: center;
        width: 100%;
    }
    button {
        width: 10vw;
        height: 10vw;
        cursor: pointer;
        font-size: 4vw;
        color: #222;
    }
</style>