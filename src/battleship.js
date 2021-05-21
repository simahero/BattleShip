const { TIMER } = require("./constants")

//{id : id, color: color, name: name, ships: [][]}
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
    //game logic that runs every second
    // if (!state) {
    //     return
    // }

    if (state.turns / state.shipsCount === state.que.length && state.stage === 0) {
        state.stage = 1
    }


    if (state.stage === 2) {
        let alives = 0
        for (const [id, player] of Object.entries(state.players)) {
            if (player.ships.length === 0) {
                player.isDead = true
            } else {
                alives++
            }
        }

        if (alives < 2 ){
            return { isGameOver: true }
        }
    }


    state.timer--

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