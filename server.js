const express = require('express')
const http = require('http')
const cors = require('cors')
const morgan = require('morgan')
const helmet = require('helmet')
const { Server } = require("socket.io")

const { RESPONSE, ERROR, CREATE_ROOM, JOIN_ROOM, START_GAME, IN_GAME, HIT, ROOM_SIZE, CODE_LENGTH, GAME_OVER, CONNECT, DISCONNECT, TIMER, GAME_CODE, RESIZE_GRID, FPS, DISCONNECT_ROOM } = require('./src/constants')
const { createInitialState, handleJoinState, gameLoop } = require('./src/battleship')
const { createGameCode } = require('./src/utils')

//SERVER SETUP
const app = express()
const server = http.createServer(app)
const io = new Server(server)
require('dotenv').config()

app.use(helmet())
app.use(cors())
app.use(morgan('tiny'))

app.use(express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html')
});

var states = {}
var clientRooms = {}

io.on(CONNECT, (socket) => {

    socket.on(CREATE_ROOM, handleCreateRoom)
    socket.on(JOIN_ROOM, handleJoinRoom)
    socket.on(START_GAME, handleStartGame)
    socket.on(HIT, handleClick)

    function handleCreateRoom({ gridSize, shipsCount, player }) {
        const gameCode = createGameCode(CODE_LENGTH)

        if (io.sockets.adapter.rooms.get(gameCode)) {
            return handleCreateRoom(CODE_LENGTH)
        }

        const socketPlayer = Object.assign(
            { id: socket.id },
            player,
            { ships: [] },
            { isDead: false })

        clientRooms[socket.id] = gameCode
        states[gameCode] = createInitialState(gridSize, shipsCount)
        states[gameCode] = handleJoinState(states[gameCode], socketPlayer)

        socket.emit(START_GAME, gameCode)
        socket.emit(GAME_CODE, gameCode)
        socket.emit(JOIN_ROOM, states[gameCode].players)
        socket.join(gameCode)
    }

    function handleJoinRoom({ gameCode, player }) {
        let room = io.sockets.adapter.rooms.get(gameCode)

        if (room && room.size < ROOM_SIZE && states[gameCode].currentPlayer === -1) {

            const socketPlayer = Object.assign(
                { id: socket.id },
                player,
                { ships: [] },
                { isDead: false })

            clientRooms[socket.id] = gameCode
            states[gameCode] = handleJoinState(states[gameCode], socketPlayer)

            socket.join(gameCode)
            socket.emit(GAME_CODE, gameCode)
            io.to(socket.id).emit(RESIZE_GRID, states[gameCode].gridSize)
            io.to(gameCode).emit(JOIN_ROOM, states[gameCode].players)

            if (room.size === ROOM_SIZE) {
                states[gameCode].stage = 0
                states[gameCode].currentPlayer = 0
                startGameInterval(gameCode);
            }

        } else if (!room) {
            io.to(socket.id).emit(ERROR, { error: `There is no room with code:${gameCode}` })
        } else {
            io.to(socket.id).emit(ERROR, { error: `The room (${gameCode}) is full!` })
        }
    }

    function handleStartGame(gameCode) {
        startGameInterval(gameCode)
    }

    function handleClick({ position }) {
        const gameCode = clientRooms[socket.id]
        if (gameCode && states[gameCode]) {

            //NOT THE PLAYERS TURN
            if (socket.id !== states[gameCode].que[states[gameCode].currentPlayer]) return

            //PLACING SHIPS // ATTACK???
            if (states[gameCode].stage === 0) {
                let hit = getHit(states[gameCode].players, position)
                if (hit && hit.id !== socket.id) {
                    handleHit(hit, position, gameCode)
                    states[gameCode].timer = TIMER
                } else if (!hit) {
                    states[gameCode].players[socket.id].ships.push(position)
                    nextTurn(gameCode)
                }
            }

            //ATTACKING  - NO SELF ATTACK
            if (states[gameCode].stage === 1) {
                let hit = getHit(states[gameCode].players, position)
                if (hit && (hit.id !== socket.id)) {
                    handleHit(hit, position, gameCode)
                    //nextTurn(gameCode)
                } else {
                    states[gameCode].bombedAres.push({ position, belongsTo: -1 })
                    nextTurn(gameCode)
                }
            }
        }
    }

    function nextTurn(gameCode) {
        states[gameCode].currentPlayer = (states[gameCode].currentPlayer + 1) % states[gameCode].que.length
        states[gameCode].turns++
        states[gameCode].timer = TIMER
    }

    function getHit(players, position) {
        for (const [id, player] of Object.entries(players)) {
            const hasShip = player.ships.includes(position)
            if (hasShip) {
                return {
                    id,
                    player,
                    shipPosition: position
                }
            }
        }
    }

    function handleHit(hit, position, gameCode) {
        let ships = states[gameCode].players[hit.id].ships.filter(x => x != hit.shipPosition)
        states[gameCode].players[hit.id].ships = ships
        states[gameCode].bombedAres.push({ position, belongsTo: { color: hit.player.color } })
    }

    function startGameInterval(gameCode) {
        if (states[gameCode].stage !== -1) return
        states[gameCode].stage = 0
        states[gameCode].currentPlayer = 0
        const intervalId = setInterval(() => {
            const { isGameOver, state } = gameLoop(states[gameCode]);
            if (!isGameOver && state) {
                //io.to(gameCode).emit(IN_GAME, state)
                for (const [id, player] of Object.entries(state.players)) {
                    io.to(id).emit(IN_GAME, {
                        currentPlayer: state.currentPlayer,
                        que: state.que,
                        turns: state.turns,
                        players: { id: player },
                        bombedAres: state.bombedAres,
                        timer: Math.round(state.timer)
                    })
                }
                states[gameCode] = state
                //emmit state to clients
            } else {
                io.to(gameCode).emit(GAME_OVER, states[gameCode])
                clearInterval(intervalId);
            }
        }, 1000 / FPS);
    }



    socket.on(DISCONNECT, () => {
        const gameCode = clientRooms[socket.id]
        if (gameCode) {
            delete clientRooms[socket.id]
            delete states[gameCode].players[socket.id]
            if (states[gameCode].players.length === 0 && states[gameCode].currentPlayer !== -1) {
                states[gameCode] = null;
            }
            io.to(gameCode).emit(DISCONNECT_ROOM, socket.id)
        }
    })

})

const port = process.env.PORT || 8080
server.listen(port, () => {
    console.log(`Listening on: http://localhost:${port}`)
})