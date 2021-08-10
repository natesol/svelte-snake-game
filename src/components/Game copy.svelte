<script>
    import Board from './Board.svelte';
    import Snake from './Snake.svelte';
    import Food from './Food.svelte';

    // 
    const BOARD_WIDTH        = 1000;
    const BOARD_HEGHIT       = 700;
    const BOARD_CELL_DIM     = 50;
    const SNAKE_START_LENGTH = 3;
    const SNAKE_START_SPEED  = 50;


    // 
    const createSnake = () => {
        snakeDirection = 'right';
        snakeBody = [
            {
                left: 100,
                top: 0,
            },
            {
                left: 50,
                top: 0,
            },
            {
                left: 0,
                top: 0,
            },
        ];
    }


    // 
    let snakeSpeed = 300;
    let snakeDirection = 'right';
    let snakeBody = [];

    let food = {
        x: 0,
        y: 0
    }
    
    $: score = snakeBody.length - 3;
    
    setInterval(() => {
        snakeBody.pop();
        let { left, top } = snakeBody[0];
        if (snakeDirection === 'up') {
            top -= BOARD_CELL_DIM;
        } else if (snakeDirection === 'down') {
            top += BOARD_CELL_DIM;
        } else if (snakeDirection === 'left') {
            left -= BOARD_CELL_DIM;
        } else if (snakeDirection === 'right') {
            left += BOARD_CELL_DIM;
        }
        const newHead = { left, top };

        snakeBody = [newHead, ...snakeBody];
        
        if (isCollide(newHead, { left: foodX, top: foodY })) {
            moveFood();
            snakeBody = [...snakeBody, snakeBody[snakeBody.length - 1]];
            snakeSpeed += 50;
        }
        
        if (isGameOver()) {
            resetGame();
        }
    }, snakeSpeed);
    
    function isCollide(a, b) {
        return !(a.top < b.top || a.top > b.top || a.left < b.left || a.left > b.left);
    }
    
    function moveFood() {
        foodY = Math.floor(Math.random() * 14) * BOARD_CELL_DIM;
        foodX = Math.floor(Math.random() * 20) * BOARD_CELL_DIM;
    }
    
    function resetGame() {
        moveFood();
        snakeDirection = 'right';
        snakeBody = [
            {
                left: 100,
                top: 0,
            },
            {
                left: 50,
                top: 0,
            },
            {
                left: 0,
                top: 0,
            },
        ];
    }
    
    function isGameOver() {
        const snakeBodiesNoHead = snakeBody.slice(1);
        const snakeCollisions = snakeBodiesNoHead.filter((sb) => isCollide(sb, snakeBody[0]));
        if (snakeCollisions.length > 0) {
            return true;
        }
        const { top, left } = snakeBody[0];
        if ( top >= BOARD_HEGHIT || top < 0 || left < 0 || left >= BOARD_WIDTH ) {
            return true;
        }
        return false;
    }

    const getDirectionFromKeyCode = (keyCode) => {
        switch ( keyCode ) {
            case 37: return 'left';
            case 38: return 'up';
            case 39: return 'right';
            case 40: return 'down';
            default:
                return false;
        }
    }

    const onKeyDown = (e) => {
        const newDirection = getDirectionFromKeyCode(e.keyCode);
        if (newDirection) {
            snakeDirection = newDirection;
        }
    }
    
    resetGame();
</script>



<h1>Snake Game</h1>
<main>
    <Snake direction={snakeDirection} {snakeBody} />
    <Food foodLeft={foodX} foodTop={foodY} />
</main>
<h2>Score {score}</h2>
<svelte:window on:keydown={onKeyDown} />

<style>
    main {
        width: 1000px;
        height: 700px;
        border: solid black 1px;
        position: relative;
        margin: 20px auto;
        background-image: url('../background.jpg');
        background-size: cover;
    }
    h2,
    h1 {
        text-align: center;
    }
</style>
