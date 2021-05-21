//{id : id, color: color, name: name, ships: [][]}
function createInitialState( gridSize = 8, shipsCount = 4 ){
    return {
        currentPlayer: -1,
        stage: -1,
        gridSize,
        shipsCount,
        players: {},
        que: []
    }
}

function handleJoinState(state, player) {
    newState = JSON.parse(JSON.stringify(state))
    newState.players[player.id] = {
        name: player.name,
        color: player.color
    }
    newState.que.push(player.id)
    return newState
}


const gameLoop = (state) => {
    //game logic that runs every second
    if (!state) {
        return
    }

    return false //true if winner

}

module.exports = {
    createInitialState,
    handleJoinState,
    gameLoop
}