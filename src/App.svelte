<script>
    import Game from './components/Game.svelte';
    import Controls from './components/Controls.svelte';
</script>

<main>
    <h1>Snake Game</h1>
    
    <Game />

    <Controls />
</main>

<style>
    main {
        width: 100%;
        /* max-width: 50rem; */
    }
    h1 {
        text-align: center;
    }
</style>
