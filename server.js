const express = require('express')
const http = require('http')
const cors = require('cors')
const morgan = require('morgan')
const helmet = require('helmet')
const { Server } = require("socket.io")

const { RESPONSE, ERROR, CREATE_ROOM, JOIN_ROOM, IN_GAME, HIT, ROOM_SIZE, CODE_LENGTH, GAME_OVER, CONNECT, DISCONNECT } = require('./src/constants')
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
    socket.on(HIT, handleClick)

    function handleCreateRoom({ gridSize, shipsCount, player }) {
        const gameCode = createGameCode(CODE_LENGTH)

        if (io.sockets.adapter.rooms.get(gameCode)) {
            return handleCreateRoom(CODE_LENGTH)
        }

        const socketPlayer = Object.assign({ id: socket.id }, player)

        clientRooms[socket.id] = gameCode

        states[gameCode] = createInitialState(gridSize, shipsCount)
        states[gameCode] = handleJoinState(states[gameCode], socketPlayer)

        socket.player = player

        socket.emit('gameCode', gameCode)
        socket.join(gameCode)
    }

    function handleJoinRoom({ gameCode, player }) {
        let room = io.sockets.adapter.rooms.get(gameCode)

        if (room && room.size < ROOM_SIZE) {

            const socketPlayer = Object.assign({ id: socket.id }, player)

            clientRooms[socket.id] = gameCode
            states[gameCode] = handleJoinState(states[gameCode], socketPlayer)

            socket.player = player

            socket.join(gameCode)
            io.to(socket.id).emit(RESPONSE, { success: `Successfully joined to room:${gameCode}` })

            if (room.size === ROOM_SIZE) {
                //start the game
                //get innitial state, add to states
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

    function handleClick({ position }) {
        const room = clientRooms[socket.id]
        if (room) {
            if (socket.id !== states[room].que[states[room].currentPlayer]) return
            if (states[clientRooms[socket.id]].stage === 0) {

            } //placing
            if (states[clientRooms[socket.id]].stage === 1) {

            } //battle
            states[room].currentPlayer = (states[room].currentPlayer + 1) % states[room].que.length
        }
    }

    function startGameInterval(gameCode) {
        const intervalId = setInterval(() => {
            const winner = gameLoop(states[gameCode]);
            if (!winner) {

                for (const [id, player] of Object.entries(states[gameCode].players)) {
                    io.to(id).emit(IN_GAME, player)
                }
                //emmit state to clients
            } else {
                io.to(gameCode).emit(GAME_OVER, states[gameCode])
                states[gameCode] = null;
                clearInterval(intervalId);
            }
        }, 1000);
    }


    socket.on(DISCONNECT, () => {
        const room = clientRooms[socket.id]
        if (room) {
            delete clientRooms[socket.id]
            delete states[room].players[socket.id]
            if (Object.keys(states[room].players).length < 2) states[room].players = null
            io.to(room).emit(GAME_OVER)
        }
    });

});

server.listen(process.env.PORT || 3000, () => {
    console.log('Listening on: http://localhost:3000')
});