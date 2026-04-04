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

// ---------- Pay button (unchanged except maybe small improvements) ----------
if (payButton) {
  const artistNameInput = document.getElementById('artist-name');
  const nameInput = document.getElementById('customer-name');
  const addressInput = document.getElementById('customer-address');
  const emailInput = document.getElementById('customer-email');

  function removeInvalidClass(e) {
    e.target.classList.remove('invalid');
  }
  nameInput.addEventListener('input', removeInvalidClass);
  emailInput.addEventListener('input', removeInvalidClass);
  artistNameInput.addEventListener('input', removeInvalidClass);
  addressInput.addEventListener('input', removeInvalidClass);

  payButton.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const artistName = artistNameInput.value.trim();
    const address = addressInput.value.trim();

    const visitorId = localStorage.getItem('visitor_id');
    const sessionId = sessionStorage.getItem('session_id');

    let isValid = true;

    if (!name) {
      nameInput.classList.add('invalid');
      isValid = false;
    }
    if (!email) {
      emailInput.classList.add('invalid');
      isValid = false;
    }
    if (!address) {
      addressInput.classList.add('invalid');
      isValid = false;
    }
    if (!artistName) {
      artistNameInput.classList.add('invalid');
      isValid = false;
    }

    if (!isValid) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + item.price, 0);

    payButton.textContent = 'Creating payment...';
    payButton.disabled = true;

    try {
      const response = await fetch('http://localhost:8080/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          total,
          customerName: name,
          customerAddress: address,
          customerEmail: email,
          artistName: artistName,
          visitorId: visitorId,
          sessionId: sessionId
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.downloadUrl) {
          window.location.href = data.downloadUrl;
        } else if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          throw new Error('No payment URL or download URL returned');
        }
      } else {
        throw new Error(data.error || 'Payment creation failed');
      }
    } catch (error) {
      console.error(error);
      const errorMsg = document.createElement('div');
      //errorMsg.textContent = 'Could not start payment. Please try again.';
      errorMsg.textContent = 'Payment service not yet initialized, coming soon.';
      errorMsg.style.color = 'red';
      errorMsg.style.fontSize = '12px';
      errorMsg.style.marginTop = '10px';
      const modalContent = document.querySelector('#checkoutModal .modal-content');
      const existingError = modalContent.querySelector('.payment-error');
      if (existingError) existingError.remove();
      errorMsg.className = 'payment-error';
      modalContent.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
    } finally {
      payButton.textContent = 'Pay';
      payButton.disabled = false;
    }
  });
}

// Initial cart badge update
if (typeof updateCartCount === 'function') {
  updateCartCount();
}
