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

    const gridSize = 16; // 16x16 grid
    let tileSize = gridCanvas.width / gridSize;

    let selectedBlock = null;
    let backgroundType = 'none';
    let timeOfDay = 'day';

    // Layers: background and foreground
    let layers = {
        background: Array(gridSize).fill().map(() => Array(gridSize).fill(null)),
        foreground: Array(gridSize).fill().map(() => Array(gridSize).fill(null))
    };

    // Define block types with code-generated graphics and animations
    const blocks = [
        {
            name: 'Wall',
            animated: false,
            draw: (context, x, y, size, rotation = 0, frame = 0) => {
                context.save();
                context.translate(x + size / 2, y + size / 2);
                context.rotate(rotation);
                context.translate(-size / 2, -size / 2);
                // Advanced 8-bit graphics with shading
                let gradient = context.createLinearGradient(0, 0, size, size);
                gradient.addColorStop(0, '#888');
                gradient.addColorStop(1, '#555');
                context.fillStyle = gradient;
                context.fillRect(0, 0, size, size);
                context.restore();
            }
        },
        {
            name: 'Torch',
            animated: true,
            draw: (context, x, y, size, rotation = 0, frame = 0) => {
                context.save();
                context.translate(x + size / 2, y + size / 2);
                context.rotate(rotation);
                context.translate(-size / 2, -size / 2);
                // Torch base
                context.fillStyle = '#8B4513';
                context.fillRect(size / 2 - 2, size / 2, 4, size / 2);
                // Flame particle effect
                let flameHeight = (Math.sin(frame / 10) + 1) * 5 + 5;
                context.fillStyle = '#FFA500';
                context.beginPath();
                context.moveTo(size / 2, size / 2);
                context.lineTo(size / 2 - 5, size / 2 - flameHeight);
                context.lineTo(size / 2 + 5, size / 2 - flameHeight);
                context.closePath();
                context.fill();
                context.restore();
            }
        },
        {
            name: 'Villager',
            animated: true,
            isNPC: true,
            draw: (context, x, y, size, rotation = 0, frame = 0) => {
                context.save();
                // Simple animation: moving up and down
                let offsetY = Math.sin(frame / 30) * 2;
                context.translate(x, y + offsetY);
                // Head
                context.fillStyle = '#FFDAB9';
                context.fillRect(size / 4, 0, size / 2, size / 2);
                // Body
                context.fillStyle = '#8B4513';
                context.fillRect(size / 4, size / 2, size / 2, size / 2);
                context.restore();
            }
        },
        {
            name: 'Door',
            animated: false,
            interactive: true,
            state: 'closed',
            draw: (context, x, y, size, rotation = 0, frame = 0, state = 'closed') => {
                context.save();
                context.translate(x + size / 2, y + size / 2);
                context.rotate(rotation);
                context.translate(-size / 2, -size / 2);
                if (state === 'closed') {
                    // Closed door
                    context.fillStyle = '#654321';
                    context.fillRect(0, 0, size, size);
                    context.fillStyle = '#321000';
                    context.fillRect(size / 4, size / 4, size / 2, size * 3 / 4);
                } else {
                    // Open door
                    context.fillStyle = '#654321';
                    context.fillRect(0, 0, size, size);
                    context.fillStyle = '#321000';
                    context.fillRect(0, size / 4, size / 4, size * 3 / 4);
                }
                context.restore();
            },
            onClick: (blockInfo) => {
                // Toggle door state
                blockInfo.state = blockInfo.state === 'closed' ? 'open' : 'closed';
            }
        },
        {
            name: 'Bridge',
            animated: false,
            interactive: true,
            state: 'retracted',
            draw: (context, x, y, size, rotation = 0, frame = 0, state = 'retracted') => {
                context.save();
                context.translate(x + size / 2, y + size / 2);
                context.rotate(rotation);
                context.translate(-size / 2, -size / 2);
                context.fillStyle = '#A0522D';
                if (state === 'extended') {
                    context.fillRect(0, size / 3, size, size / 3);
                } else {
                    context.fillRect(size / 3, size / 3, size / 3, size / 3);
                }
                context.restore();
            },
            onClick: (blockInfo) => {
                // Toggle bridge state
                blockInfo.state = blockInfo.state === 'retracted' ? 'extended' : 'retracted';
            }
        },
        // ... (Other blocks with similar structure)
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
});
 
