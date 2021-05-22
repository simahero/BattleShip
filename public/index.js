(function () {

    const socket = io('')
    /*
        @INIT
    */
    const gameForm = document.getElementById('gameForm')
    const nameInput = document.getElementById('name')
    const colorInput = document.getElementById('color')
    const codeInput = document.getElementById('gamecode')
    const tableSizeInput = document.getElementById('tablesize')
    const shipsCount = document.getElementById('shipscount')
    const gameDetails = document.getElementById('gameDetails')
    const roomCode = document.getElementById('roomCode')
    const timer = document.getElementById('timer')
    const players = document.getElementById('players')
    const stage = document.getElementById('stage')
    const turns = document.getElementById('turns')
    const op1 = document.getElementById('options-1')
    const op2 = document.getElementById('options-2')
    const op3 = document.getElementById('options-3')
    const nextButton = document.getElementById('next')
    const startButton = document.getElementById('start')
    const joinButton = document.getElementById('join')
    const createButton = document.getElementById('create')
    const cells = () => document.querySelectorAll('.cell')
    /*
    const RESPONSE = 'response';
    const ERROR = 'error';
    const CREATE_ROOM = 'create_room';
    const JOIN_ROOM = 'join_room';
    const HIT = 'hit';
    */

    this.state = {
        gridSize: 8,
        player: {
            name: localStorage.getItem('name') || 'Player',
            color: localStorage.getItem('color') || '#ffffff',
        }
    }

    window.onload = () => {
        createTable(8)
        nameInput.placeholder = localStorage.getItem('name') || 'Player'
        colorInput.value = localStorage.getItem('color') || '#ffffff'
        op2.style.display = "none"
        op3.style.display = "none"
    }

    window.onresize = () => resizeTabe(this.state.gridSize)

    function cellClickHandler(e) {
        socket.emit('hit', { position: e.target.id })
    }

    function resizeTabe(gridSize) {
        let gameholder = document.querySelectorAll('.gameholder')[0]
        let w = gameholder.clientWidth - 2 * parseInt(window.getComputedStyle(gameholder, null).getPropertyValue('padding-left'))
        let h = gameholder.clientHeight - 2 * parseInt(window.getComputedStyle(gameholder, null).getPropertyValue('padding-top'))
        let cellW = Math.min(w, h) / gridSize
        table.style.gridTemplateColumns = `repeat(${gridSize}, ${cellW}px [col-start])`
        table.style.gridTemplateRows = `repeat(${gridSize}, ${cellW}px [col-start])`
    }

    function createTable(gridSize) {
        let html = ''
        for (let i = 0; i < gridSize * gridSize; i++) {
            html += `<div id="${i}" class="cell"></div>`
        }
        table.innerHTML = html
        resizeTabe(gridSize)
        cells().forEach(e => {
            e.onclick = cellClickHandler
        })
    }

    function handleInGameResponse(state) {

        document.querySelectorAll('.cell').forEach(e => {
            e.style.backgroundColor = '#ffffff'
        })

        timer.textContent = `TIMER: ${state.timer}`
        //onjoin?

        switch (state.stage) {
            case -1:
                stage.textContent = 'Waiting for other players...'
                break
            case 0:
                stage.textContent = 'Placing ships'
                break
            case 1:
                stage.textContent = 'Battle!'
        }

        turns.textContent = `TURN: ${state.turns}`
        //AM I THE CURRENT PLAYER? players[que[current]]
        for (const [id, player] of Object.entries(state.players)) {
            let color = player.color
            player.ships.forEach(e => {
                document.getElementById(e).style.backgroundColor = color;
            })
        }

        state.bombedAres.forEach(area => {
            if (area.belongsTo === -1) {
                document.getElementById(area.position).style.backgroundColor = '#3b3b3b'
            } else {
                let cell = document.getElementById(area.position)
                cell.style.backgroundColor = area.belongsTo.color
                cell.style.border = '5px solid #3b3b3b'
            }
        })

    }

    /*
        @HTML EVENTS
    */

    nextButton.onclick = () => {
        let name = nameInput.value || localStorage.getItem('name')
        let color = colorInput.value
        this.state.player.name = name
        this.state.player.color = color
        localStorage.setItem('name', name)
        localStorage.setItem('color', color)
        op1.style.display = "none"
        op2.style.display = "flex"
    }

    createButton.onclick = () => {
        op2.style.display = "none"
        op3.style.display = "flex"
    }

    joinButton.onclick = () => {
        socket.emit('join_room', {
            gameCode: codeInput.value,
            player: this.state.player
        })
        codeInput.value = ''
        gameForm.style.display = "none"
        gameDetails.style.display = "flex"
    }

    startButton.onclick = () => {
        socket.emit('create_room', {
            gridSize: tableSizeInput.value,
            shipsCount: shipsCount.value,
            player: this.state.player
        })
        gameForm.style.display = "none"
        gameDetails.style.display = "flex"
        this.hasStarted = true
    }

    tableSizeInput.onchange = (e) => {
        this.state.gridSize = e.target.value
        createTable(e.target.value)
    }


    /*
        @SOCKET EVENTS
    */

    socket.on('game_code', code => {
        roomCode.textContent = code
    })
    socket.on('join_room', response => {
        for (const [id, player] of Object.entries(response)) {
            if (!document.getElementById(id)) {
                const li = document.createElement('li')
                li.id = id

                const p = document.createElement('p')
                p.textContent = player.name

                const div = document.createElement('div')
                div.classList.add('colorHolder')
                div.style.backgroundColor = player.color

                li.appendChild(p)
                li.append(div)
                players.appendChild(li)
            }
        }
    })
    socket.on('resize_table', gridSize => {
        this.state.gridSize = gridSize
        createTable(gridSize)
    })
    socket.on('response', response => console.log(response))
    socket.on('in_game', state => handleInGameResponse(state))
    socket.on('game_over', state => handleInGameResponse(state))

}).call(this)