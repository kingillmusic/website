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

// Get form elements
const nameInput = document.getElementById('customer-name');
const addressInput = document.getElementById('customer-address');
const emailInput = document.getElementById('customer-email');
const artistInput = document.getElementById('artist-name');

const nameError = document.getElementById('name-error');
const addressError = document.getElementById('address-error');
const emailError = document.getElementById('email-error');
const artistError = document.getElementById('artist-error');

const BACKEND_URL = 'https://kimstore.fly.dev';
// live
const PAYPAL_CLIENT_ID = 'Acq7j2qfe8QY4vkHy6l7EPh-ehOzvNJyAJLGzNbZLM0SMVOSCe83mc3AEkp1tBc8UWX3TyxeiNFk9SEv';
// sandbox
// const PAYPAL_CLIENT_ID = 'AbJ0sYwJCxsUtdxnFX4RkWot_yjFUHAMGghnSNypRe6FxPSgwuAYem8bjobOtx7ntgVZ8rnv4YNee8Bw';

const paypalContainer = document.getElementById('paypal-button-container');
const incompleteMessage = document.getElementById('form-incomplete-message');

let paypalRendered = false; 

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

// Validation functions
function validateName() {
    const value = nameInput.value.trim();
    if (value === '') {
        nameInput.classList.add('invalid');
        return false;
    }
    nameError.textContent = '';
    nameInput.classList.remove('invalid');
    return true;
}

function validateAddress() {
    const value = addressInput.value.trim();
    if (value === '') {
        addressInput.classList.add('invalid');
        return false;
    }
    addressError.textContent = '';
    addressInput.classList.remove('invalid');
    return true;
}

function validateEmail() {
    const value = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value === '') {
        emailInput.classList.add('invalid');
        return false;
    } else if (!emailRegex.test(value)) {
        emailInput.classList.add('invalid');
        return false;
    }
    emailError.textContent = '';
    emailInput.classList.remove('invalid');
    return true;
}

function validateArtist() {
    const value = artistInput.value.trim();
    if (value === '') {
        artistInput.classList.add('invalid');
        return false;
    }
    artistError.textContent = '';
    artistInput.classList.remove('invalid');
    return true;
}

function isFormValid() {
    return validateName() & validateAddress() & validateEmail() & validateArtist();
}

function renderPayPalButton() {
    if (paypalRendered) return;
    paypalRendered = true;

    paypalContainer.innerHTML = '';
    paypal.Buttons({
        style: {
            layout: 'horizontal',
            color:  'silver',
            shape:  'rect',
            label:  'paypal',
            height: 40,
            tagline: false
        },
        createOrder: async function() {
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const artistName = artistInput.value.trim();
            const address = addressInput.value.trim();

            const cart = JSON.parse(localStorage.getItem('cart')) || [];

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

            localStorage.setItem('currentInternalOrderId', data.order_id);
            return data.paypal_order_id;
        },
        onApprove: async function(data) {
            const internalOrderId = localStorage.getItem('currentInternalOrderId');
            const response = await fetch(`${BACKEND_URL}/api/orders/${internalOrderId}/capture`, {
                method: 'POST'
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            window.location.href = '/success/?order_id=' + internalOrderId;
        },
        onCancel: function() {
            window.location.href = '/cancel';
        },
        onError: function(err) {
            console.error('PayPal error:', err);
            alert('Payment error. Please try again.');
        }
    }).render(paypalContainer);
}

function updatePayPalButtonState() {
    if (isFormValid()) {
        paypalContainer.style.display = 'block';
        incompleteMessage.style.display = 'none';
        renderPayPalButton();
    } else {
        paypalContainer.style.display = 'none';
        incompleteMessage.style.display = 'block';
        paypalRendered = false;
    }
}

// Attach listeners
[nameInput, addressInput, emailInput, artistInput].forEach(input => {
    input.addEventListener('input', updatePayPalButtonState);
});

// When checkout modal opens, reset state and trigger validation
function openCheckoutModal() {
    cartModal.style.display = 'none';
    checkoutModal.style.display = 'block';
    paypalRendered = false;
    updatePayPalButtonState();
}

// Initial cart badge update
if (typeof updateCartCount === 'function') {
  updateCartCount();
}
