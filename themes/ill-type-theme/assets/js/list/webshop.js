// webshop.js – simplified for leases, with global functions

// Cart badge
window.updateCartCount = function() {
    let cart = localStorage.getItem('cart');
    if (cart) cart = JSON.parse(cart);
    else cart = [];

    const itemcount = cart.length;
    const badge = document.querySelector('.itemcount');
    if (badge) {
        badge.textContent = itemcount;
        badge.style.display = itemcount > 0 ? 'inline-block' : 'none';
    }
};

// Populate the shopping cart table
window.populateCart = function() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const tbody = document.querySelector('#shoppingcart tbody');
    let cartTotal = 0;

    if (cart.length === 0) {
        tbody.innerHTML = '<td colspan="4">Nothing in cart.</td></tr>';
        document.querySelectorAll('.carttotal').forEach(el => el.innerHTML = '0');
        updateCartCount();
        return;
    }

    tbody.innerHTML = '';
    for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        const row = tbody.insertRow();

        // Track title
        const titleCell = row.insertCell(0);
        titleCell.textContent = item.title;

        // Lease type
        const leaseCell = row.insertCell(1);
        leaseCell.textContent = item.variantname || '';

        // Price
        const priceCell = row.insertCell(2);
        priceCell.textContent = `$${item.price.toFixed(0)}`;
        cartTotal += item.price;

        // Remove button
        const removeCell = row.insertCell(3);
        const removeBtn = document.createElement('a');
        removeBtn.href = 'javascript:void(0)';
        removeBtn.innerHTML = 'X';
        removeBtn.onclick = (function(sku) {
            return function() { removeFromCart(sku); };
        })(item.sku);
        removeCell.appendChild(removeBtn);
    }

    document.querySelectorAll('.carttotal').forEach(el => el.innerHTML = cartTotal.toFixed(0));
    updateCartCount();
};

// Remove item from cart by SKU
window.removeFromCart = function(sku) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => item.sku !== sku);
    localStorage.setItem('cart', JSON.stringify(cart));
    populateCart();
    updateCartCount();
};

// Add lease to cart, only one lease per track
window.addLeaseToCart = function(sku, title, variantname, price) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // Remove any existing lease for the same track
    cart = cart.filter(item => item.title !== title);

    const newItem = {
        url: window.location.href,
        sku: sku,
        title: title,
        varianttype: 'lease',
        variantname: variantname,
        price: price,
        quantity: 1
    };
    cart.push(newItem);

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    // Refresh cart display if the checkout modal is open
    if (document.getElementById('checkoutModal') && document.getElementById('checkoutModal').style.display === 'block') {
        populateCart();
    }
};

// Initialise on page load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('shoppingcart')) populateCart();
    updateCartCount();
});
