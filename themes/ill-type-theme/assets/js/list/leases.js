import { row, a, n } from './music.js';

// DOM elements
const leasesModal = document.getElementById('leasesModal');
const leasesModalContent = document.getElementById('modal-leases-content');
const showLeasesBtn = document.getElementById('showLeasesBtn');

const cartModal = document.getElementById('cartModal');               // renamed
const checkoutModal = document.getElementById('checkoutModal');       // separate

const backToLeasesBtn = document.getElementById('backToLeasesBtn');
const backToCartBtn = document.getElementById('backToCartBtn');
const checkoutButton = document.getElementById('checkoutButton');     // inside cartModal
const payButton = document.getElementById('payButton'); 
const cartTotal = document.getElementsByClassName('.carttotal');

// ---------- Modal handling ----------
function updateLeasesModalContent() {
  if (typeof n === 'undefined' || typeof a === 'undefined' || !row.length) {
    leasesModalContent.innerHTML = '<p>Player not ready.</p>';
    return;
  }
  const currentRowIndex = a[n];
  const currentRow = row[currentRowIndex];
  if (!currentRow) {
    leasesModalContent.innerHTML = '<p>Current track not found.</p>';
    return;
  }

  const variantsContainer = currentRow.querySelector('.variants-container');
  if (variantsContainer) {
    leasesModalContent.innerHTML = variantsContainer.innerHTML;
  } else {
    leasesModalContent.innerHTML = '<p>No lease options available for this track.</p>';
  }
}

function toggleLeasesModal() {
  if (leasesModal.style.display === 'none') {
    updateLeasesModalContent();
    leasesModal.style.display = 'block';
  } else {
    leasesModal.style.display = 'none';
  }
}

function openCartModal() {
  // Close any other modal
  leasesModal.style.display = 'none';
  checkoutModal.style.display = 'none';
  if (typeof populateCart === 'function') {
    populateCart(); // fill cart table
  }
  cartModal.style.display = 'block';
}

function closeCartModal() {
  cartModal.style.display = 'none';
}

function openCheckoutModal() {
  cartModal.style.display = 'none';
  // Optionally populate the form with previously entered data if needed
  checkoutModal.style.display = 'block';
}

function closeCheckoutModal() {
  checkoutModal.style.display = 'none';
}

// ---------- Leases modal interaction ----------
if (leasesModalContent) {
  leasesModalContent.addEventListener('click', (event) => {
    // Auto-add lease option when clicked (select + add)
    const leaseOption = event.target.closest('.lease-option');
    if (leaseOption) {
      // Remove selected class from all, then add to clicked one
      leasesModalContent.querySelectorAll('.lease-option').forEach(opt => opt.classList.remove('selected'));
      leaseOption.classList.add('selected');

      // Auto-add to cart (replaces previous lease for this track)
      const sku = leaseOption.dataset.sku;
      const title = leaseOption.dataset.title;
      const variantname = leaseOption.dataset.variantname;
      const price = parseFloat(leaseOption.dataset.price);
      if (typeof window.addLeaseToCart === 'function') {
        window.addLeaseToCart(sku, title, variantname, price);
        // Optional visual feedback: briefly flash the lease option
        leaseOption.style.backgroundColor = '#e0ffe0';
        setTimeout(() => { leaseOption.style.backgroundColor = ''; }, 300);
      }
      return;
    }

    // CART button (class="checkout") now opens cartModal
    if (event.target.classList.contains('checkout')) {
      openCartModal();
      return;
    }
  });
}

// ---------- Cart modal interaction ----------
if (checkoutButton) { 
	checkoutButton.addEventListener('click', () => { 
		const cart = JSON.parse(localStorage.getItem('cart')) || []; 
    	if (cart.length === 0) {
    	  return;
    	}
		openCheckoutModal(); 
  });
}

if (backToLeasesBtn) {
  backToLeasesBtn.addEventListener('click', () => {
    closeCartModal();
    toggleLeasesModal();
  });
}

// ---------- Checkout modal interaction ----------
if (backToCartBtn) {
  backToCartBtn.addEventListener('click', () => {
    closeCheckoutModal();
    openCartModal();
  });
}

// Close modals when clicking outside
window.addEventListener('click', (event) => {
  if (event.target === cartModal) {
    closeCartModal(); 
  }
  if (event.target === checkoutModal) {
    closeCheckoutModal();
  }
});

// ShowLeasesBtn: close other modals if open, then toggle leases modal
if (showLeasesBtn) {
  showLeasesBtn.addEventListener('click', () => {
    const isLeasesOpen = leasesModal && leasesModal.style.display === 'block';
    const isCartOpen = cartModal && cartModal.style.display === 'block';
    const isCheckoutOpen = checkoutModal && checkoutModal.style.display === 'block';

    const anyModalOpen = isLeasesOpen || isCartOpen || isCheckoutOpen;

    if (anyModalOpen) {
      // Close all modals
      if (leasesModal) leasesModal.style.display = 'none';
      if (cartModal) cartModal.style.display = 'none';
      if (checkoutModal) checkoutModal.style.display = 'none';
    } else {
      // No modal open → open leases modal
      updateLeasesModalContent();   // refresh content before showing
      leasesModal.style.display = 'block';
    }
  });
}

// ---------- Pay button ----------
const BACKEND_URL = 'https://kimstore.fly.dev';
//const PAYPAL_CLIENT_ID = 'Acq7j2qfe8QY4vkHy6l7EPh-ehOzvNJyAJLGzNbZLM0SMVOSCe83mc3AEkp1tBc8UWX3TyxeiNFk9SEv';
const PAYPAL_CLIENT_ID = 'AbJ0sYwJCxsUtdxnFX4RkWot_yjFUHAMGghnSNypRe6FxPSgwuAYem8bjobOtx7ntgVZ8rnv4YNee8Bw';

let currentInternalOrderId = null;

function loadPayPalSDK() {
    return new Promise((resolve, reject) => {
        if (window.paypal && typeof window.paypal.Buttons === 'function') {
            return resolve();
        }

        // Define a global callback that PayPal will call when ready
        window.paypalOnInit = resolve; 
    });
}

function renderPayPalButton(paypalOrderId, internalOrderId) {
    const container = document.getElementById('paypal-button-container');
    if (!container) {
        console.error('PayPal button container not found');
        return;
    }
    container.style.display = 'block';
    container.innerHTML = '';

    paypal.Buttons({
        createOrder: function() {
            return paypalOrderId;
        },
        onApprove: async function() {
            try {
                const response = await fetch(`${BACKEND_URL}/api/orders/${internalOrderId}/capture`, {
                    method: 'POST'
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                window.location.href = `/success/?order_id=${internalOrderId}`;
            } catch (err) {
                console.error('Capture error:', err);
                alert('Payment capture failed. Please contact support.');
            }
        },
        onCancel: function() {
            window.location.href = '/cancel';
        },
        onError: function(err) {
            console.error('PayPal error:', err);
            alert('Payment error. Please try again.');
        }
    }).render(container);
}

if (payButton) {
    payButton.addEventListener('click', async (e) => {
        e.preventDefault();

        // Gather form data
        const name = document.getElementById('customer-name').value.trim();
        const email = document.getElementById('customer-email').value.trim();
        const artistName = document.getElementById('artist-name').value.trim();
        const address = document.getElementById('customer-address').value.trim();

        if (!name || !email || !address || !artistName) {
            alert('Please fill all fields');
            return;
        }

        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        if (cart.length === 0) {
            alert('Your cart is empty.');
            return;
        }

        const metadata = {
            cart: cart.map(item => ({
                track_name: item.title,
                lease_type: item.variantname
            })),
            customer: {
                legal_name: name,
                legal_address: address,
                artist_name: artistName,
                email: email
            }
        };

        const total = cart.reduce((sum, i) => sum + i.price, 0).toFixed(2);

        payButton.textContent = 'Creating order...';
        payButton.disabled = true;

        try {
            await loadPayPalSDK();

            const response = await fetch(`${BACKEND_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currency: 'USD',
                    amount: total,
                    description: 'Music Lease Purchase',
                    metadata: metadata
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create order');

            currentInternalOrderId = data.order_id;

            // Hide the PAY button, show PayPal button container
            payButton.style.display = 'none';
            renderPayPalButton(data.paypal_order_id, data.order_id);
        } catch (err) {
            console.error(err);
            alert('Failed to create order: ' + err.message);
            payButton.textContent = 'Pay';
            payButton.disabled = false;
        }
    });
}

// Initial cart badge update
if (typeof updateCartCount === 'function') {
  updateCartCount();
}
