(function () {

    const socket = io('')
    /*
        @INIT
    */

    const gameholder = document.getElementById('game-holder')
    const grid = document.getElementById('grid')
    const gameInfo = document.getElementById('game-info')
    const grid = document.getElementById('grid')
    const gameForm = document.getElementById('game-form')
    const nameInput = document.getElementById('name')
    const colorInput = document.getElementById('color')
    const codeInput = document.getElementById('game-code')
    const gridSizeInput = document.getElementById('grid-size')
    const shipsCount = document.getElementById('ships-count')
    const gameDetails = document.getElementById('game-details')
    const roomCode = document.getElementById('room-code')
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
    const copyButton = document.getElementById('copy-button')
    const copyInput = document.getElementById('copy-input')
    const cells = () => document.querySelectorAll('.cell')


    this.state = {
        gridSize: 8,
        player: {
            name: localStorage.getItem('name') || 'Player',
            color: localStorage.getItem('color') || '#ffffff',
        }
    }

    window.onload = init

    window.onresize = () => resizeTabe(this.state.gridSize)

    function init() {
        createGrid(8)
        nameInput.placeholder = localStorage.getItem('name') || 'Player'
        colorInput.value = localStorage.getItem('color') || '#ffffff'
        op2.style.display = "none"
        op3.style.display = "none"
    }

    function cellClickHandler(e) {
        socket.emit('hit', { position: e.target.id })
    }

    function resizeTabe(gridSize) {
        let w = gameholder.clientWidth - 2 * parseInt(window.getComputedStyle(gameholder, null).getPropertyValue('padding-left'))
        let h = gameholder.clientHeight - 2 * parseInt(window.getComputedStyle(gameholder, null).getPropertyValue('padding-top'))
        let cellW = Math.min(w, h) / gridSize
        grid.style.gridTemplateColumns = `repeat(${gridSize}, ${cellW}px [col-start])`
        grid.style.gridTemplateRows = `repeat(${gridSize}, ${cellW}px [col-start])`
    }

    function createGrid(gridSize) {
        let html = ''
        for (let i = 0; i < gridSize * gridSize; i++) {
            html += `<div id="${i}" class="cell"></div>`
        }
        grid.innerHTML = html
        resizeTabe(gridSize)
        cells().forEach(e => {
            e.onclick = cellClickHandler
        })
    }

    function handleInGameResponse(state) {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.style.backgroundColor = '#ffffff'
        })

        for (const [id, player] of Object.entries(state.players)) {
            let color = player.color
            if (player.isDead){
                document.getElementById(id).style.textDecoration = 'line-through'
            }
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
                cell.style.border = '10px solid #3b3b3b'
            }
        })

        timer.textContent = `${Math.round(state.timer)}`
        turns.textContent = `${state.turns}`

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

        document.querySelectorAll('#players > li').forEach(e => e.style.color = 'white')
        if(state.que[state.currentPlayer]) {
            document.getElementById(state.que[state.currentPlayer]).style.color = 'yellow'
        }

        if(state.que.length === 1){
            //GAME OVER
        }        
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
    }

    startButton.onclick = () => {
        socket.emit('create_room', {
            gridSize: gridSizeInput.value,
            shipsCount: shipsCount.value,
            player: this.state.player
        })
        gameForm.style.display = "none"
        gameDetails.style.display = "flex"
        this.hasStarted = true
    }

    copyButton.onclick = () => {
        copyInput.select()
        copyInput.setSelectionRange(0, 99999)
        document.execCommand("copy")
    }

    gridSizeInput.onchange = (e) => {
        this.state.gridSize = e.target.value
        createGrid(e.target.value)
    }

    /*
        @SOCKET EVENTS
    */

    socket.on('game_code', code => {
        roomCode.textContent = code
        copyInput.value = code
        //ADD START BUTTON
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

                li.append(div)
                li.appendChild(p)
                players.appendChild(li)
            }
        }
        codeInput.value = ''
        gameForm.style.display = "none"
        gameDetails.style.display = "flex"

    })
    socket.on('start_game', gameCode => {
        const startButton = document.createElement('button')
        startButton.textContent = 'START'
        startButton.style.marginTop = 'auto'
        startButton.onclick = () => {
            socket.emit('start_game', gameCode)
            startButton.remove()
        }
        gameDetails.appendChild(startButton)
    })
    socket.on('resize_grid', gridSize => {
        this.state.gridSize = gridSize
        createGrid(gridSize)
    })
    socket.on('disconnect_room', id => {
        document.getElementById(id).remove()
    })
    socket.on('response', response => console.log(response))
    socket.on('in_game', state => {
        gameInfo.style.display = 'block'
        handleInGameResponse(state)
    })
    socket.on('game_over', state => handleInGameResponse(state))

}).call(this)