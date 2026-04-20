// Run on page load
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const orderId = params.get('order_id');

    if (paymentStatus === 'success') {
        showPaymentIcon(true);
        window.history.replaceState({}, document.title, '/');
    } else if (paymentStatus === 'cancelled') {
        showPaymentIcon(false);
        window.history.replaceState({}, document.title, '/');
    }
});

function showPaymentIcon(success) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    // Icon only — no text, no close button
    modal.innerHTML = `
        <div class="modal-content" style="text-align: center; padding: 2rem;">
            <span style="font-size: 5rem; color: ${success ? '#2e7d32' : '#c62828'};">
                ${success ? '✅' : '❌'}
            </span>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        modal.remove();
    }, 3000);
}