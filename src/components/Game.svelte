<script>
    import { snake, food } from '../stores';
    import Board from './Board.svelte';

    // 
    const viewPortWidth = window.innerWidth;
    const viewPortHeight = window.innerHeight;
    
    const BOARD_WIDTH           = 30;
    const BOARD_HEGHIT          = 22;
    const BOARD_CELL_SIZE       = 30;
    const BOARD                 = Array.from({length: BOARD_HEGHIT}, () => Array.from({length: BOARD_WIDTH}, () => BOARD_KEY_EMPTY_CELL) );

    const BOARD_KEY_EMPTY_CELL  = 0;
    const BOARD_KEY_SNAKE_BODY  = 1;
    const BOARD_KEY_FOOD        = 2;

    const LEFT                  = 'left';
    const UP                    = 'up';
    const RIGHT                 = 'right';
    const DOWN                  = 'down';

    const SNAKE_START_SPEED     = 300;
    const SNAKE_START_DIR       = RIGHT;
    const SNAKE_START_LENGTH    = 3;


    // Board
    const updateBoard = (updateSnake = false, updateFood = false) => {
        if ( updateFood ) {
            BOARD.forEach( row => {
                row.forEach( cell => {
                    if ( cell === BOARD_KEY_FOOD ) {
                        cell = BOARD_KEY_EMPTY_CELL;
                    }
                } );
            } );
            BOARD[$food.y][$food.x] = BOARD_KEY_FOOD;
        }
        if ( updateSnake ) {
            BOARD.forEach( row => {
                row.forEach( cell => {
                    if ( cell === BOARD_KEY_SNAKE_BODY ) {
                        cell = BOARD_KEY_EMPTY_CELL;
                    }
                } );
            } );
            $snake.body.forEach( snakePart => {
                BOARD[snakePart.y][snakePart.x] = BOARD_KEY_SNAKE_BODY;
            } );
        }
    }
    const getBoardEmptyCells = () => {
        const cellsList = [];
        for ( let i = 0 ; i < BOARD.length ; i++ ) {
            for ( let j = 0 ; j < BOARD[i].length ; j++ ) {
                if ( BOARD[i][j] === BOARD_KEY_EMPTY_CELL ) cellsList.push({ x: j , y: i });
            }
        }
        return cellsList;
    }
    // Snake
    const createSnake = (speed, direction, length) => {
        const createSnakeBody = () => {
            const body = [];
            for ( let i = 1 ; i <= length ; i++ ) {
                body.push({
                    x: length - i,
                    y: 0
                });
            }
            return body;
        }
        return { speed , direction , body: createSnakeBody() };
    }
    const moveSnake = () => {
        const tail = $snake.body.pop();
        BOARD[tail.y][tail.x] = BOARD_KEY_EMPTY_CELL;

        let { x, y } = $snake.body[0];
        switch ( $snake.direction ) {
            case LEFT: x -= 1;
            break;
            case UP: y -= 1;
            break;
            case RIGHT: x += 1;
            break;
            case DOWN: y += 1;
            break;
            default: break;
        }
        $snake.body = [{ x , y }, ...$snake.body];
        BOARD[y][x] = BOARD_KEY_SNAKE_BODY;
    }
    // Food
    const getRandomEmptyLocation = () => {
        const emptyCells = getBoardEmptyCells();
        const random = Math.floor(Math.random() * (emptyCells.length + 1));
        return {
            x: emptyCells[random].x,
            y: emptyCells[random].y
        };
    }
    // Game Logic
    const resetGame = () => {
        $snake = createSnake(SNAKE_START_SPEED, SNAKE_START_DIR, SNAKE_START_LENGTH);
        updateBoard(true);
        $food = getRandomEmptyLocation();
        updateBoard(false, true);
    }
    const getDirectionFromKeyCode = (keyCode) => {
        switch ( keyCode ) {
            case 37: return LEFT;
            case 38: return UP;
            case 39: return RIGHT;
            case 40: return DOWN;
            default:
                return null;
        }
    }
    const isDirectionLegal = (newDir, oldDir) => {
        return !(
            (newDir === LEFT  && oldDir === RIGHT) ||
            (newDir === RIGHT && oldDir === LEFT) ||
            (newDir === UP    && oldDir === DOWN) ||
            (newDir === DOWN  && oldDir === UP)
        );
    }
    const keyDownHandler = (e) => {
        const newDirection = getDirectionFromKeyCode(e.keyCode);
        if ( newDirection && isDirectionLegal(newDirection, $snake.direction) ) {
            $snake.direction = newDirection;
        }
    }
    const isGameOver = () => {
        const snakeHead = $snake.body[0];
        return (
            snakeHead.x < 0 ||
            snakeHead.x > BOARD_WIDTH - 1 ||
            snakeHead.y < 0 ||
            snakeHead.y > BOARD_HEGHIT - 1 ||
            $snake.body.every( part => snakeHead.x !== part.x && snakeHead.y !== part.y )
        );
    }
    const startGame = () => {
        const gameLoop = () => {
            moveSnake();
            const head = $snake.body[0];
            if ( head.x === $food.x && head.y === $food.y ) {
                $food = getRandomEmptyLocation();
                updateBoard(false, true);
                $snake.body = [...$snake.body, $snake.body[$snake.body.length - 1]];
                $snake.speed = $snake.speed * 0.95;
            }
            
            if ( isGameOver() ) {
                resetGame();

            }
            setTimeout(gameLoop, $snake.speed);
        }
        gameLoop();
    }

    // 
    resetGame();
    $: score = $snake.body.length - SNAKE_START_LENGTH;
    
    startGame();
</script>


<svelte:window on:keydown={keyDownHandler} />
<div>
    <Board
        width={BOARD_WIDTH}
        height={BOARD_HEGHIT}
        cellSize={BOARD_CELL_SIZE}
    />

    <h2>Score {score}</h2>
</div>


<style>
    h2 {
        text-align: center;
    }
</style>