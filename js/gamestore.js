class GameStore {
    constructor() {
        this.games = [];
        this.cart = [];
        this.vatRate = 0.07;
        this.shippingRate = 0.00;
        this.maxDisplayRows = 7;
        this.init();
    }

    async init() {
        await this.loadGames();
        this.setupEventListeners();
        this.populateGameSelect();
        this.updateDisplay();
        this.setCurrentDate();
    }

    setCurrentDate() {
        const now = new Date();
        const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
        document.getElementById('currentDate').textContent = dateStr;
        document.getElementById('shipDate').textContent = dateStr;
    }

    async loadGames() {
        try {
            const response = await fetch('./data/data.json');
            this.games = await response.json();
        } catch (error) {
            console.error('Error loading games:', error);
            this.showNotification('Error loading games data', 'error');
        }
    }

    setupEventListeners() {
        const gameSelect = document.getElementById('gameSelect');
        const addToCartBtn = document.getElementById('addToCartBtn');

        gameSelect.addEventListener('change', () => this.handleGameSelection());
        addToCartBtn.addEventListener('click', () => this.addToCart());

        const addGameModal = document.getElementById('addGameModal');
        addGameModal.addEventListener('hidden.bs.modal', () => this.resetModal());
    }

    populateGameSelect() {
        const gameSelect = document.getElementById('gameSelect');
        gameSelect.innerHTML = '<option value="">Choose a game...</option>';
        
        this.games.forEach(game => {
            const option = document.createElement('option');
            option.value = game.id;
            option.textContent = `${game.name} - ฿${game.price.toFixed(2)}`;
            gameSelect.appendChild(option);
        });
    }

    handleGameSelection() {
        const gameSelect = document.getElementById('gameSelect');
        const selectedGameId = parseInt(gameSelect.value);
        const gameDetailsSection = document.getElementById('gameDetailsSection');

        if (selectedGameId) {
            const game = this.games.find(g => g.id === selectedGameId);
            if (game) {
                this.displayGameDetails(game);
                gameDetailsSection.style.display = 'block';
            }
        } else {
            gameDetailsSection.style.display = 'none';
        }
    }

    displayGameDetails(game) {
        document.getElementById('selectedGameName').textContent = game.name;
        document.getElementById('selectedGameDescription').textContent = game.description;
        document.getElementById('selectedGameCategory').textContent = game.category;
        document.getElementById('selectedGamePlatform').textContent = game.platform;
        document.getElementById('selectedGamePrice').textContent = `฿${game.price.toFixed(2)}`;
    }

    addToCart() {
        const gameSelect = document.getElementById('gameSelect');
        const quantityInput = document.getElementById('quantity');
        
        const selectedGameId = parseInt(gameSelect.value);
        const quantity = parseInt(quantityInput.value);

        if (!selectedGameId || quantity < 1) {
            this.showNotification('Please select a game and valid quantity', 'error');
            return;
        }

        const game = this.games.find(g => g.id === selectedGameId);
        if (!game) {
            this.showNotification('Game not found', 'error');
            return;
        }

        const existingItem = this.cart.find(item => item.game.id === selectedGameId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                game: game,
                quantity: quantity
            });
        }

        this.updateDisplay();
        this.showNotification(`${game.name} added to cart!`, 'success');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addGameModal'));
        modal.hide();
    }

    removeFromCart(gameId) {
        const gameIdNum = parseInt(gameId);
        this.cart = this.cart.filter(item => item.game.id !== gameIdNum);
        this.updateDisplay();
        this.showNotification('Item removed from cart', 'info');
    }

    updateQuantity(gameId, newQuantity) {
        const gameIdNum = parseInt(gameId);
        const quantity = parseInt(newQuantity);
        
        if (quantity < 1) {
            this.removeFromCart(gameId);
            return;
        }

        const item = this.cart.find(item => item.game.id === gameIdNum);
        if (item) {
            item.quantity = quantity;
            this.updateDisplay();
        }
    }

    calculateTotals() {
        const subtotal = this.cart.reduce((total, item) => {
            return total + (item.game.price * item.quantity);
        }, 0);

        const vat = subtotal * this.vatRate;
        const shipping = subtotal > 0 ? this.shippingRate : 0;
        const total = subtotal + vat + shipping;

        return {
            subtotal: subtotal,
            vat: vat,
            shipping: shipping,
            total: total
        };
    }

    updateDisplay() {
        const cartTableBody = document.getElementById('cartTableBody');

        cartTableBody.innerHTML = '';

        this.cart.forEach(item => {
            const row = this.createCartRow(item);
            cartTableBody.appendChild(row);
        });

        const emptyRowsNeeded = Math.max(0, this.maxDisplayRows - this.cart.length);
        for (let i = 0; i < emptyRowsNeeded; i++) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-row';
            emptyRow.innerHTML = '<td>&nbsp;</td><td></td><td></td><td></td><td></td>';
            cartTableBody.appendChild(emptyRow);
        }

        this.updateTotals();
    }

    createCartRow(item) {
        const row = document.createElement('tr');
        const amount = item.game.price * item.quantity;

        row.innerHTML = `
            <td style="text-align: center;">
                <input type="number" 
                       value="${item.quantity}" 
                       min="1" 
                       max="10" 
                       onchange="gameStore.updateQuantity(${item.game.id}, this.value)"
                       class="quantity-input">
            </td>
            <td>
                <div class="game-info">
                    <div class="game-name">${item.game.name}</div>
                    <div class="game-details">${item.game.category} • ${item.game.platform}</div>
                    <div class="game-details">${item.game.description}</div>
                </div>
            </td>
            <td style="text-align: right;">฿${item.game.price.toFixed(2)}</td>
            <td style="text-align: right;">฿${amount.toFixed(2)}</td>
            <td style="text-align: center;">
                <button class="btn-danger" onclick="gameStore.removeFromCart(${item.game.id})" style="padding: 2px 6px; font-size: 10px;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        return row;
    }

    updateTotals() {
        const totals = this.calculateTotals();
        
        document.getElementById('subtotal').textContent = `฿${totals.subtotal.toFixed(2)}`;
        document.getElementById('vat').textContent = `฿${totals.vat.toFixed(2)}`;
        document.getElementById('shipping').textContent = totals.shipping.toFixed(2);
        document.getElementById('total').textContent = `฿${totals.total.toFixed(2)}`;
    }

    resetModal() {
        document.getElementById('gameSelect').value = '';
        document.getElementById('quantity').value = '1';
        document.getElementById('gameDetailsSection').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'success' ? 'alert-success' : 
                          'alert-info';

        const notification = document.createElement('div');
        notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px; 
            right: 20px; 
            z-index: 9999; 
            max-width: 400px;
            background-color: var(--surface-elevated);
            border: 1px solid var(--primary-color);
            color: var(--text-primary);
        `;
        
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gameStore = new GameStore();
});

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 2
    }).format(amount);
}; 