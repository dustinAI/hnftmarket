window.addEventListener('libs-ready', () => {
    // --- DOM Element References ---
    const UIElements = {
        brandTitle: document.getElementById('brand-title'),
        walletWidget: document.getElementById('wallet-widget'),
        connectWalletBtn: document.getElementById('connect-wallet-btn'),
        walletInfo: document.getElementById('wallet-info'),
        walletAddressDisplay: document.getElementById('wallet-address-display'),
        myWalletBtn: document.getElementById('my-wallet-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        collectionsView: document.getElementById('collections-view'),
        myWalletView: document.getElementById('my-wallet-view'),
        collectionsGrid: document.getElementById('collections-grid'),
        myNftsGrid: document.getElementById('my-nfts-grid'),
        backToMarketplaceBtnWallet: document.getElementById('back-to-marketplace-btn-wallet'),
        viewSeedBtn: document.getElementById('view-seed-btn'),
        modalOverlay: document.getElementById('modal-overlay'),
        modalBody: document.getElementById('modal-body'),
        modalClose: document.getElementById('modal-close'),
        templateInitial: document.getElementById('template-initial-options'),
        templateUnlock: document.getElementById('template-unlock-view'),
        templateCreate: document.getElementById('template-create-view'),
        templateRestore: document.getElementById('template-restore-view'),
        templateViewSeed: document.getElementById('template-view-seed'),
        userTapBalance: document.getElementById('user-tap-balance'),
        marketplaceAddress: document.getElementById('marketplace-address'),
        requestWithdrawalBtn: document.getElementById('request-withdrawal-btn'),
        revokeOperatorBtn: document.getElementById('revoke-operator-btn'),
        authorizeOperatorBtn: document.getElementById('authorize-operator-btn'),
        createCollectionBtn: document.getElementById('create-collection-btn'),
        mintNftBtn: document.getElementById('mint-nft-btn'),
        selectUnlistedBtn: document.getElementById('select-unlisted-btn'),
        viewTitle: document.getElementById('view-title'),
        backToCollectionsBtn: document.getElementById('back-to-collections-btn'),
        collectionLayoutWrapper: document.getElementById('collection-layout-wrapper'),
    };

    // --- Application State ---
    let appState = {
        wallet: null,
        listings: [],
        myNfts: [],
        balance: '0.00',
        marketplaceAddress: '',
        isOperatorAuthorized: false,
        selectedItems: [],
        currentView: '',
        currentCollectionData: [],
        activeFilters: {},
        currentSort: 'default',
    };
    
    const API_BASE_URL = window.location.origin;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const walletHandler = {
        generate: async () => {
            const mnemonic = window.bip39.generateMnemonic();
            return await walletHandler.fromMnemonic(mnemonic);
        },
        fromMnemonic: async (mnemonic) => {
            if (!window.bip39.validateMnemonic(mnemonic)) { throw new Error('Invalid seed phrase.'); }
            const seed = window.bip39.mnemonicToSeedSync(mnemonic);
            const seed32 = new Uint8Array(await window.crypto.subtle.digest('SHA-256', seed));
            const keyPair = window.nacl.sign.keyPair.fromSeed(seed32);
            return {
                publicKey: toHexString(keyPair.publicKey),
                secretKey: toHexString(keyPair.secretKey),
                mnemonic: mnemonic
            };
        },
        saveEncrypted: (wallet, password) => {
            const encryptedMnemonic = simpleEncrypt(wallet.mnemonic, password);
            localStorage.setItem('encryptedWallet', encryptedMnemonic);
        },
        loadDecrypted: async (password) => {
            const encryptedMnemonic = localStorage.getItem('encryptedWallet');
            if (!encryptedMnemonic) return null;
            try {
                const mnemonic = simpleDecrypt(encryptedMnemonic, password);
                if (!mnemonic) throw new Error('Invalid password or corrupted data.');
                return await walletHandler.fromMnemonic(mnemonic);
            } catch (e) {
                throw new Error('Invalid password or corrupted data.');
            }
        },
        logout: () => {
            appState.wallet = null;
            appState.myNfts = [];
            appState.balance = '0.00';
            appState.isOperatorAuthorized = false;
            renderCollectionsView();
            updateUI();
        }
    };
    const simpleEncrypt = (text, key) => btoa(text.split('').map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join(''));
    const simpleDecrypt = (ciph, key) => atob(ciph).split('').map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
    const fromHexString = (hexString) => new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const toHexString = (byteArray) => Array.from(byteArray, byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
    const toBigIntString = (number, decimals) => {
    if (number === null || number === undefined || number === '' || isNaN(parseFloat(number))) return "0";

    const value = String(number);
    decimals = isNaN(decimals) ? 18 : parseInt(decimals);
    
    let [integer, fraction = ''] = value.split('.');

    // Manejar el caso especial de que el número sea solo un punto decimal, como "." o "0."
    if (integer === '' && fraction) integer = '0';

    // Asegurarse de que la fracción no exceda el número de decimales permitidos
    fraction = fraction.substring(0, decimals);
    
    // Rellenar la fracción con ceros hasta alcanzar la longitud de los decimales
    const paddedFraction = fraction.padEnd(decimals, '0');
    
    // Construir el string final, manejando correctamente los casos como "0.05"
    // Si el entero es "0" y el número original era decimal, no incluimos el "0" inicial.
    let fullString;
    if (integer === '0' && value.includes('.')) {
        fullString = paddedFraction;
    } else {
        fullString = integer + paddedFraction;
    }

    // Eliminar ceros a la izquierda del resultado final que no sean el número "0" en sí.
    let result = fullString.replace(/^0+/, '');
    
    return result === '' ? '0' : result;
};

    // --- Marketplace API ---
    const api = {
        getListings: () => fetch(`${API_BASE_URL}/api/listings`).then(res => res.json()),
        getAllListings: () => fetch(`${API_BASE_URL}/api/all-listings`).then(res => res.json()),
        getMyNfts: (address) => fetch(`${API_BASE_URL}/api/my-nfts/${address}`).then(res => res.json()),
        getBalance: (address) => fetch(`${API_BASE_URL}/api/balance/${address}`).then(res => res.json()),
        getMarketplaceAddress: () => fetch(`${API_BASE_URL}/api/marketplace-address`).then(res => res.json()),
        getOperatorAddress: () => fetch(`${API_BASE_URL}/api/operator-address`).then(res => res.json()),
        getCuratedCollections: () => fetch(`${API_BASE_URL}/api/curated-collections`).then(res => res.json()),
        getCuratedCollectionData: (collectionName) => fetch(`${API_BASE_URL}/api/curated-collections/${collectionName}`).then(res => res.json()),
        isOperatorAuthorized: (address) => fetch(`${API_BASE_URL}/api/is-operator-authorized/${address}`).then(res => res.json()),
        getCollections: () => fetch(`${API_BASE_URL}/api/collections`).then(res => res.json()),
        getCollectionDetails: (collectionId) => fetch(`${API_BASE_URL}/api/collection/${collectionId}`).then(res => res.json()),
        async _post(endpoint, body) {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) {
                // Creamos un error personalizado que incluye el status y el mensaje
                const error = new Error(data.details || data.error || 'An unknown error occurred.');
                error.status = response.status;
                throw error;
            }
            return data;
        },

        executeSignedTx: async (command, wallet) => {
            const nonce = nacl.randomBytes(32);
            const messageToSign = JSON.stringify(command) + toHexString(nonce);
            const signatureBytes = nacl.sign.detached(new TextEncoder().encode(messageToSign), fromHexString(wallet.secretKey));
            
            return api._post('/api/execute-signed-tx', {
                command,
                signature: toHexString(signatureBytes),
                nonce: toHexString(nonce),
                from_address: wallet.publicKey
            });
        },
        
        createCollection: async (formData) => {
            const response = await fetch(`${API_BASE_URL}/api/create-collection`, { 
                method: 'POST', 
                body: formData 
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.details || data.error || "Collection creation failed.");
            return data;
        },

        listNft: (file_id, price, owner_address) => api._post('/api/list-nft', { file_id, price, owner_address }),
        delistNft: (file_id, owner_address) => api._post('/api/delist-nft', { file_id, owner_address }),
        transferNft: (file_id, to_address, owner_address) => api._post('/api/transfer-nft', { file_id, to_address, owner_address }),
        
        buyNft: (file_id, wallet) => {
            const command = { type: 'buy', file_id };
            return api.executeSignedTx(command, wallet);
        },
        
        mintNft: async (formData) => {
            const response = await fetch(`${API_BASE_URL}/api/mint-nft`, { 
                method: 'POST', 
                body: formData 
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.details || data.error || "NFT minting failed.");
            return data;
        }
    };
    
    // --- UI & View Logic ---
    function showView(viewName) {
        UIElements.collectionsView.classList.add('hidden');
        UIElements.myWalletView.classList.add('hidden');
        document.getElementById(`${viewName}-view`).classList.remove('hidden');
    }

    function updateUI() {
        const isLoggedIn = !!appState.wallet;
        UIElements.connectWalletBtn.classList.toggle('hidden', isLoggedIn);
        UIElements.walletInfo.classList.toggle('hidden', !isLoggedIn);
        if (isLoggedIn) {
            const pk = appState.wallet.publicKey;
            UIElements.walletAddressDisplay.textContent = pk;
            UIElements.userTapBalance.textContent = parseFloat(appState.balance).toFixed(4);
            
            UIElements.authorizeOperatorBtn.classList.toggle('hidden', appState.isOperatorAuthorized);
            UIElements.revokeOperatorBtn.classList.toggle('hidden', !appState.isOperatorAuthorized);
            
            const securityInfo = document.getElementById('security-info-text');
            if (securityInfo) securityInfo.textContent = appState.isOperatorAuthorized 
                ? 'The DApp is authorized to act on your behalf.' 
                : 'You must authorize the DApp to list, buy, or mint NFTs.';
        }
    }

    async function refreshWalletData() {
        if (!appState.wallet) return;
        try {
            const [authData, balanceData, myNftsData, marketplaceAddrData] = await Promise.all([
                api.isOperatorAuthorized(appState.wallet.publicKey),
                api.getBalance(appState.wallet.publicKey),
                api.getMyNfts(appState.wallet.publicKey),
                api.getMarketplaceAddress()
            ]);
            appState.isOperatorAuthorized = authData.isAuthorized;
            appState.balance = balanceData.balance;
            appState.myNfts = myNftsData || [];
            appState.marketplaceAddress = marketplaceAddrData.address;
        } catch (e) {
            console.error("Failed to refresh wallet data:", e);
            alert("There was an error updating your wallet data.");
        }
    }

    async function onLogin(wallet) {
        appState.wallet = wallet;
        showLoading("Loading wallet data...");
        try {
            await refreshWalletData();
            updateUI();
        } catch(e) {
            alert("Error loading your wallet data: " + e.message);
        } finally {
            modal.close();
        }
    }
    
    
    async function renderSingleCollectionView(collectionId) {
        showView('collections'); // Reutilizamos la misma vista, pero cambiamos su contenido
        UIElements.collectionsGrid.innerHTML = '<p>Loading collection details...</p>';
        UIElements.backToCollectionsBtn.classList.remove('hidden'); // Mostramos el botón de "volver"

        try {
            const data = await api.getCollectionDetails(collectionId);
            console.log('[DEBUG] Received data from /api/collection:', data);
            if (data.error) throw new Error(data.details || data.error);

            const { collection, items } = data;

            
            UIElements.viewTitle.textContent = collection.collection_name;
            UIElements.collectionsGrid.innerHTML = ''; // Limpiamos el grid para los NFTs

            if (items.length === 0) {
                UIElements.collectionsGrid.innerHTML = '<p>Todavía no hay nada en esta colección.</p>';
                return;
            }

            
            for (const item of items) {
                // La función 'renderNftCard' es perfecta para esto, ya sabe cómo mostrar un NFT
                // y sus botones (Comprar, Vender, etc.) dependiendo del estado.
                renderNftCard(item, UIElements.collectionsGrid, 'collection');
            }

        } catch (e) {
            console.error('[DEBUG] CATCH BLOCK ERROR in renderSingleCollectionView:', e);
            UIElements.collectionsGrid.innerHTML = `<p class="error">Could not load collection: ${e.message}</p>`;
        }
    }
    async function renderCollectionsView() {
        appState.currentView = 'collections';
        showView('collections');
        UIElements.collectionLayoutWrapper.classList.remove('layout-active');
        UIElements.viewTitle.textContent = 'Collections & Marketplace';
        UIElements.backToCollectionsBtn.classList.add('hidden');
        UIElements.collectionsGrid.innerHTML = '<p>Loading...</p>';
        document.getElementById('filters-container').innerHTML = '';

    
        UIElements.collectionsGrid.innerHTML = '';
        const allNftsCard = document.createElement('div');
        allNftsCard.className = 'card';
        allNftsCard.style.cursor = 'pointer';
        allNftsCard.innerHTML = `
            <img src="/images/all-nfts-placeholder.png" alt="All NFTs">
            <div class="card-info">
                <h3>Marketplace</h3>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">Browse all individual NFTs for sale.</p>
            </div>
        `;
        allNftsCard.onclick = () => renderAllListingsView();
        UIElements.collectionsGrid.appendChild(allNftsCard);

    
        try {
            const curatedCollections = await api.getCuratedCollections();
            for (const collection of curatedCollections) {
                const card = document.createElement('div');
                card.className = 'card';
                card.style.cursor = 'pointer';
                card.innerHTML = `
                    <img src="${collection.imageUrl}" alt="${collection.name}">
                    <div class="card-info">
                        <h3>${collection.name}</h3>
                    </div>
                `;
                card.onclick = () => renderCuratedCollectionView(collection.id);
                UIElements.collectionsGrid.appendChild(card);
            }
        } catch (e) {
            console.error("Could not load curated collections:", e.message);
        }
    }
    
    async function renderAllListingsView() {
        appState.currentView = 'marketplace';    
        showView('collections');
        UIElements.collectionLayoutWrapper.classList.remove('layout-active');
        UIElements.viewTitle.textContent = 'Marketplace';
        UIElements.backToCollectionsBtn.classList.remove('hidden');
        UIElements.collectionsGrid.innerHTML = '<p>Loading NFTs for sale...</p>';
        try {
            if (appState.wallet) await refreshWalletData(); 
            const allListings = await api.getListings();
            appState.listings = allListings;
            UIElements.collectionsGrid.innerHTML = '';
            
            if (allListings.length === 0) {
                 UIElements.collectionsGrid.innerHTML = '<p>There are no NFTs for sale right now.</p>';
                 return;
            }
            for (const item of allListings) {
                renderNftCard(item, UIElements.collectionsGrid, 'marketplace');
            }
        } catch (e) { UIElements.collectionsGrid.innerHTML = `<p class="error">Could not load NFTs: ${e.message}</p>`; }
    }
    
    async function renderCuratedCollectionView(collectionName) {
        appState.currentView = 'collection';
        showView('collections');
        UIElements.collectionLayoutWrapper.classList.add('layout-active');
        UIElements.viewTitle.textContent = 'Loading Collection...';
        UIElements.backToCollectionsBtn.classList.remove('hidden');
        UIElements.collectionsGrid.innerHTML = '<p>Loading NFTs...</p>';
        document.getElementById('filters-container').innerHTML = '';

        try {
        // 1. Obtener los datos enriquecidos de la colección
            const collectionData = await api.getCuratedCollectionData(collectionName);
            appState.currentCollectionData = collectionData; // Guardamos los datos completos
            UIElements.viewTitle.textContent = collectionName;

        // 2. Obtener los listados actuales para saber los precios
            const listings = await api.getAllListings(); 
            appState.listings = listings; 

        // 3. Renderizar los filtros y la vista inicial
            renderFilters(collectionData);
            applyFiltersAndRender(); // Esta función ahora se encarga de dibujar los NFTs

        } catch (e) {
            UIElements.collectionsGrid.innerHTML = `<p class="error">Could not load collection: ${e.message}</p>`;
        }
    }

    async function renderMyWalletView() {
        if (!appState.wallet) return;
        appState.currentView = 'wallet';
        showView('my-wallet');
        UIElements.myNftsGrid.innerHTML = '<p>Loading your NFTs...</p>';
        
        await refreshWalletData(); 
        updateUI();

        UIElements.marketplaceAddress.textContent = appState.marketplaceAddress;
        UIElements.myNftsGrid.innerHTML = '';

        if (appState.myNfts.length === 0) {
            UIElements.myNftsGrid.innerHTML = '<p>You do not own any NFTs. Mint your first to get started!</p>';
        } else {
            for (const nft of appState.myNfts) {
                renderNftCard(nft, UIElements.myNftsGrid, 'wallet');
            }
        }
    }

    async function handleSelectUnlisted() {
        if (appState.currentView !== 'wallet') return;

        showLoading("Finding unlisted NFTs...");

        try {
            // --- LA CORRECCIÓN CLAVE ---
            // 1. Forzamos la actualización de los listados desde la API.
            const currentListings = await api.getAllListings();
            const listedNftIds = new Set(currentListings.map(item => item.file_id));

            // 2. Filtramos los NFTs de la billetera que NO están en la lista de venta actualizada.
            const unlistedNfts = appState.myNfts.filter(nft => !listedNftIds.has(nft.file_id));

            if (unlistedNfts.length === 0) {
                modal.close();
                alert("You have no unlisted NFTs to select.");
                return;
            }

            // Límite de cuántos NFTs seleccionar a la vez.
            const BATCH_SIZE = 1000; 
            const itemsToSelect = unlistedNfts.slice(0, BATCH_SIZE).map(nft => nft.file_id);
            
            // 3. Añadimos los NFTs a la selección actual, evitando duplicados.
            const newSelection = new Set([...appState.selectedItems, ...itemsToSelect]);
            appState.selectedItems = Array.from(newSelection);
            
            console.log(`${itemsToSelect.length} unlisted items added to selection.`);
            console.log("Total items selected:", appState.selectedItems.length);

            // 4. Volvemos a renderizar la vista de la billetera para aplicar el cambio visual.
            await renderMyWalletView();
            renderBulkActionBar();

        } catch (error) {
            console.error("Error selecting unlisted NFTs:", error);
            alert("Could not fetch listing data to determine unlisted NFTs. Please try again.");
        } finally {
            modal.close();
        }
    }

    function applyFiltersAndRender() {
        const formattedData = appState.currentCollectionData.map(item =>
            typeof item === 'string' ? { file_id: item } : item
        );

        let filteredData = [...formattedData];
        const listingsMap = new Map(appState.listings.map(l => [l.file_id, l]));

        // --- 1. LÓGICA DE FILTRADO (Sin cambios) ---
        if (appState.activeFilters['_status']?.includes('listed')) {
            filteredData = filteredData.filter(nft => listingsMap.has(nft.file_id));
        }

        for (const trait in appState.activeFilters) {
            if (trait === '_status' || appState.activeFilters[trait].length === 0) continue;

            filteredData = filteredData.filter(nft =>
                nft.attributes && nft.attributes.some(attr => attr.trait_type === trait && appState.activeFilters[trait].includes(attr.value))
            );
        }

        
        switch (appState.currentSort) {
            case 'price-asc':
                filteredData.sort((a, b) => {
                    const priceA = listingsMap.has(a.file_id) ? parseFloat(listingsMap.get(a.file_id).price) : Infinity;
                    const priceB = listingsMap.has(b.file_id) ? parseFloat(listingsMap.get(b.file_id).price) : Infinity;
                    return priceA - priceB;
                });
                break;
            case 'price-desc':
                filteredData.sort((a, b) => {
                    const priceA = listingsMap.has(a.file_id) ? parseFloat(listingsMap.get(a.file_id).price) : -1;
                    const priceB = listingsMap.has(b.file_id) ? parseFloat(listingsMap.get(b.file_id).price) : -1;
                    return priceB - priceA;
                });
                break;
            case 'rarity-asc':
                filteredData.sort((a, b) => {
                    // Si un item no tiene rank, se va al final
                    const rankA = a.rarity_rank ? parseInt(a.rarity_rank, 10) : Infinity;
                    const rankB = b.rarity_rank ? parseInt(b.rarity_rank, 10) : Infinity;
                    return rankA - rankB;
                });
                break;
        }

        // --- 3. RENDERIZADO (Sin cambios) ---
        UIElements.collectionsGrid.innerHTML = '';
        if (filteredData.length === 0) {
            UIElements.collectionsGrid.innerHTML = '<p>No items match the current filters.</p>';
            return;
        }

        for (const nft of filteredData) {
            const listingInfo = listingsMap.get(nft.file_id);
            renderNftCard({ ...nft, ...listingInfo }, UIElements.collectionsGrid, 'collection');
        }
    }

    function handleFilterChange(event) {
        const checkbox = event.target;
        const traitType = checkbox.dataset.trait;
        const value = checkbox.dataset.value;

        if (!appState.activeFilters[traitType]) {
            appState.activeFilters[traitType] = [];
        }

        if (checkbox.checked) {
            appState.activeFilters[traitType].push(value);
        } else {
            const index = appState.activeFilters[traitType].indexOf(value);
            if (index > -1) {
                appState.activeFilters[traitType].splice(index, 1);
            }
        }

        applyFiltersAndRender();
    }

    function renderFilters(collectionData) {
        const filtersContainer = document.getElementById('filters-container');
        filtersContainer.innerHTML = ''; // Limpiar contenedor
        
        const traits = {}; 
        let hasRarity = false;

        // 1. Extraer todos los atributos y verificar si hay datos de rareza
        for (const nft of collectionData) {
            if (nft.rarity_rank) hasRarity = true;
            if (!nft.attributes) continue;
            for (const attr of nft.attributes) {
                if (!traits[attr.trait_type]) {
                    traits[attr.trait_type] = new Set();
                }
                traits[attr.trait_type].add(attr.value);
            }
        }

        // 2. Construir el HTML del selector de ordenamiento
        let sortingHTML = `
            <div id="sorting-container">
                <select id="sort-by-select">
                    <option value="default">Default Order</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    ${hasRarity ? '<option value="rarity-asc">Rarity: High to Low (Rank #)</option>' : ''}
                </select>
            </div>`;
        
        // 3. Construir el HTML de los filtros de acordeón
        let filtersHTML = '<h3>Filters</h3>';
        
        // Acordeón para Status
        filtersHTML += `
            <fieldset class="filter-group">
                <legend>Status</legend>
                <div class="filter-content">
                    <div class="filter-option">
                        <input type="checkbox" id="filter-status-listed" data-trait="_status" data-value="listed">
                        <label for="filter-status-listed">Only For Sale</label>
                    </div>
                </div>
            </fieldset>
        `;

        // Acordeones para cada atributo
        for (const trait in traits) {
            filtersHTML += `<fieldset class="filter-group"><legend>${trait}</legend><div class="filter-content">`;
            for (const value of traits[trait]) {
                filtersHTML += `
                    <div class="filter-option">
                        <input type="checkbox" id="${trait}-${value}" data-trait="${trait}" data-value="${value}">
                        <label for="${trait}-${value}">${value}</label>
                    </div>
                `;
            }
            filtersHTML += `</div></fieldset>`;
        }

        filtersContainer.innerHTML = sortingHTML + filtersHTML;

        // 4. Añadir los Event Listeners
        filtersContainer.addEventListener('change', (event) => {
            if (event.target.matches('input[type="checkbox"]')) {
                handleFilterChange(event);
            } else if (event.target.matches('#sort-by-select')) {
                appState.currentSort = event.target.value;
                applyFiltersAndRender();
            }
        });

        filtersContainer.addEventListener('click', (event) => {
            const legend = event.target.closest('legend');
            if (legend) {
                const fieldset = legend.parentElement;
                const content = legend.nextElementSibling;
                fieldset.classList.toggle('open');
                if (fieldset.classList.contains('open')) {
                    content.style.maxHeight = content.scrollHeight + "px";
                } else {
                    content.style.maxHeight = null;
                }
            }
        });
    }

    function handleItemSelection(file_id) {
        const selectedIndex = appState.selectedItems.indexOf(file_id);
        if (selectedIndex > -1) {
        
            appState.selectedItems.splice(selectedIndex, 1);
        } else {
        
            appState.selectedItems.push(file_id);
        }
     
        console.log("Items seleccionados:", appState.selectedItems);
        renderBulkActionBar();
    }

    function renderBulkActionBar() {
        const bar = document.getElementById('bulk-action-bar');
        const selectedCount = appState.selectedItems.length;

        if (selectedCount === 0) {
            bar.classList.add('hidden');
            return;
        }

        bar.classList.remove('hidden');

        let actionsHTML = '';
        let summaryHTML = `<span>${selectedCount} item(s) selected</span>`;

        if (appState.currentView === 'marketplace') {
            const totalPrice = appState.selectedItems.reduce((sum, file_id) => {
                const listing = appState.listings.find(l => l.file_id === file_id);
                return sum + (listing ? parseFloat(listing.price) : 0);
            }, 0);

            summaryHTML += `<span style="margin-left: 2rem;">Total: ${totalPrice.toFixed(4)} TAP</span>`;
            actionsHTML = `<button id="bulk-buy-btn" class="button">Buy Selected</button>`;
        } else if (appState.currentView === 'wallet') {
            actionsHTML = `
                <button id="bulk-list-btn" class="button">List Selected</button>
                <button id="bulk-delist-btn" class="button-secondary">Delist Selected</button>
            `;
            
        }

    bar.innerHTML = `
        <div class="bulk-summary">${summaryHTML}</div>
        <div class="bulk-actions">${actionsHTML}</div>
        <button id="clear-selection-btn" class="button-tertiary">Clear</button>
    `;
    addBulkActionListeners();
    }

    function addBulkActionListeners() {
        const clearBtn = document.getElementById('clear-selection-btn');
        if (clearBtn) clearBtn.addEventListener('click', handleClearSelection);

        const buyBtn = document.getElementById('bulk-buy-btn');
        if (buyBtn) buyBtn.addEventListener('click', handleBulkBuy);

        const listBtn = document.getElementById('bulk-list-btn');
        if (listBtn) listBtn.addEventListener('click', handleBulkList);

        const delistBtn = document.getElementById('bulk-delist-btn');
        if (delistBtn) delistBtn.addEventListener('click', handleBulkDelist);
    }

    function renderNftCard(data, gridElement, context) {
        const card = document.createElement('div');
        card.className = 'card nft-card';
    
        const { file_id, name, attributes, rarity_rank, price, seller_address } = data;
    
        const isListed = !!price && parseFloat(price) > 0;
        const isSeller = appState.wallet && data.seller_address && data.seller_address.toLowerCase() === appState.wallet.publicKey.toLowerCase();
        const isOwner = isSeller || (context === 'wallet' && !isListed);
        const isSelected = appState.selectedItems.includes(file_id);

        // Añadimos la clase 'selected' si el ítem está en el array de selección
        if (isSelected) {
            card.classList.add('selected');
        }
    
        const displayName = name || (data.filename) || `NFT-${file_id.substring(0,8)}...`;
    
        

        let rarityHTML = '';
        if (rarity_rank) {
            rarityHTML = `<p class="rarity-info"><strong>Rank:</strong> #${rarity_rank}</p>`;
        }
    
        card.innerHTML = `
            <img src="/api/nft-image/${file_id}" alt="${displayName}">
            <div class="card-info">
                <h3>${displayName}</h3>
                ${rarityHTML}
                <div class="nft-card-actions" style="display: flex; flex-wrap: wrap; gap: 0.5rem;"></div>
            </div>
        `;
    
        const actionsContainer = card.querySelector('.nft-card-actions');
        
        // --- LÓGICA DE CLIC PRINCIPAL ---
        card.addEventListener('click', (event) => {
            // Evitamos que la selección se active si se hace clic en un botón (Comprar, Vender, etc.)
            if (event.target.closest('button')) {
                return;
            }
            handleItemSelection(file_id);
            // Volvemos a renderizar la vista actual para reflejar el cambio visual en todas las tarjetas
            if (appState.currentView === 'wallet') {
                renderMyWalletView();
            } else if (appState.currentView === 'marketplace') {
                renderAllListingsView();
            } else if (appState.currentView === 'collection') {
                applyFiltersAndRender();
            }
        });


        if (isListed) {
            const displayPrice = parseFloat(price).toFixed(4);
            actionsContainer.innerHTML += `<p class="price" style="margin: auto 0; width: 100%;">Price: ${displayPrice} TAP</p>`;

            if (isOwner) {
                const delistBtn = document.createElement('button');
                delistBtn.className = 'button-secondary';
                delistBtn.textContent = 'Delist';
                delistBtn.onclick = (e) => { e.stopPropagation(); handleDelist(file_id, context); };
                actionsContainer.appendChild(delistBtn);
            } else if (appState.wallet) {
                const buyBtn = document.createElement('button');
                buyBtn.className = 'button';
                buyBtn.textContent = 'Buy';
                buyBtn.onclick = (e) => { e.stopPropagation(); handleBuy(file_id); };
                actionsContainer.appendChild(buyBtn);
            }
        } else if (context === 'wallet' && isOwner) {
            
            const listBtn = document.createElement('button');
            listBtn.className = 'button';
            listBtn.textContent = 'Sell';
            listBtn.onclick = (e) => { e.stopPropagation(); handleList(file_id); };
            actionsContainer.appendChild(listBtn);

            const transferBtn = document.createElement('button');
            transferBtn.className = 'button-secondary';
            transferBtn.textContent = 'Send';
            transferBtn.onclick = (e) => { e.stopPropagation(); handleTransfer(file_id); };
            actionsContainer.appendChild(transferBtn);
        }

        gridElement.appendChild(card);
    }
    
    // --- Transaction Logic ---

    function handleApiError(error) {
        // Primero, comprobamos si es nuestro error de conflicto de propiedad.
        if (error.status === 409) {
            alert("Action failed: You are no longer the owner of this NFT. Your wallet view will now be refreshed.");
            // Refrescamos la vista de la billetera para sincronizarla con el estado real.
            renderMyWalletView();
        } else if (error.message && error.message.includes("Server-side check failed")) {
            alert("The network is still processing your authorization. Please wait a few more seconds and try again.");
        } else {
            alert(`Error: ${error.message}`);
        }
    }
    
    async function refreshCurrentView(context) {
        if (context === 'wallet') {
            await renderMyWalletView();
        } else {
            await renderAllListingsView();
        }
    }

    async function handleList(file_id) {
        if (!appState.isOperatorAuthorized) return alert("You must authorize the DApp to list NFTs. If you just authorized, please wait a few seconds.");
        const price = prompt(`Enter the sale price for the NFT in TAP:`, "1.0");
        if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) return alert("Invalid price.");
        try {
            showLoading("Submitting request to list your NFT...");
            await api.listNft(file_id, price, appState.wallet.publicKey);
            alert('NFT listed for sale successfully!');
            await renderMyWalletView(); // Always refresh wallet view after listing
        } catch (e) { handleApiError(e); }
        finally { modal.close(); }
    }
    
    async function handleDelist(file_id, context) {
        if (!appState.isOperatorAuthorized) return alert("You must authorize the DApp to delist your NFT.");
        if (!confirm("Are you sure you want to remove this NFT from sale?")) return;
        
        try {
            showLoading("Submitting request to delist...");
            await api.delistNft(file_id, appState.wallet.publicKey);
            alert('NFT successfully delisted!');
            await refreshCurrentView(context);
        } catch (e) { handleApiError(e); }
        finally { modal.close(); }
    }

    async function handleTransfer(file_id) {
        if (!appState.isOperatorAuthorized) {
            return alert("You must authorize the DApp to send NFTs. If you just authorized, please wait a few seconds.");
        }

        const to_address = prompt("Enter the destination wallet address:");
        if (!to_address) {
            return; // El usuario canceló el prompt
        }
        
        // Validación mejorada
        if (to_address.length !== 64 || !/^[0-9a-fA-F]+$/.test(to_address)) {
            return alert("Invalid destination address. It must be a 64-character hexadecimal string.");
        }

        if (to_address.toLowerCase() === appState.wallet.publicKey.toLowerCase()) {
            return alert("You cannot transfer an NFT to your own wallet.");
        }
        
        try {
            showLoading("Transferring your NFT...");
            await api.transferNft(file_id, to_address, appState.wallet.publicKey);
            alert('NFT transferred successfully!');
            await renderMyWalletView();
        } catch (e) { 
            handleApiError(e); 
        } finally { 
            modal.close(); 
        }
    }

    async function handleBuy(file_id) {
        if (!appState.wallet) return alert("You must connect your wallet to buy.");
        try {
            showLoading("Signing and submitting purchase transaction...");
            await api.buyNft(file_id, appState.wallet);
            alert('Purchase successful! The NFT will appear in your wallet shortly.');
            
            showLoading("Updating data...");
            await renderAllListingsView();
        } catch (e) { handleApiError(e); }
        finally { modal.close(); }
    }

    async function handleRequestWithdrawal() {
    const amount = document.getElementById('withdrawal-amount').value.trim();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return alert("Invalid amount.");

    
    const convertWithdrawalAmount = (value, decimals) => {
        if (!value || isNaN(parseFloat(value))) return "0";
        let strValue = String(value);
        let [integer, fraction = ""] = strValue.split(".");
        fraction = fraction.substring(0, decimals);
        const paddedFraction = fraction.padEnd(decimals, "0");
        const fullString = (integer === '0' && strValue !== '0') ? paddedFraction : integer + paddedFraction;
        return fullString.replace(/^0+/, '') || "0";
    };
    
    try {
        showLoading("Submitting withdrawal request...");
        // Se usa la nueva función de conversión local en lugar de la global.
        const command = { type: 'requestWithdrawal', amount: convertWithdrawalAmount(amount, 18) };
        await api.executeSignedTx(command, appState.wallet);
        alert("Withdrawal request sent.");
        document.getElementById('withdrawal-amount').value = '';
        await renderMyWalletView();
    } catch(e) { handleApiError(e); }
    finally { modal.close(); }
}
    
    async function handleMint() {
        if (!appState.isOperatorAuthorized) return alert("You must authorize the DApp to mint NFTs. If you just authorized, please wait a few seconds.");
        const fileInput = document.getElementById('mint-file-input');
        if (!fileInput.files.length) return alert("Please select a file.");

        const formData = new FormData();
        formData.append('nftFile', fileInput.files[0]);
        formData.append('owner_address', appState.wallet.publicKey);

        try {
            showLoading("Minting your new NFT... This may take a moment.");
            await api.mintNft(formData);
            alert("NFT minted successfully!");
            fileInput.value = '';
            showLoading("Updating your wallet...");
            await renderMyWalletView();
        } catch(e) { handleApiError(e); } 
        finally { modal.close(); }
    }
    
    function handleClearSelection() {
        appState.selectedItems = [];
        if (appState.currentView === 'wallet') {
            renderMyWalletView();
        } else {
        // Asumimos que cualquier otra vista puede refrescarse con la lista de colecciones/marketplace
            renderAllListingsView();
        }
        renderBulkActionBar(); // Esto ocultará la barra
    }

    async function handleBulkBuy() {
        const itemsToBuy = [...appState.selectedItems];
        if (itemsToBuy.length === 0) return alert("No items selected.");
        if (!appState.isOperatorAuthorized) return alert("You must authorize the DApp to buy NFTs.");

    
        const totalPrice = itemsToBuy.reduce((sum, file_id) => {
            const listing = appState.listings.find(l => l.file_id === file_id);
            return sum + (listing ? parseFloat(listing.price) : 0);
        }, 0);

        if (parseFloat(appState.balance) < totalPrice) {
            return alert(`Insufficient funds. You need ${totalPrice.toFixed(4)} TAP, but you only have ${appState.balance}.`);
        }

        if (!confirm(`You are about to buy ${itemsToBuy.length} NFTs for a total of ${totalPrice.toFixed(4)} TAP. Proceed?`)) return;

    
        showLoading(`Processing ${itemsToBuy.length} purchases...`);
        let successCount = 0;
        let failCount = 0;

        for (const file_id of itemsToBuy) {
            try {
                console.log(`[Bulk Buy] Attempting to buy ${file_id}`);
                await api.buyNft(file_id, appState.wallet);
                successCount++;
            
            } catch (e) {
                failCount++;
                console.error(`[Bulk Buy] Failed to buy ${file_id}:`, e.message);
            }
            await sleep(5500);
        }

        modal.close();
        alert(`Bulk purchase complete.\n\nSuccessfully bought: ${successCount}\nFailed: ${failCount}`);
    
    
        handleClearSelection();
    }

    async function handleBulkList() {
        const itemsToList = [...appState.selectedItems];
        if (itemsToList.length === 0) return alert("No items selected.");
        if (!appState.isOperatorAuthorized) return alert("You must authorize the DApp to list NFTs.");

        const price = prompt(`Enter the sale price in TAP for all ${itemsToList.length} NFTs:`, "1.0");
        if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) return alert("Invalid price.");

        showLoading(`Listing ${itemsToList.length} NFTs for sale...`);
        let successCount = 0;
        let failCount = 0;

        for (const file_id of itemsToList) {
            try {
                console.log(`[Bulk List] Attempting to list ${file_id} for ${price} TAP`);
                await api.listNft(file_id, price, appState.wallet.publicKey);
                successCount++;
            } catch (e) {
                failCount++;
                console.error(`[Bulk List] Failed to list ${file_id}:`, e.message);
            }
            await sleep(4900);
        }

        modal.close();
        alert(`Bulk listing complete.\n\nSuccessfully listed: ${successCount}\nFailed: ${failCount}`);
        handleClearSelection();
    }

    async function handleBulkDelist() {
        const itemsToDelist = [...appState.selectedItems];
        if (itemsToDelist.length === 0) return alert("No items selected.");
        if (!appState.isOperatorAuthorized) return alert("You must authorize the DApp to delist NFTs.");
        if (!confirm(`Are you sure you want to delist ${itemsToDelist.length} NFTs?`)) return;

        showLoading(`Delisting ${itemsToDelist.length} NFTs...`);
        let successCount = 0;
        let failCount = 0;

        for (const file_id of itemsToDelist) {
            try {
                console.log(`[Bulk Delist] Attempting to delist ${file_id}`);
                await api.delistNft(file_id, appState.wallet.publicKey);
                successCount++;
            } catch (e) {
                failCount++;
                console.error(`[Bulk Delist] Failed to delist ${file_id}:`, e.message);
            }
            await sleep(4200);
        }

        modal.close();
        alert(`Bulk delisting complete.\n\nSuccessfully delisted: ${successCount}\nFailed: ${failCount}`);
        handleClearSelection();
    }

    async function handleAuthorizeOperator() {
    try {
        showLoading("Sending authorization transaction to the network...");

        
        const operatorAddressData = await api.getOperatorAddress();
        if (!operatorAddressData || !operatorAddressData.address) {
            throw new Error("Could not retrieve the operator address from the server.");
        }

        
        const command = { type: 'addOperator', operator_address: operatorAddressData.address };

        await api.executeSignedTx(command, appState.wallet);
        appState.isOperatorAuthorized = true;
        updateUI();
        modal.close();
        alert("Authorization request sent. The network may take a few seconds to confirm it. You can now try using the marketplace features.");
    } catch(e) {
        modal.close();
        alert("Error sending authorization request: " + e.message);
    }
}

    async function handleRemoveOperator() {
        if (!confirm("Are you sure you want to revoke the DApp's permission? You will not be able to list, delist, or mint NFTs until you re-authorize it.")) return;
        try {
            showLoading("Sending transaction to revoke permission...");
            const command = { type: 'removeOperator' };
            await api.executeSignedTx(command, appState.wallet);
            appState.isOperatorAuthorized = false;
            updateUI();
            modal.close();
            alert("Permission revoked successfully.");
        } catch(e) {
            modal.close();
            alert("Error revoking permission: " + e.message);
        }
    }
    
    
    const modal = {
        open: (template) => {
            UIElements.modalBody.innerHTML = '';
            UIElements.modalBody.appendChild(template.content.cloneNode(true));
            UIElements.modalOverlay.classList.remove('hidden');
            modal.addEventListeners();
        },
        close: () => UIElements.modalOverlay.classList.add('hidden'),
        addEventListeners: () => {
            const createBtn = UIElements.modalBody.querySelector('#create-wallet-btn');
            if (createBtn) createBtn.addEventListener('click', handleCreateWallet);
            const confirmCreateCollectionBtn = UIElements.modalBody.querySelector('#confirm-create-collection-btn');
            if (confirmCreateCollectionBtn) confirmCreateCollectionBtn.addEventListener('click', handleConfirmCreateCollection);
            const restoreBtn = UIElements.modalBody.querySelector('#restore-wallet-btn');
            if (restoreBtn) restoreBtn.addEventListener('click', () => modal.open(UIElements.templateRestore));
            const unlockBtn = UIElements.modalBody.querySelector('#unlock-btn');
            if (unlockBtn) unlockBtn.addEventListener('click', handleUnlock);
            const confirmCreateBtn = UIElements.modalBody.querySelector('#confirm-creation-btn');
            if (confirmCreateBtn) confirmCreateBtn.addEventListener('click', handleConfirmCreation);
            const confirmRestoreBtn = UIElements.modalBody.querySelector('#confirm-restore-btn');
            if (confirmRestoreBtn) confirmRestoreBtn.addEventListener('click', handleConfirmRestore);
            const confirmViewSeedBtn = UIElements.modalBody.querySelector('#confirm-view-seed-btn');
            if (confirmViewSeedBtn) confirmViewSeedBtn.addEventListener('click', handleConfirmViewSeed);
        },
        displayError: (message) => {
            const errorEl = UIElements.modalBody.querySelector('.error');
            if (errorEl) errorEl.textContent = message;
        }
    };

    async function handleCreateWallet() {
        try {
            showLoading("Creating your new wallet...");
            const newWallet = await walletHandler.generate();
            appState.wallet = newWallet;
            modal.open(UIElements.templateCreate);
            UIElements.modalBody.querySelector('#mnemonic-display').textContent = newWallet.mnemonic;
        } catch (e) { modal.displayError(e.message); }
    }

    async function handleUnlock() {
        const passwordInput = UIElements.modalBody.querySelector('#unlock-password');
        try {
            await onLogin(await walletHandler.loadDecrypted(passwordInput.value));
        } catch (e) {
            modal.open(UIElements.templateUnlock);
            modal.displayError(e.message);
        }
    }

    function handleConfirmCreation() {
        const password = UIElements.modalBody.querySelector('#create-password').value;
        if (password.length < 8) return modal.displayError('Password must be at least 8 characters.');
        walletHandler.saveEncrypted(appState.wallet, password);
        onLogin(appState.wallet);
    }

    async function handleConfirmRestore() {
        const mnemonic = UIElements.modalBody.querySelector('#restore-mnemonic').value.trim();
        const password = UIElements.modalBody.querySelector('#restore-password').value;
        try {
            if (password.length < 8) return modal.displayError('Password must be at least 8 characters.');
            const wallet = await walletHandler.fromMnemonic(mnemonic);
            walletHandler.saveEncrypted(wallet, password);
            await onLogin(wallet);
        } catch (e) {
            modal.open(UIElements.templateRestore);
            modal.displayError(e.message);
        }
    }
    function handleShowCreateCollectionForm() {
        if (!appState.wallet) return alert('You must be logged in to create a collection.');
        // Usamos el sistema de modales que ya tienes
        modal.open(document.getElementById('template-create-collection'));
    }

    async function handleConfirmCreateCollection() {
        // Obtenemos los datos del formulario en el modal
        const name = UIElements.modalBody.querySelector('#collection-name').value.trim();
        const description = UIElements.modalBody.querySelector('#collection-description').value.trim();
        const bannerInput = UIElements.modalBody.querySelector('#collection-banner');
        const manifestInput = UIElements.modalBody.querySelector('#collection-manifest');

        // Validaciones
        if (!name || !description) return modal.displayError('Name and description are required.');
        if (!bannerInput.files.length) return modal.displayError('A banner image is required.');
        if (!manifestInput.files.length) return modal.displayError('A manifest file is required.');

        // Construimos el FormData para enviar los archivos y datos
        const formData = new FormData();
        formData.append('owner_address', appState.wallet.publicKey);
        formData.append('name', name);
        formData.append('description', description);
        formData.append('bannerFile', bannerInput.files[0]);
        formData.append('manifestFile', manifestInput.files[0]);

        try {
            showLoading("Creating your new collection... This may take a moment as files are minted.");
            await api.createCollection(formData);
            alert("Collection created successfully!");
            modal.close();
            // Refrescar la vista de colecciones para ver la nueva
            await renderCollectionsView(); 
        } catch (e) {
            modal.open(document.getElementById('template-create-collection')); // Reabre el modal en caso de error
            modal.displayError(e.message);
        }
    } 
    function handleViewSeed() {
        if (!appState.wallet) return alert('Please connect your wallet first.');
        modal.open(UIElements.templateViewSeed);
    }

    async function handleConfirmViewSeed() {
        const password = UIElements.modalBody.querySelector('#view-seed-password').value;
        try {
            const decryptedWallet = await walletHandler.loadDecrypted(password);
            if (decryptedWallet.publicKey === appState.wallet.publicKey) {
                UIElements.modalBody.querySelector('#seed-phrase-display').textContent = decryptedWallet.mnemonic;
                UIElements.modalBody.querySelector('#seed-phrase-container').classList.remove('hidden');
            }
        } catch (e) { modal.displayError("Incorrect password."); }
    }
    
    function showLoading(message) {
        UIElements.modalBody.innerHTML = `<p>${message}</p><div class="loader"></div>`;
        UIElements.modalOverlay.classList.remove('hidden');
    }
    
    async function pollServerStatus() {
        const statusElement = document.getElementById('status-message');
        if (statusElement) statusElement.textContent = 'Connecting to the P2P network...';
        try {
            const response = await fetch('/api/status');
            if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
            const data = await response.json();
            if (data.ready) {
                if (statusElement) statusElement.textContent = 'Connected.';
                setTimeout(() => { if (statusElement) statusElement.style.display = 'none'; }, 2000);
                renderCollectionsView();
            } else {
                setTimeout(pollServerStatus, 2000);
            }
        } catch (error) {
            if (statusElement) statusElement.textContent = 'Connection error. Retrying...';
            console.error("Error in pollServerStatus:", error);
            setTimeout(pollServerStatus, 2000);
        }
    }

    // --- Initialization & Event Listeners ---
    function init() {
        UIElements.brandTitle.addEventListener('click', renderCollectionsView);
        UIElements.connectWalletBtn.addEventListener('click', () => {
            const encryptedWallet = localStorage.getItem('encryptedWallet');
            modal.open(encryptedWallet ? UIElements.templateUnlock : UIElements.templateInitial);
        });
        UIElements.modalClose.addEventListener('click', modal.close);
        // UIElements.createCollectionBtn.addEventListener('click', handleShowCreateCollectionForm); //
        UIElements.logoutBtn.addEventListener('click', walletHandler.logout);
        UIElements.myWalletBtn.addEventListener('click', renderMyWalletView);
        UIElements.backToMarketplaceBtnWallet.addEventListener('click', renderCollectionsView);
        UIElements.backToCollectionsBtn.addEventListener('click', renderCollectionsView);
        UIElements.viewSeedBtn.addEventListener('click', handleViewSeed);
        UIElements.requestWithdrawalBtn.addEventListener('click', handleRequestWithdrawal);
        UIElements.authorizeOperatorBtn.addEventListener('click', handleAuthorizeOperator);
        UIElements.revokeOperatorBtn.addEventListener('click', handleRemoveOperator);
        UIElements.mintNftBtn.addEventListener('click', handleMint);
        if (UIElements.selectUnlistedBtn) {
            UIElements.selectUnlistedBtn.addEventListener('click', handleSelectUnlisted);
        }
        updateUI();
        pollServerStatus();
    }
    
    init();
});