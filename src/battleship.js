const { TIMER, FPS } = require("./constants")

function createInitialState(gridSize = 8, shipsCount = 4) {
    return {
        currentPlayer: -1,
        stage: -1,
        timer: TIMER,
        gridSize,
        shipsCount,
        players: {},
        que: [],
        turns: 0,
        bombedAres: []
    }
}

function handleJoinState(state, player) {
    newState = JSON.parse(JSON.stringify(state))
    newState.players[player.id] = player
    newState.que.push(player.id)
    return newState
}

const gameLoop = (state) => {
    if (!state) {
        return { isGameOver: true }
    }

    if (state.turns / state.shipsCount === state.que.length && state.stage === 0) {
        state.stage = 1
    }


    if (state.stage === 1) {
        let alives = 0
        if(Object.keys(state.players).length > 0){
            for (const [id, player] of Object.entries(state.players)) {
                console.log(player.ships)
                if (player.ships.length === 0) {
                    state.que = state.que.filter(x => x != id)
                    state.players[id].isDead = true
                } else {
                    alives++
                }
            }
        }

        if (alives < 2 ){
            console.log('gameover', alives)
            return { isGameOver: true }
        }
    }


    state.timer = state.timer - 1 / FPS

    if (state.timer === 0) {
        state.timer = TIMER
        state.turns++
    }

    return {
        isGameOver: false,
        state
    } //true if winner

}

module.exports = {
    createInitialState,
    handleJoinState,
    gameLoop
}