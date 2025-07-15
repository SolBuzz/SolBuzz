// Tranch Extension - Popup Script
class TranchPopup {
    constructor() {
        this.analyzedCount = 0;
        this.bundlesCount = 0;
        this.currentAnalysis = null;
        this.init();
    }

    init() {
        this.loadStats();
        this.setupEventListeners();
        this.loadSettings();
        this.checkAutoDetect();
    }

    setupEventListeners() {
        // Analyze button
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeToken();
        });

        // Token input enter key
        document.getElementById('token-address').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyzeToken();
            }
        });

        // Auto-detect toggle
        document.getElementById('auto-detect').addEventListener('change', (e) => {
            chrome.storage.sync.set({ autoDetect: e.target.checked });
        });

        // Settings modal
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettingsModal();
        });

        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('cancel-settings').addEventListener('click', () => {
            this.hideSettingsModal();
        });

        // Export data
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        // Close modal on background click
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') {
                this.hideSettingsModal();
            }
        });
    }

    async analyzeToken() {
        const tokenInput = document.getElementById('token-address');
        const analyzeBtn = document.getElementById('analyze-btn');
        const spinner = document.getElementById('spinner');
        
        let tokenAddress = tokenInput.value.trim();
        
        if (!tokenAddress) {
            this.showError('Please enter a token address or URL');
            return;
        }

        // Extract token address from URLs
        tokenAddress = this.extractTokenAddress(tokenAddress);
        
        if (!this.isValidTokenAddress(tokenAddress)) {
            this.showError('Invalid token address format');
            return;
        }

        // UI loading state
        analyzeBtn.classList.add('loading');
        analyzeBtn.disabled = true;
        this.hideError();

        try {
            // Send message to background script for analysis
            const response = await chrome.runtime.sendMessage({
                action: 'analyzeToken',
                tokenAddress: tokenAddress
            });

            if (response.success) {
                this.displayResults(response.data);
                this.updateStats();
            } else {
                this.showError(response.error || 'Analysis failed');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Connection error. Please try again.');
        } finally {
            analyzeBtn.classList.remove('loading');
            analyzeBtn.disabled = false;
        }
    }

    extractTokenAddress(input) {
        // Extract token address from PumpFun URLs
        const pumpfunMatch = input.match(/pump\.fun\/(?:coin\/)?([A-Za-z0-9]{32,44})/);
        if (pumpfunMatch) return pumpfunMatch[1];

        // Extract token address from Bonk URLs
        const bonkMatch = input.match(/bonk\.bot\/(?:token\/)?([A-Za-z0-9]{32,44})/);
        if (bonkMatch) return bonkMatch[1];

        // Return as-is if it looks like a token address
        return input;
    }

    isValidTokenAddress(address) {
        // Basic Solana address validation (32-44 characters, base58)
        return /^[A-Za-z0-9]{32,44}$/.test(address);
    }

    displayResults(data) {
        const resultsSection = document.getElementById('results-section');
        const emptyState = document.getElementById('empty-state');
        const riskLevel = document.getElementById('risk-level');
        const resultCards = document.getElementById('result-cards');
        const walletTracking = document.getElementById('wallet-tracking');

        // Show results section
        resultsSection.classList.add('show');
        emptyState.classList.add('hide');

        // Set risk level
        riskLevel.textContent = data.riskLevel;
        riskLevel.className = `risk-level ${data.riskLevel.toLowerCase()}`;

        // Clear and populate result cards
        resultCards.innerHTML = '';
        
        // Bundle detection card
        if (data.bundleAnalysis) {
            this.createResultCard(
                'Bundle Detection',
                data.bundleAnalysis.isBundled ? 'Bundle Detected' : 'No Bundle Found',
                data.bundleAnalysis.isBundled ? 'danger' : 'safe',
                data.bundleAnalysis.details,
                data.bundleAnalysis.metrics
            );
        }

        // BubbleMaps analysis card
        if (data.bubbleMapsData) {
            this.createResultCard(
                'BubbleMaps Analysis',
                data.bubbleMapsData.status || 'Complete',
                this.getBubbleMapsStatus(data.bubbleMapsData),
                data.bubbleMapsData.summary,
                data.bubbleMapsData.metrics
            );
        }

        // Token metadata card
        if (data.tokenMetadata) {
            this.createResultCard(
                'Token Information',
                data.tokenMetadata.verified ? 'Verified' : 'Unverified',
                data.tokenMetadata.verified ? 'safe' : 'warning',
                data.tokenMetadata.description,
                {
                    'Name': data.tokenMetadata.name,
                    'Symbol': data.tokenMetadata.symbol,
                    'Supply': data.tokenMetadata.supply,
                    'Decimals': data.tokenMetadata.decimals
                }
            );
        }

        // Populate wallet tracking
        this.displayWalletTracking(data.walletAnalysis);
    }

    createResultCard(title, status, statusClass, description, metrics) {
        const resultCards = document.getElementById('result-cards');
        
        const card = document.createElement('div');
        card.className = 'result-card';
        
        card.innerHTML = `
            <div class="card-header">
                <span class="card-title">${title}</span>
                <span class="card-status ${statusClass}">${status}</span>
            </div>
            <div class="card-content">
                ${description || ''}
            </div>
            <div class="card-data">
                ${this.renderMetrics(metrics)}
            </div>
        `;
        
        resultCards.appendChild(card);
    }

    renderMetrics(metrics) {
        if (!metrics || typeof metrics !== 'object') return '';
        
        return Object.entries(metrics)
            .map(([label, value]) => `
                <div class="data-row">
                    <span class="data-label">${label}:</span>
                    <span class="data-value">${value}</span>
                </div>
            `).join('');
    }

    displayWalletTracking(walletData) {
        const walletTracking = document.getElementById('wallet-tracking');
        
        if (!walletData || !walletData.trackedWallets) {
            walletTracking.style.display = 'none';
            return;
        }

        walletTracking.style.display = 'block';
        walletTracking.innerHTML = `
            <h4 style="color: #fff; margin-bottom: 12px;">Wallet Tracking</h4>
            ${walletData.trackedWallets.map(wallet => `
                <div class="wallet-item">
                    <span class="wallet-address">${this.truncateAddress(wallet.address)}</span>
                    <span class="wallet-risk ${wallet.riskLevel.toLowerCase()}">${wallet.riskLevel}</span>
                </div>
            `).join('')}
        `;
    }

    getBubbleMapsStatus(bubbleMapsData) {
        if (bubbleMapsData.suspiciousActivity) return 'danger';
        if (bubbleMapsData.warnings > 0) return 'warning';
        return 'safe';
    }

    truncateAddress(address) {
        if (!address || address.length < 10) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    showError(message) {
        // Create or update error message
        let errorDiv = document.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = `
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid #ef4444;
                color: #ef4444;
                padding: 12px;
                border-radius: 8px;
                margin-top: 8px;
                font-size: 13px;
            `;
            document.querySelector('.input-section').appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    hideError() {
        const errorDiv = document.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    async loadStats() {
        try {
            const result = await chrome.storage.local.get(['analyzedCount', 'bundlesCount']);
            this.analyzedCount = result.analyzedCount || 0;
            this.bundlesCount = result.bundlesCount || 0;
            this.updateStatsDisplay();
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async updateStats() {
        this.analyzedCount++;
        if (this.currentAnalysis && this.currentAnalysis.bundleAnalysis?.isBundled) {
            this.bundlesCount++;
        }
        
        await chrome.storage.local.set({
            analyzedCount: this.analyzedCount,
            bundlesCount: this.bundlesCount
        });
        
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        document.getElementById('analyzed-count').textContent = this.analyzedCount;
        document.getElementById('bundles-count').textContent = this.bundlesCount;
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'bubbleMapsApiKey', 
                'heliusApiKey', 
                'autoDetect',
                'notifications'
            ]);
            
            if (result.bubbleMapsApiKey) {
                document.getElementById('api-key').value = result.bubbleMapsApiKey;
            }
            if (result.heliusApiKey) {
                document.getElementById('helius-key').value = result.heliusApiKey;
            }
            
            document.getElementById('auto-detect').checked = result.autoDetect !== false;
            document.getElementById('notifications').checked = result.notifications === true;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        const bubbleMapsApiKey = document.getElementById('api-key').value;
        const heliusApiKey = document.getElementById('helius-key').value;
        const notifications = document.getElementById('notifications').checked;
        
        try {
            await chrome.storage.sync.set({
                bubbleMapsApiKey,
                heliusApiKey,
                notifications
            });
            
            this.hideSettingsModal();
            this.showSuccess('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings');
        }
    }

    showSettingsModal() {
        document.getElementById('settings-modal').classList.add('show');
    }

    hideSettingsModal() {
        document.getElementById('settings-modal').classList.remove('show');
    }

    showSuccess(message) {
        // Temporary success message
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(34, 197, 94, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            z-index: 2000;
        `;
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    async checkAutoDetect() {
        try {
            const result = await chrome.storage.sync.get(['autoDetect']);
            if (result.autoDetect !== false) {
                // Query current tab for auto-detection
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (this.isPumpFunOrBonk(tab.url)) {
                    chrome.tabs.sendMessage(tab.id, { action: 'detectTokens' });
                }
            }
        } catch (error) {
            console.error('Error checking auto-detect:', error);
        }
    }

    isPumpFunOrBonk(url) {
        return url && (url.includes('pump.fun') || url.includes('bonk.bot'));
    }

    async exportData() {
        try {
            const data = await chrome.storage.local.get(null);
            const exportData = {
                timestamp: new Date().toISOString(),
                stats: {
                    analyzedCount: this.analyzedCount,
                    bundlesCount: this.bundlesCount
                },
                analysisHistory: data.analysisHistory || []
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tranch-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showSuccess('Data exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Export failed');
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TranchPopup();
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'autoDetectedToken') {
        // Auto-fill the token address
        document.getElementById('token-address').value = message.tokenAddress;
        
        // Show notification
        const popup = new TranchPopup();
        popup.showSuccess(`Auto-detected token: ${popup.truncateAddress(message.tokenAddress)}`);
    }
}); 