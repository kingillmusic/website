// Run on page load
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const orderId = params.get('order_id');

    if (paymentStatus === 'success') {
        showPaymentSuccessModal(orderId);
        // Clean the URL to prevent re‑triggering on refresh
        window.history.replaceState({}, document.title, '/');
    } else if (paymentStatus === 'cancelled') {
        showPaymentCancelledModal();
        window.history.replaceState({}, document.title, '/');
    }
});

function showPaymentSuccessModal(orderId) {
    // Example using your existing modal system
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Payment Successful!</h2>
            <p>Your order <strong>${orderId}</strong> has been completed.</p>
            <p>You will receive an email with download instructions shortly.</p>
            <button class="close-modal">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
}

function showPaymentCancelledModal() {
    // Similar implementation
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Payment Cancelled</h2>
            <p>Your order was not completed.</p>
            <button class="close-modal">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
}