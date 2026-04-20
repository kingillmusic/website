function showPaymentIcon(success) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modal-content');
    
    // Replace content with icon only
    content.innerHTML = success 
        ? '<span style="font-size: 5rem; color: #2e7d32;">✅</span>'
        : '<span style="font-size: 5rem; color: #c62828;">❌</span>';
    
    // Remove any extra padding/margins that might be there from previous uses
    content.style.textAlign = 'center';
    content.style.padding = '2rem';
    
    // Show modal
    modal.style.display = 'block';
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        modal.style.display = 'none';
        // Optional: restore default content if needed later
    }, 3000);
}

// Trigger on homepage with query params
(function() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    
    if (status === 'success') {
        showPaymentIcon(true);
        window.history.replaceState({}, document.title, '/');
    } else if (status === 'cancelled') {
        showPaymentIcon(false);
        window.history.replaceState({}, document.title, '/');
    }
})();