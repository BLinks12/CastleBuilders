document.addEventListener('DOMContentLoaded', () => {
    const blockPalette = document.getElementById('block-palette');
    const gridCanvas = document.getElementById('grid-canvas');
    const ctx = gridCanvas.getContext('2d');
    const saveButton = document.getElementById('save-button');
    const clearButton = document.getElementById('clear-button');
    const exportButton = document.getElementById('export-button');
    const rotateCheckbox = document.getElementById('rotate-checkbox');
    const backgroundSelect = document.getElementById('background-select');
    const layerSelect = document.getElementById('layer-select');
    const toolSelect = document.getElementById('tool-select');
    const timeSelect = document.getElementById('time-select');
    const tickerValueElement = document.getElementById('ticker-value');
    const holdersCountElement = document.getElementById('holders-count');

    const gridSize = 16; // 16x16 grid
    let tileSize = gridCanvas.width / gridSize;

    let selectedBlock = null;
    let backgroundType = 'none';
    let timeOfDay = 'day';

    // Ticker and Holder Count Variables
    let tickerValue = 1000;
    let holdersCount = 100;

    // Layers: background and foreground
    let layers = {
        background: Array(gridSize).fill().map(() => Array(gridSize).fill(null)),
        foreground: Array(gridSize).fill().map(() => Array(gridSize).fill(null))
    };

    // Define block types with code-generated graphics and animations
    const blocks = [
        // Existing blocks...
    ];

    function loadBlocks() {
        blockPalette.innerHTML = ''; // Clear existing blocks
        blocks.forEach((block, index) => {
            const blockElement = document.createElement('div');
            blockElement.classList.add('block-item');
            blockElement.dataset.index = index;
            // Draw block preview
            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = 32;
            previewCanvas.height = 32;
            const previewCtx = previewCanvas.getContext('2d');
            block.draw(previewCtx, 0, 0, 32);
            blockElement.style.backgroundImage = `url(${previewCanvas.toDataURL()})`;
            blockElement.addEventListener('click', selectBlock);
            blockPalette.appendChild(blockElement);
        });
    }

    function selectBlock(event) {
        // Deselect previous
        const blockItems = document.querySelectorAll('.block-item');
        blockItems.forEach(item => item.classList.remove('selected'));

        // Select new
        const index = event.currentTarget.dataset.index;
        selectedBlock = blocks[index];
        event.currentTarget.classList.add('selected');
    }

    function drawGrid(frame = 0) {
        // Draw background
        drawBackground();

        // Adjust for time of day
        if (timeOfDay === 'night') {
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);
            ctx.globalAlpha = 1;
        }

        // Draw grid lines
        ctx.strokeStyle = '#333';
        for (let i = 0; i <= gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * tileSize, 0);
            ctx.lineTo(i * tileSize, gridCanvas.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * tileSize);
            ctx.lineTo(gridCanvas.width, i * tileSize);
            ctx.stroke();
        }

        // Draw layers
        ['background', 'foreground'].forEach(layerName => {
            const layer = layers[layerName];
            for (let x = 0; x < gridSize; x++) {
                for (let y = 0; y < gridSize; y++) {
                    const blockInfo = layer[x][y];
                    if (blockInfo) {
                        const { block, rotation, state } = blockInfo;
                        block.draw(ctx, x * tileSize, y * tileSize, tileSize, rotation, frame, state);
                    }
                }
            }
        });
    }

    function drawBackground() {
        switch (backgroundType) {
            case 'grass':
                ctx.fillStyle = '#228B22';
                break;
            case 'sand':
                ctx.fillStyle = '#DEB887';
                break;
            case 'water':
                ctx.fillStyle = '#1E90FF';
                break;
            default:
                ctx.fillStyle = '#1a1a1a';
        }
        ctx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);
    }

    function placeBlock(event) {
        if (!selectedBlock && toolSelect.value === 'draw') return;

        const rect = gridCanvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / tileSize);
        const y = Math.floor((event.clientY - rect.top) / tileSize);

        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            const layer = layers[layerSelect.value];

            if (toolSelect.value === 'draw') {
                const rotation = rotateCheckbox.checked ? Math.PI / 2 : 0;
                layer[x][y] = { block: selectedBlock, rotation, state: selectedBlock.state || null };
            } else if (toolSelect.value === 'erase') {
                layer[x][y] = null;
            }

            drawGrid();
        }
    }

    function handleBlockInteraction(event) {
        const rect = gridCanvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / tileSize);
        const y = Math.floor((event.clientY - rect.top) / tileSize);

        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            const layerNames = ['foreground', 'background'];
            for (const layerName of layerNames) {
                const layer = layers[layerName];
                const blockInfo = layer[x][y];
                if (blockInfo && blockInfo.block.interactive && blockInfo.block.onClick) {
                    blockInfo.block.onClick(blockInfo);
                    drawGrid();
                    break;
                }
            }
        }
    }

    function saveCastle() {
        const castleData = JSON.stringify({
            layers: {
                background: layers.background.map(row => row.map(cell => {
                    if (cell) {
                        return {
                            name: cell.block.name,
                            rotation: cell.rotation,
                            state: cell.state
                        };
                    }
                    return null;
                })),
                foreground: layers.foreground.map(row => row.map(cell => {
                    if (cell) {
                        return {
                            name: cell.block.name,
                            rotation: cell.rotation,
                            state: cell.state
                        };
                    }
                    return null;
                }))
            },
            backgroundType,
            timeOfDay
        });
        localStorage.setItem('savedCastle', castleData);
        alert('Your castle has been saved!');
    }

    function clearGrid() {
        if (confirm('Are you sure you want to clear the grid?')) {
            layers.background = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
            layers.foreground = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
            drawGrid();
        }
    }

    function loadSavedCastle() {
        const savedData = localStorage.getItem('savedCastle');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            ['background', 'foreground'].forEach(layerName => {
                layers[layerName] = parsedData.layers[layerName].map(row => row.map(cell => {
                    if (cell) {
                        const block = blocks.find(b => b.name === cell.name);
                        return { block, rotation: cell.rotation, state: cell.state };
                    }
                    return null;
                }));
            });
            backgroundType = parsedData.backgroundType || 'none';
            timeOfDay = parsedData.timeOfDay || 'day';
            backgroundSelect.value = backgroundType;
            timeSelect.value = timeOfDay;
            drawGrid();
        }
    }

    function exportCastle() {
        const link = document.createElement('a');
        link.download = 'my_castle.png';
        link.href = gridCanvas.toDataURL();
        link.click();
    }

    function changeBackground() {
        backgroundType = backgroundSelect.value;
        drawGrid();
    }

    function changeTimeOfDay() {
        timeOfDay = timeSelect.value;
        drawGrid();
    }

    // Ticker Simulation
    function updateTicker() {
        const change = (Math.random() * 10 - 5).toFixed(2);
        tickerValue = (parseFloat(tickerValue) + parseFloat(change)).toFixed(2);
        tickerValueElement.textContent = tickerValue;
    }

    // Holder Count Simulation
    function updateHolderCount() {
        holdersCount--;
        if (holdersCount <= 0) {
            holdersCount = 100;
            alert('The ancient AI has added new pieces of art to your builder!');
            unlockNewBlocks();
        }
        holdersCountElement.textContent = holdersCount;
    }

    function unlockNewBlocks() {
        // Logic to unlock new blocks
        // For simplicity, we can assume new blocks are added to the 'blocks' array
        // In this example, we'll just add a placeholder block
        const newBlock = {
            name: `New Block ${blocks.length + 1}`,
            animated: false,
            draw: (context, x, y, size) => {
                context.fillStyle = `#${Math.floor(Math.random()*16777215).toString(16)}`;
                context.fillRect(x, y, size, size);
            }
        };
        blocks.push(newBlock);
        loadBlocks();
    }

    // Animation Loop
    let frameCount = 0;
    function animate() {
        drawGrid(frameCount);
        frameCount++;
        requestAnimationFrame(animate);
    }

    // Adjust canvas size on window resize
    function resizeCanvas() {
        const minDimension = Math.min(window.innerWidth, window.innerHeight) - 100;
        gridCanvas.width = minDimension;
        gridCanvas.height = minDimension;
        tileSize = gridCanvas.width / gridSize;
        drawGrid();
    }

    // Add touch support
    gridCanvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        const touch = event.touches[0];
        placeBlock({ clientX: touch.clientX, clientY: touch.clientY });
    }, false);

    // Event Listeners
    gridCanvas.addEventListener('click', (event) => {
        if (toolSelect.value === 'draw' || toolSelect.value === 'erase') {
            placeBlock(event);
        } else {
            handleBlockInteraction(event);
        }
    });
    saveButton.addEventListener('click', saveCastle);
    clearButton.addEventListener('click', clearGrid);
    exportButton.addEventListener('click', exportCastle);
    backgroundSelect.addEventListener('change', changeBackground);
    timeSelect.addEventListener('change', changeTimeOfDay);
    window.addEventListener('resize', resizeCanvas);

    // Initialize
    loadBlocks();
    drawGrid();
    loadSavedCastle();
    resizeCanvas();
    animate(); // Start the animation loop

    // Start Ticker and Holder Count Updates
    setInterval(updateTicker, 2000); // Update ticker every 2 seconds
    setInterval(updateHolderCount, 5000); // Update holder count every 5 seconds
});
