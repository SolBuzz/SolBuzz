// SolBuzz - Enhanced Content Script
class SolSniperContentScript {
    constructor() {
        this.detectedTokens = new Set();
        this.monitoredTokens = new Map();
        this.ruggerAlerts = new Map();
        this.priceAlerts = new Map();
        this.snipingEngine = null;
        this.devReputationTracker = null;
        this.isMonitoring = false;
        this.currentDeveloper = null;
        this.init();
    }

    async init() {
        // Load utility modules
        await this.loadUtilities();
        
        this.setupMessageListener();
        this.injectSniperInterface();
        this.startAdvancedTokenDetection();
        this.setupDeveloperTracking();
        this.initializeRealTimeMonitoring();
    }

    async loadUtilities() {
        try {
            // Initialize sniping engine and developer tracker
            this.snipingEngine = new AdvancedSnipingEngine();
            this.devReputationTracker = new DeveloperReputationTracker();
            await this.snipingEngine.init();
            await this.devReputationTracker.init();
        } catch (error) {
            console.error('Error loading utilities:', error);
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep channel open for async responses
        });
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'detectTokens':
                    await this.detectTokensOnPage();
                    break;
                case 'startSniping':
                    await this.startSnipingMode(message.config);
                    break;
                case 'stopSniping':
                    this.stopSnipingMode();
                    break;
                case 'addSnipeTarget':
                    this.addSnipeTarget(message.tokenAddress, message.config);
                    break;
                case 'removeSnipeTarget':
                    this.removeSnipeTarget(message.tokenAddress);
                    break;
                case 'checkDeveloper':
                    const devAnalysis = await this.analyzeDeveloper(message.walletAddress, message.tokenAddress);
                    sendResponse({ success: true, data: devAnalysis });
                    return;
                default:
                    break;
            }
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    injectSniperInterface() {
        // Create advanced floating sniper interface
        const sniperPanel = document.createElement('div');
        sniperPanel.id = 'solsniper-floating-panel';
        sniperPanel.innerHTML = `
            <div class="sniper-panel-header">
                <div class="sniper-logo">
                    <span class="sniper-icon">🎯</span>
                    <span class="sniper-title">SolBuzz</span>
                </div>
                <div class="sniper-status" id="sniper-status">
                    <span class="status-indicator" id="status-indicator"></span>
                    <span class="status-text" id="status-text">Ready</span>
                </div>
                <button class="sniper-minimize" id="sniper-minimize">−</button>
            </div>
            
            <div class="sniper-panel-content" id="sniper-content">
                <div class="sniper-alerts" id="sniper-alerts">
                    <!-- Real-time alerts will appear here -->
                </div>
                
                <div class="sniper-controls">
                    <div class="control-group">
                        <label>Auto-Snipe</label>
                        <button class="toggle-btn" id="auto-snipe-toggle" data-enabled="false">
                            <span class="toggle-text">OFF</span>
                        </button>
                    </div>
                    
                    <div class="control-group">
                        <label>Monitor Current Token</label>
                        <button class="action-btn" id="monitor-current-btn">
                            <span>🔍</span> Monitor
                        </button>
                    </div>
                    
                    <div class="control-group">
                        <label>Quick Snipe</label>
                        <button class="action-btn primary" id="quick-snipe-btn">
                            <span>⚡</span> Snipe Now
                        </button>
                    </div>
                </div>

                <div class="token-info" id="token-info">
                    <!-- Current token information -->
                </div>

                <div class="developer-reputation" id="developer-reputation">
                    <!-- Developer reputation information -->
                </div>
            </div>
        `;
        
        // Add advanced styles
        sniperPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 1px solid #0f4c75;
            border-radius: 16px;
            padding: 0;
            cursor: default;
            font-family: 'Segoe UI', sans-serif;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
            min-width: 280px;
            max-width: 350px;
            transition: all 0.3s ease;
            user-select: none;
        `;

        this.addSniperStyles();
        this.setupSniperEventHandlers(sniperPanel);
        document.body.appendChild(sniperPanel);
        
        console.log('✅ SolBuzz interface injected');
    }

    // Add advanced sniper styles
    addSniperStyles() {
        if (document.getElementById('solsniper-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'solsniper-styles';
        styles.textContent = `
            .sniper-panel-header {
                background: linear-gradient(135deg, #0f4c75 0%, #3282b8 100%);
                padding: 12px 16px;
                border-radius: 16px 16px 0 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .sniper-logo {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #ffffff;
                font-weight: 600;
                font-size: 14px;
            }

            .sniper-icon {
                font-size: 16px;
            }

            .sniper-status {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: #b8e6b8;
            }

            .status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #4ade80;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            .sniper-minimize {
                background: none;
                border: none;
                color: #ffffff;
                font-size: 18px;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background 0.2s;
            }

            .sniper-minimize:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .sniper-panel-content {
                padding: 16px;
                color: #e0e6ed;
                max-height: 400px;
                overflow-y: auto;
            }

            .sniper-panel-content.minimized {
                display: none;
            }

            .sniper-alerts {
                margin-bottom: 16px;
                min-height: 40px;
                max-height: 120px;
                overflow-y: auto;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .sniper-alert {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                margin-bottom: 6px;
                font-size: 12px;
                animation: slideInAlert 0.3s ease-out;
            }

            .sniper-alert.success {
                background: linear-gradient(135deg, #51cf66 0%, #40c057 100%);
            }

            .sniper-alert.warning {
                background: linear-gradient(135deg, #ffd43b 0%, #fab005 100%);
                color: #000;
            }

            @keyframes slideInAlert {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            .sniper-controls {
                margin-bottom: 16px;
            }

            .control-group {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .control-group:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }

            .control-group label {
                font-size: 13px;
                color: #b8c6db;
                font-weight: 500;
            }

            .toggle-btn {
                background: #374151;
                border: 1px solid #4b5563;
                color: #9ca3af;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 50px;
            }

            .toggle-btn[data-enabled="true"] {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border-color: #059669;
            }

            .action-btn {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .action-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }

            .action-btn.primary {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            }

            .action-btn.primary:hover {
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
            }

            .token-info {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .token-info h4 {
                margin: 0 0 8px 0;
                color: #ffffff;
                font-size: 14px;
            }

            .token-metric {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
                font-size: 12px;
            }

            .token-metric .label {
                color: #9ca3af;
            }

            .token-metric .value {
                color: #e5e7eb;
                font-weight: 500;
            }

            .developer-reputation {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .dev-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .dev-header h4 {
                margin: 0;
                color: #ffffff;
                font-size: 14px;
            }

            .reputation-badge {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .reputation-badge.safe {
                background: rgba(34, 197, 94, 0.2);
                color: #22c55e;
            }

            .reputation-badge.warning {
                background: rgba(251, 191, 36, 0.2);
                color: #fbbf24;
            }

            .reputation-badge.danger {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
            }

            .reputation-badge.critical {
                background: rgba(220, 38, 127, 0.2);
                color: #dc2626;
            }

            .dev-warning {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid #ef4444;
                color: #fca5a5;
                padding: 8px;
                border-radius: 6px;
                font-size: 11px;
                margin-top: 8px;
                animation: flashWarning 2s ease-in-out infinite;
            }

            @keyframes flashWarning {
                0%, 100% { background: rgba(239, 68, 68, 0.1); }
                50% { background: rgba(239, 68, 68, 0.2); }
            }

            .no-alerts {
                color: #6b7280;
                font-size: 12px;
                text-align: center;
                padding: 12px;
                font-style: italic;
            }
        `;
        document.head.appendChild(styles);
    }

    // Setup event handlers for sniper interface
    setupSniperEventHandlers(panel) {
        // Minimize/expand functionality
        const minimizeBtn = panel.querySelector('#sniper-minimize');
        const content = panel.querySelector('#sniper-content');
        
        minimizeBtn.addEventListener('click', () => {
            content.classList.toggle('minimized');
            minimizeBtn.textContent = content.classList.contains('minimized') ? '+' : '−';
        });

        // Auto-snipe toggle
        const autoSnipeToggle = panel.querySelector('#auto-snipe-toggle');
        autoSnipeToggle.addEventListener('click', () => {
            const enabled = autoSnipeToggle.dataset.enabled === 'true';
            const newState = !enabled;
            
            autoSnipeToggle.dataset.enabled = newState.toString();
            autoSnipeToggle.querySelector('.toggle-text').textContent = newState ? 'ON' : 'OFF';
            
            this.toggleAutoSnipe(newState);
        });

        // Monitor current token
        const monitorBtn = panel.querySelector('#monitor-current-btn');
        monitorBtn.addEventListener('click', () => {
            this.monitorCurrentToken();
        });

        // Quick snipe
        const quickSnipeBtn = panel.querySelector('#quick-snipe-btn');
        quickSnipeBtn.addEventListener('click', () => {
            this.executeQuickSnipe();
        });

        // Make panel draggable
        this.makeDraggable(panel);
    }

    // Make the panel draggable
    makeDraggable(panel) {
        const header = panel.querySelector('.sniper-panel-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('sniper-minimize')) return;
            
            isDragging = true;
            initialX = e.clientX - panel.offsetLeft;
            initialY = e.clientY - panel.offsetTop;
            header.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            panel.style.left = currentX + 'px';
            panel.style.top = currentY + 'px';
            panel.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'grab';
            }
        });
    }

    // Setup developer tracking
    setupDeveloperTracking() {
        // Monitor for developer wallet detection
        this.detectDeveloperOnPage();
        
        // Set up periodic developer checks
        setInterval(() => {
            if (this.currentDeveloper) {
                this.updateDeveloperReputation();
            }
        }, 30000); // Check every 30 seconds
    }

    // Initialize real-time monitoring
    initializeRealTimeMonitoring() {
        this.isMonitoring = true;
        
        // Monitor price changes every 2 seconds
        setInterval(() => {
            if (this.isMonitoring) {
                this.updateTokenInfo();
                this.checkPriceAlerts();
            }
        }, 2000);
    }

    startAdvancedTokenDetection() {
        // Detect tokens immediately
        this.detectTokensOnPage();
        
        // Watch for page changes (SPA navigation)
        this.observePageChanges();
        
        // Start continuous monitoring
        this.startContinuousMonitoring();
    }

    startContinuousMonitoring() {
        // Monitor every 3 seconds for new tokens
        setInterval(() => {
            this.detectTokensOnPage();
        }, 3000);
    }

    async detectTokensOnPage() {
        const currentUrl = window.location.href;
        let detectedToken = null;
        let detectedDeveloper = null;

        try {
            if (currentUrl.includes('pump.fun')) {
                detectedToken = this.extractPumpFunToken(currentUrl);
                detectedDeveloper = this.extractPumpFunDeveloper();
            } else if (currentUrl.includes('bonk.bot')) {
                detectedToken = this.extractBonkToken(currentUrl);
                detectedDeveloper = this.extractBonkDeveloper();
            }

            if (detectedToken && !this.detectedTokens.has(detectedToken)) {
                this.detectedTokens.add(detectedToken);
                await this.handleAdvancedTokenDetection(detectedToken, detectedDeveloper);
            }

            // Update current developer if changed
            if (detectedDeveloper && detectedDeveloper !== this.currentDeveloper) {
                this.currentDeveloper = detectedDeveloper;
                await this.updateDeveloperReputation();
            }
        } catch (error) {
            console.error('Token detection error:', error);
        }
    }

    // Extract developer wallet from PumpFun
    extractPumpFunDeveloper() {
        try {
            // Look for developer wallet in page content or DOM
            const creatorElements = document.querySelectorAll('[class*="creator"], [class*="developer"], [class*="deployer"]');
            
            for (const element of creatorElements) {
                const text = element.textContent;
                const walletMatch = text.match(/[A-Za-z0-9]{32,44}/);
                if (walletMatch && this.isValidSolanaAddress(walletMatch[0])) {
                    return walletMatch[0];
                }
            }

            // Try to extract from scripts or API calls
            const scripts = document.getElementsByTagName('script');
            for (const script of scripts) {
                if (script.textContent.includes('creator') || script.textContent.includes('deployer')) {
                    const matches = script.textContent.match(/"[A-Za-z0-9]{32,44}"/g);
                    if (matches) {
                        for (const match of matches) {
                            const address = match.replace(/"/g, '');
                            if (this.isValidSolanaAddress(address)) {
                                return address;
                            }
                        }
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error extracting PumpFun developer:', error);
            return null;
        }
    }

    // Extract developer wallet from Bonk
    extractBonkDeveloper() {
        try {
            // Similar logic for Bonk platform
            const developerElements = document.querySelectorAll('[data-testid*="creator"], .creator-address, .developer-info');
            
            for (const element of developerElements) {
                const walletMatch = element.textContent.match(/[A-Za-z0-9]{32,44}/);
                if (walletMatch && this.isValidSolanaAddress(walletMatch[0])) {
                    return walletMatch[0];
                }
            }

            return null;
        } catch (error) {
            console.error('Error extracting Bonk developer:', error);
            return null;
        }
    }

    // Enhanced token detection handler
    async handleAdvancedTokenDetection(tokenAddress, developerAddress) {
        console.log(`🎯 SolSniper detected token: ${tokenAddress}`);
        if (developerAddress) {
            console.log(`👤 Developer: ${developerAddress}`);
        }

        // Immediate developer reputation check
        if (developerAddress) {
            const devAnalysis = await this.analyzeDeveloper(developerAddress, tokenAddress);
            if (devAnalysis.isKnownRugger) {
                this.showCriticalRuggerAlert(devAnalysis, tokenAddress);
            }
        }

        // Show enhanced detection notification
        this.showAdvancedTokenDetectionNotification(tokenAddress, developerAddress);
        
        // Send to background for comprehensive analysis
        chrome.runtime.sendMessage({
            action: 'advancedTokenDetected',
            tokenAddress: tokenAddress,
            developerAddress: developerAddress,
            source: window.location.hostname,
            timestamp: Date.now()
        });

        // Add to monitoring if auto-monitor is enabled
        await this.checkAutoMonitoring(tokenAddress);
    }

    // Analyze developer reputation
    async analyzeDeveloper(walletAddress, tokenAddress) {
        if (!this.devReputationTracker) return null;
        
        try {
            return await this.devReputationTracker.analyzeDeveloperReputation(walletAddress, tokenAddress);
        } catch (error) {
            console.error('Developer analysis error:', error);
            return null;
        }
    }

    // Show critical rugger alert
    showCriticalRuggerAlert(devAnalysis, tokenAddress) {
        const alertsContainer = document.getElementById('sniper-alerts');
        if (!alertsContainer) return;

        const alert = document.createElement('div');
        alert.className = 'sniper-alert critical';
        alert.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">🚨 KNOWN RUGGER DETECTED!</div>
            <div style="font-size: 11px;">${devAnalysis.warnings.join(' • ')}</div>
        `;

        alertsContainer.appendChild(alert);

        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (alert.parentNode) alert.remove();
        }, 30000);

        // Update status
        this.updateSniperStatus('CRITICAL RISK', 'danger');

        // Send critical notification
        chrome.notifications.create(`rugger_alert_${tokenAddress}`, {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '🚨 CRITICAL: Known Rugger Detected!',
            message: `Avoid this token! Developer has rugged ${devAnalysis.rugCount || 'multiple'} previous tokens.`
        });
    }

    // Update sniper status
    updateSniperStatus(text, type = 'normal') {
        const statusText = document.getElementById('status-text');
        const statusIndicator = document.getElementById('status-indicator');
        
        if (statusText) statusText.textContent = text;
        
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator';
            switch (type) {
                case 'danger':
                    statusIndicator.style.background = '#ef4444';
                    break;
                case 'warning':
                    statusIndicator.style.background = '#f59e0b';
                    break;
                case 'success':
                    statusIndicator.style.background = '#10b981';
                    break;
                default:
                    statusIndicator.style.background = '#4ade80';
            }
        }
    }

    // Enhanced token detection notification
    showAdvancedTokenDetectionNotification(tokenAddress, developerAddress) {
        const alertsContainer = document.getElementById('sniper-alerts');
        if (!alertsContainer) return;

        const alert = document.createElement('div');
        alert.className = 'sniper-alert success';
        alert.innerHTML = `
            <div style="font-weight: bold;">🎯 Token Detected</div>
            <div style="font-size: 11px; margin-top: 2px;">
                ${this.truncateAddress(tokenAddress)}
                ${developerAddress ? `<br>Dev: ${this.truncateAddress(developerAddress)}` : ''}
            </div>
        `;

        alertsContainer.appendChild(alert);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (alert.parentNode) alert.remove();
        }, 10000);
    }

    // Toggle auto-snipe functionality
    async toggleAutoSnipe(enabled) {
        if (!this.snipingEngine) return;

        if (enabled) {
            this.snipingEngine.startMonitoring();
            this.showSniperAlert('Auto-snipe enabled', 'success');
            this.updateSniperStatus('Auto-Snipe ON', 'success');
        } else {
            this.snipingEngine.stopMonitoring();
            this.showSniperAlert('Auto-snipe disabled', 'warning');
            this.updateSniperStatus('Ready', 'normal');
        }

        // Save setting
        await chrome.storage.sync.set({ autoSnipeEnabled: enabled });
    }

    // Monitor current token
    async monitorCurrentToken() {
        const currentToken = this.getCurrentPageToken();
        
        if (!currentToken) {
            this.showSniperAlert('No token found on current page', 'warning');
            return;
        }

        if (!this.snipingEngine) {
            this.showSniperAlert('Sniping engine not available', 'warning');
            return;
        }

        // Add to monitoring
        const config = {
            autoSnipe: false,
            priceTarget: null,
            volumeTarget: 50000, // $50k volume threshold
            maxMarketCap: 10000000 // $10M max market cap
        };

        this.snipingEngine.addSnipeTarget(currentToken, config);
        this.monitoredTokens.set(currentToken, config);

        this.showSniperAlert(`Monitoring ${this.truncateAddress(currentToken)}`, 'success');
        this.updateTokenInfo();
    }

    // Execute quick snipe
    async executeQuickSnipe() {
        const currentToken = this.getCurrentPageToken();
        
        if (!currentToken) {
            this.showSniperAlert('No token found to snipe', 'warning');
            return;
        }

        // Check if developer is safe
        if (this.currentDeveloper) {
            const devAnalysis = await this.analyzeDeveloper(this.currentDeveloper, currentToken);
            if (devAnalysis && devAnalysis.isKnownRugger) {
                this.showSniperAlert('⚠️ Cannot snipe - Known rugger detected!', 'danger');
                return;
            }
        }

        this.showSniperAlert('🚀 Quick snipe initiated...', 'success');
        
        // In a real implementation, this would execute the snipe
        // For now, we'll simulate it
        setTimeout(() => {
            this.showSniperAlert('⚡ Snipe completed!', 'success');
        }, 2000);
    }

    // Show sniper alert
    showSniperAlert(message, type = 'normal') {
        const alertsContainer = document.getElementById('sniper-alerts');
        if (!alertsContainer) return;

        const alert = document.createElement('div');
        alert.className = `sniper-alert ${type}`;
        alert.textContent = message;

        alertsContainer.appendChild(alert);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) alert.remove();
        }, 5000);
    }

    // Update token information display
    async updateTokenInfo() {
        const tokenInfoContainer = document.getElementById('token-info');
        if (!tokenInfoContainer) return;

        const currentToken = this.getCurrentPageToken();
        if (!currentToken) {
            tokenInfoContainer.innerHTML = '<div class="no-alerts">No token detected</div>';
            return;
        }

        // Get token data (simplified for demo)
        const tokenData = await this.getBasicTokenData(currentToken);
        
        tokenInfoContainer.innerHTML = `
            <h4>${tokenData.name || 'Unknown Token'} (${tokenData.symbol || 'UNK'})</h4>
            <div class="token-metric">
                <span class="label">Price:</span>
                <span class="value">$${tokenData.price || '0.00'}</span>
            </div>
            <div class="token-metric">
                <span class="label">Market Cap:</span>
                <span class="value">$${this.formatNumber(tokenData.marketCap || 0)}</span>
            </div>
            <div class="token-metric">
                <span class="label">24h Volume:</span>
                <span class="value">$${this.formatNumber(tokenData.volume24h || 0)}</span>
            </div>
            <div class="token-metric">
                <span class="label">Liquidity:</span>
                <span class="value">$${this.formatNumber(tokenData.liquidity || 0)}</span>
            </div>
        `;
    }

    // Update developer reputation display
    async updateDeveloperReputation() {
        const devContainer = document.getElementById('developer-reputation');
        if (!devContainer || !this.currentDeveloper) {
            if (devContainer) {
                devContainer.innerHTML = '<div class="no-alerts">No developer detected</div>';
            }
            return;
        }

        const currentToken = this.getCurrentPageToken();
        const devAnalysis = await this.analyzeDeveloper(this.currentDeveloper, currentToken);
        
        if (!devAnalysis) return;

        const badgeClass = devAnalysis.riskLevel.toLowerCase();
        
        devContainer.innerHTML = `
            <div class="dev-header">
                <h4>Developer Reputation</h4>
                <span class="reputation-badge ${badgeClass}">${devAnalysis.riskLevel}</span>
            </div>
            <div class="token-metric">
                <span class="label">Score:</span>
                <span class="value">${devAnalysis.reputationScore}/100</span>
            </div>
            <div class="token-metric">
                <span class="label">Status:</span>
                <span class="value">${devAnalysis.isKnownRugger ? 'KNOWN RUGGER' : devAnalysis.isLegitDeveloper ? 'VERIFIED DEV' : 'UNKNOWN'}</span>
            </div>
            ${devAnalysis.warnings.length > 0 ? `
                <div class="dev-warning">
                    ⚠️ ${devAnalysis.warnings.join(' • ')}
                </div>
            ` : ''}
        `;
    }

    // Helper methods
    async getBasicTokenData(tokenAddress) {
        // Simplified token data fetch
        // In a real implementation, this would call the APIs
        return {
            name: 'Sample Token',
            symbol: 'SAMPLE',
            price: (Math.random() * 10).toFixed(6),
            marketCap: Math.floor(Math.random() * 10000000),
            volume24h: Math.floor(Math.random() * 1000000),
            liquidity: Math.floor(Math.random() * 500000)
        };
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    async checkAutoMonitoring(tokenAddress) {
        try {
            const result = await chrome.storage.sync.get(['autoMonitoring']);
            if (result.autoMonitoring === true && this.snipingEngine) {
                const config = {
                    autoSnipe: false,
                    volumeTarget: 25000, // Auto-monitor if volume > $25k
                    maxMarketCap: 5000000 // Auto-monitor if market cap < $5M
                };
                
                this.snipingEngine.addSnipeTarget(tokenAddress, config);
                this.showSniperAlert('Auto-monitoring enabled', 'success');
            }
        } catch (error) {
            console.error('Auto-monitoring check error:', error);
        }
    }

    checkPriceAlerts() {
        // Check price alerts for monitored tokens
        for (const [tokenAddress, config] of this.monitoredTokens) {
            // Price alert logic would go here
        }
    }

    detectDeveloperOnPage() {
        // Detect developer wallet addresses on current page
        const currentUrl = window.location.href;
        
        if (currentUrl.includes('pump.fun')) {
            this.currentDeveloper = this.extractPumpFunDeveloper();
        } else if (currentUrl.includes('bonk.bot')) {
            this.currentDeveloper = this.extractBonkDeveloper();
        }
    }

    extractPumpFunToken(url) {
        // Extract token from various PumpFun URL patterns
        const patterns = [
            /pump\.fun\/coin\/([A-Za-z0-9]{32,44})/,
            /pump\.fun\/([A-Za-z0-9]{32,44})/,
            /pump\.fun\/token\/([A-Za-z0-9]{32,44})/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        // Try to find token in page content
        return this.findTokenInPageContent();
    }

    extractBonkToken(url) {
        // Extract token from Bonk URL patterns
        const patterns = [
            /bonk\.bot\/token\/([A-Za-z0-9]{32,44})/,
            /bonk\.bot\/([A-Za-z0-9]{32,44})/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        return this.findTokenInPageContent();
    }

    findTokenInPageContent() {
        // Look for token addresses in page content
        const tokenPattern = /\b[A-Za-z0-9]{32,44}\b/g;
        const pageText = document.body.innerText;
        const matches = pageText.match(tokenPattern);

        if (matches) {
            // Filter for likely Solana addresses (base58, right length)
            for (const match of matches) {
                if (this.isValidSolanaAddress(match)) {
                    return match;
                }
            }
        }

        return null;
    }

    isValidSolanaAddress(address) {
        // Basic Solana address validation
        if (address.length < 32 || address.length > 44) return false;
        
        // Check if it's base58 (no 0, O, I, l)
        const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]+$/;
        return base58Pattern.test(address);
    }

    handleTokenDetection(tokenAddress) {
        console.log(`Tranch detected token: ${tokenAddress}`);
        
        // Show notification
        this.showTokenDetectionNotification(tokenAddress);
        
        // Send to background for analysis
        chrome.runtime.sendMessage({
            action: 'autoDetectedToken',
            tokenAddress: tokenAddress,
            source: window.location.hostname
        });

        // Auto-analyze if enabled
        this.checkAutoAnalysis(tokenAddress);
    }

    showTokenDetectionNotification(tokenAddress) {
        // Create notification
        const notification = document.createElement('div');
        notification.id = 'tranch-notification';
        notification.innerHTML = `
            <div class="tranch-notification-content">
                <div class="tranch-notification-header">
                    <span class="tranch-icon">🔍</span>
                    <span>Tranch Detected Token</span>
                    <button class="tranch-close-btn">×</button>
                </div>
                <div class="tranch-notification-body">
                    <p>Token: <code>${this.truncateAddress(tokenAddress)}</code></p>
                    <div class="tranch-notification-actions">
                        <button class="tranch-analyze-btn" data-token="${tokenAddress}">
                            Analyze Now
                        </button>
                        <button class="tranch-copy-btn" data-token="${tokenAddress}">
                            Copy Address
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10001;
            background: #2a2a3e;
            border: 1px solid #667eea;
            border-radius: 12px;
            color: #e0e0e0;
            font-family: 'Segoe UI', sans-serif;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            min-width: 300px;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;

        // Add CSS animation
        if (!document.getElementById('tranch-styles')) {
            const styles = document.createElement('style');
            styles.id = 'tranch-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .tranch-notification-content {
                    padding: 16px;
                }
                .tranch-notification-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    font-weight: 600;
                    font-size: 14px;
                }
                .tranch-icon {
                    margin-right: 8px;
                }
                .tranch-close-btn {
                    background: none;
                    border: none;
                    color: #e0e0e0;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                }
                .tranch-notification-body p {
                    margin: 0 0 12px 0;
                    font-size: 13px;
                }
                .tranch-notification-body code {
                    background: rgba(102, 126, 234, 0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 12px;
                }
                .tranch-notification-actions {
                    display: flex;
                    gap: 8px;
                }
                .tranch-analyze-btn, .tranch-copy-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .tranch-analyze-btn {
                    background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .tranch-copy-btn {
                    background: transparent;
                    border: 1px solid #404057;
                    color: #e0e0e0;
                }
                .tranch-analyze-btn:hover {
                    transform: translateY(-1px);
                }
                .tranch-copy-btn:hover {
                    background: #404057;
                }
            `;
            document.head.appendChild(styles);
        }

        // Add event listeners
        notification.querySelector('.tranch-close-btn').addEventListener('click', () => {
            notification.remove();
        });

        notification.querySelector('.tranch-analyze-btn').addEventListener('click', (e) => {
            const token = e.target.dataset.token;
            this.quickAnalyze(token);
            notification.remove();
        });

        notification.querySelector('.tranch-copy-btn').addEventListener('click', (e) => {
            const token = e.target.dataset.token;
            navigator.clipboard.writeText(token);
            e.target.textContent = 'Copied!';
            setTimeout(() => {
                e.target.textContent = 'Copy Address';
            }, 2000);
        });

        document.body.appendChild(notification);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    async quickAnalyze(tokenAddress) {
        try {
            // Show loading state
            this.showQuickAnalysisLoading();

            // Send analysis request
            const response = await chrome.runtime.sendMessage({
                action: 'analyzeToken',
                tokenAddress: tokenAddress
            });

            if (response.success) {
                this.showQuickAnalysisResults(response.data);
            } else {
                this.showQuickAnalysisError(response.error);
            }
        } catch (error) {
            console.error('Quick analysis error:', error);
            this.showQuickAnalysisError('Analysis failed');
        }
    }

    showQuickAnalysisLoading() {
        const existing = document.getElementById('tranch-quick-analysis');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'tranch-quick-analysis';
        overlay.innerHTML = `
            <div class="tranch-quick-overlay">
                <div class="tranch-quick-modal">
                    <div class="tranch-loading">
                        <div class="tranch-spinner"></div>
                        <p>Analyzing token...</p>
                    </div>
                </div>
            </div>
        `;

        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10002;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Add spinner styles
        const spinnerStyles = `
            .tranch-quick-overlay {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
            }
            .tranch-quick-modal {
                background: #2a2a3e;
                border: 1px solid #404057;
                border-radius: 16px;
                padding: 40px;
                text-align: center;
                color: #e0e0e0;
                font-family: 'Segoe UI', sans-serif;
            }
            .tranch-loading p {
                margin-top: 16px;
                font-size: 14px;
            }
            .tranch-spinner {
                width: 32px;
                height: 32px;
                border: 3px solid #404057;
                border-top: 3px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        if (!document.getElementById('tranch-spinner-styles')) {
            const styles = document.createElement('style');
            styles.id = 'tranch-spinner-styles';
            styles.textContent = spinnerStyles;
            document.head.appendChild(styles);
        }

        document.body.appendChild(overlay);

        // Close on background click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    showQuickAnalysisResults(data) {
        const overlay = document.getElementById('tranch-quick-analysis');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="tranch-quick-overlay">
                <div class="tranch-quick-modal tranch-results-modal">
                    <div class="tranch-results-header">
                        <h3>Token Analysis Results</h3>
                        <span class="tranch-risk-badge ${data.riskLevel.toLowerCase()}">${data.riskLevel}</span>
                    </div>
                    <div class="tranch-results-content">
                        ${this.renderQuickResults(data)}
                    </div>
                    <div class="tranch-results-actions">
                        <button class="tranch-close-results">Close</button>
                        <button class="tranch-open-extension">Open Extension</button>
                    </div>
                </div>
            </div>
        `;

        // Add result styles
        const resultStyles = `
            .tranch-results-modal {
                max-width: 500px;
                width: 90%;
                max-height: 80%;
                overflow-y: auto;
            }
            .tranch-results-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #404057;
            }
            .tranch-results-header h3 {
                margin: 0;
                font-size: 18px;
                color: #fff;
            }
            .tranch-risk-badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
            }
            .tranch-risk-badge.low { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
            .tranch-risk-badge.medium { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
            .tranch-risk-badge.high { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
            .tranch-risk-badge.critical { background: rgba(220, 38, 127, 0.2); color: #dc2626; }
            .tranch-results-content {
                margin-bottom: 20px;
            }
            .tranch-result-item {
                background: rgba(102, 126, 234, 0.1);
                border: 1px solid #404057;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
            }
            .tranch-result-item h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: #fff;
            }
            .tranch-result-item p {
                margin: 0;
                font-size: 13px;
                color: #a0a0a0;
            }
            .tranch-results-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            .tranch-close-results, .tranch-open-extension {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .tranch-close-results {
                background: transparent;
                border: 1px solid #404057;
                color: #e0e0e0;
            }
            .tranch-open-extension {
                background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .tranch-close-results:hover { background: #404057; }
            .tranch-open-extension:hover { transform: translateY(-1px); }
        `;

        if (!document.getElementById('tranch-result-styles')) {
            const styles = document.createElement('style');
            styles.id = 'tranch-result-styles';
            styles.textContent = resultStyles;
            document.head.appendChild(styles);
        }

        // Add event listeners
        overlay.querySelector('.tranch-close-results').addEventListener('click', () => {
            overlay.remove();
        });

        overlay.querySelector('.tranch-open-extension').addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'openExtension' });
            overlay.remove();
        });
    }

    renderQuickResults(data) {
        let html = '';

        if (data.bundleAnalysis) {
            html += `
                <div class="tranch-result-item">
                    <h4>Bundle Detection</h4>
                    <p>${data.bundleAnalysis.details}</p>
                </div>
            `;
        }

        if (data.bubbleMapsData) {
            html += `
                <div class="tranch-result-item">
                    <h4>BubbleMaps Analysis</h4>
                    <p>${data.bubbleMapsData.summary}</p>
                </div>
            `;
        }

        if (data.tokenMetadata) {
            html += `
                <div class="tranch-result-item">
                    <h4>Token: ${data.tokenMetadata.name} (${data.tokenMetadata.symbol})</h4>
                    <p>Verified: ${data.tokenMetadata.verified ? 'Yes' : 'No'}</p>
                </div>
            `;
        }

        return html || '<p>No analysis data available</p>';
    }

    showQuickAnalysisError(error) {
        const overlay = document.getElementById('tranch-quick-analysis');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="tranch-quick-overlay">
                <div class="tranch-quick-modal">
                    <div class="tranch-error">
                        <h3>Analysis Failed</h3>
                        <p>${error}</p>
                        <button class="tranch-close-error">Close</button>
                    </div>
                </div>
            </div>
        `;

        overlay.querySelector('.tranch-close-error').addEventListener('click', () => {
            overlay.remove();
        });
    }

    showQuickAnalysis() {
        // Show current page analysis
        const currentToken = this.getCurrentPageToken();
        if (currentToken) {
            this.quickAnalyze(currentToken);
        } else {
            this.showNoTokenFound();
        }
    }

    getCurrentPageToken() {
        const url = window.location.href;
        
        if (url.includes('pump.fun')) {
            return this.extractPumpFunToken(url);
        } else if (url.includes('bonk.bot')) {
            return this.extractBonkToken(url);
        }
        
        return null;
    }

    showNoTokenFound() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10001;
            background: #2a2a3e;
            border: 1px solid #404057;
            border-radius: 12px;
            color: #e0e0e0;
            padding: 16px;
            font-family: 'Segoe UI', sans-serif;
            font-size: 14px;
        `;
        notification.textContent = 'No token detected on this page';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    observePageChanges() {
        // Watch for URL changes in SPAs
        let currentUrl = window.location.href;
        
        const observer = new MutationObserver(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                setTimeout(() => {
                    this.detectTokensOnPage();
                }, 1000); // Delay to allow page to load
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async checkAutoAnalysis(tokenAddress) {
        try {
            const result = await chrome.storage.sync.get(['autoAnalysis']);
            if (result.autoAnalysis === true) {
                setTimeout(() => {
                    this.quickAnalyze(tokenAddress);
                }, 2000); // Delay for user to see notification
            }
        } catch (error) {
            console.error('Auto-analysis check error:', error);
        }
    }

    truncateAddress(address) {
        if (!address || address.length < 10) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
}

// Initialize SolBuzz content script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SolSniperContentScript();
    });
} else {
    new SolSniperContentScript();
} 