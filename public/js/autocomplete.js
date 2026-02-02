// Customer Autocomplete
let customerTimeout;
let selectedCustomer = null;

function setupCustomerAutocomplete() {
    const customerInput = document.getElementById('customerName');
    const suggestionsDiv = document.getElementById('customerSuggestions');
    const customerIdInput = document.getElementById('customerId');

    if (!customerInput) return;

    customerInput.addEventListener('input', function () {
        const query = this.value.trim();

        clearTimeout(customerTimeout);

        if (query.length < 2) {
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.classList.add('hidden');
            clearCustomerSelection();
            return;
        }

        customerTimeout = setTimeout(() => {
            fetch(`/api/customers/search?q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(customers => {
                    if (customers.length === 0) {
                        suggestionsDiv.innerHTML = '<div class="px-5 py-4 text-sm text-gray-500 font-bold italic">No records found. Create new?</div>';
                        suggestionsDiv.classList.remove('hidden');
                        clearCustomerSelection();
                        return;
                    }

                    let html = '';
                    customers.forEach(customer => {
                        html += `
                            <div class="px-5 py-3 hover:bg-indigo-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0" onclick="selectCustomer('${customer._id}')">
                                <div class="font-black text-gray-900">${customer.customerName}</div>
                                <div class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">${customer.category || 'Standard'} • ${customer.mobileNo || 'Contact Hidden'}</div>
                            </div>
                        `;
                    });

                    suggestionsDiv.innerHTML = html;
                    suggestionsDiv.classList.remove('hidden');
                })
                .catch(error => {
                    console.error('Error fetching customers:', error);
                });
        }, 300);
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', function (e) {
        if (!customerInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.classList.add('hidden');
        }
    });
}

function selectCustomer(customerId) {
    fetch(`/api/customers/${customerId}`)
        .then(response => response.json())
        .then(customer => {
            selectedCustomer = customer;

            // Fill form fields
            document.getElementById('customerName').value = customer.customerName;
            document.getElementById('customerId').value = customer._id;
            document.getElementById('address').value = customer.address || '';
            document.getElementById('mobileNo').value = customer.mobileNo || '';
            document.getElementById('category').value = customer.category || '';

            // Freeze fields
            const fields = ['address', 'mobileNo', 'category'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el.tagName === 'SELECT') {
                    el.disabled = true;
                } else {
                    el.readOnly = true;
                }
                el.classList.remove('bg-gray-50');
                el.classList.add('bg-indigo-50/50', 'border-indigo-100', 'text-indigo-900');
            });

            // Hide suggestions
            document.getElementById('customerSuggestions').classList.add('hidden');
        })
        .catch(error => {
            console.error('Error fetching customer:', error);
        });
}

function clearCustomerSelection() {
    selectedCustomer = null;
    document.getElementById('customerId').value = '';

    // Unfreeze fields
    const fields = ['address', 'mobileNo', 'category'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el.tagName === 'SELECT') {
            el.disabled = false;
        } else {
            el.readOnly = false;
        }
        el.classList.add('bg-gray-50');
        el.classList.remove('bg-indigo-50/50', 'border-indigo-100', 'text-indigo-900');
    });
}

// Product Autocomplete
let productRows = 1;

function setupProductAutocomplete(rowId) {
    const productInput = document.getElementById(`productName_${rowId}`);
    const suggestionsDiv = document.getElementById(`productSuggestions_${rowId}`);
    const productIdInput = document.getElementById(`productId_${rowId}`);

    if (!productInput) return;

    let timeout;

    productInput.addEventListener('input', function () {
        const query = this.value.trim();

        clearTimeout(timeout);

        if (query.length < 2) {
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.classList.add('hidden');
            return;
        }

        timeout = setTimeout(() => {
            fetch(`/api/products/search?q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(products => {
                    if (products.length === 0) {
                        suggestionsDiv.innerHTML = '<div class="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Item not in catalog</div>';
                        suggestionsDiv.classList.remove('hidden');
                        return;
                    }

                    let html = '';
                    products.forEach(product => {
                        html += `
                            <div class="px-5 py-3 hover:bg-purple-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0" onclick="selectProduct('${product._id}', '${product.productName}', ${rowId})">
                                <div class="font-black text-gray-900 text-sm">${product.productName}</div>
                                <div class="text-[9px] font-black text-purple-600 uppercase tracking-widest">${product.packaging || 'Standard Unit'}</div>
                            </div>
                        `;
                    });

                    suggestionsDiv.innerHTML = html;
                    suggestionsDiv.classList.remove('hidden');
                })
                .catch(error => {
                    console.error('Error fetching products:', error);
                });
        }, 300);
    });

    // Close suggestions
    document.addEventListener('click', function (e) {
        if (!productInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.classList.add('hidden');
        }
    });
}

function selectProduct(productId, productName, rowId) {
    document.getElementById(`productId_${rowId}`).value = productId;
    document.getElementById(`productName_${rowId}`).value = productName;
    document.getElementById(`productSuggestions_${rowId}`).classList.add('hidden');
}

function addProductRow() {
    productRows++;
    const container = document.getElementById('productsContainer');

    const row = document.createElement('div');
    row.className = 'group relative bg-gray-50/50 p-6 rounded-3xl border-2 border-dashed border-gray-200 animate-in slide-in-from-top-2 duration-300';
    row.id = `productRow_${productRows}`;
    row.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div class="md:col-span-5 space-y-2">
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Catalog Search</label>
                <div class="relative">
                    <input type="text" id="productName_${productRows}" placeholder="Search product line..." autocomplete="off"
                        class="w-full px-5 py-3 bg-white border-2 border-transparent rounded-2xl focus:border-purple-500 transition-all outline-none font-bold text-gray-900 shadow-sm">
                    <input type="hidden" id="productId_${productRows}">
                    <div class="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 hidden" id="productSuggestions_${productRows}"></div>
                </div>
            </div>
            <div class="md:col-span-3 space-y-2">
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate</label>
                <input type="number" id="rate_${productRows}" min="0" step="0.01" placeholder="0.00"
                    class="w-full px-5 py-3 bg-white border-2 border-transparent rounded-2xl focus:border-purple-500 transition-all outline-none font-black text-gray-900 shadow-sm text-center">
            </div>
            <div class="md:col-span-3 space-y-2">
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</label>
                <input type="number" id="quantity_${productRows}" min="1" value="1"
                    class="w-full px-5 py-3 bg-white border-2 border-transparent rounded-2xl focus:border-purple-500 transition-all outline-none font-black text-gray-900 shadow-sm text-center">
            </div>
            <div class="md:col-span-1">
                <button type="button" onclick="removeProductRow(${productRows})" 
                    class="w-full p-3.5 text-red-500 hover:bg-red-50 rounded-2xl transition-all border-2 border-transparent active:scale-90">
                    <i class="bi bi-trash3-fill text-xl"></i>
                    <i data-lucide="trash-2" class="w-5 h-5 mx-auto"></i>
                </button>
            </div>
        </div>
    `;

    container.appendChild(row);
    setupProductAutocomplete(productRows);
}

function removeProductRow(rowId) {
    const row = document.getElementById(`productRow_${rowId}`);
    if (row) {
        row.classList.add('animate-out', 'fade-out', 'zoom-out', 'duration-300');
        setTimeout(() => row.remove(), 250);
    }
}

// Order Status Change Handler
function handleOrderStatusChange() {
    const orderStatus = document.getElementById('orderStatus').value;
    const productsSection = document.getElementById('productsSection');
    const submitBtn = document.getElementById('submitBtn');

    if (orderStatus === 'Ordered') {
        productsSection.style.display = 'block';
    } else {
        productsSection.style.display = 'none';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    setupCustomerAutocomplete();
    setupProductAutocomplete(1);

    const orderStatusSelect = document.getElementById('orderStatus');
    if (orderStatusSelect) {
        orderStatusSelect.addEventListener('change', handleOrderStatusChange);
    }
});

// Collect products before form submission
function collectProducts() {
    const orderStatus = document.getElementById('orderStatus').value;
    const submitBtn = document.getElementById('submitBtn');

    if (orderStatus !== 'Ordered') {
        document.getElementById('productsData').value = JSON.stringify([]);

        // Disable and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
        `;
        return true;
    }

    const products = [];
    const productRowsList = document.querySelectorAll('.group[id^="productRow_"]');

    productRowsList.forEach(row => {
        const rowId = row.id.split('_')[1];
        const productId = document.getElementById(`productId_${rowId}`).value;
        const productName = document.getElementById(`productName_${rowId}`).value;
        const quantity = document.getElementById(`quantity_${rowId}`).value;
        const rate = document.getElementById(`rate_${rowId}`).value;

        if (productName && quantity && rate) {
            products.push({
                productId: productId || null,
                productName,
                quantity: parseInt(quantity),
                rate: parseFloat(rate)
            });
        }
    });

    if (products.length === 0) {
        alert('Action Required: Please specify at least one product to fulfill this confirmed order.');
        return false;
    }

    document.getElementById('productsData').value = JSON.stringify(products);

    // Disable and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Processing...
    `;

    return true;
}

