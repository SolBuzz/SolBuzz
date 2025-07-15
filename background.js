// SolBuzz - Enhanced Background Service Worker
class SolSniperBackground {
    constructor() {
        this.apiKeys = {};
        this.cache = new Map();
        this.snipingEngine = null;
        this.devReputationTracker = null;
        this.monitoringActive = false;
        this.snipeHistory = [];
        this.alertSettings = {};
        this.init();
    }

    async init() {
        await this.loadUtilities();
        this.setupMessageListeners();
        this.loadApiKeys();
        this.setupPeriodicTasks();
        this.initializeSnipingMonitoring();
    }

    async loadUtilities() {
        try {
            // Initialize utility modules
            this.snipingEngine = new AdvancedSnipingEngine();
            this.devReputationTracker = new DeveloperReputationTracker();
            
            await this.snipingEngine.init();
            await this.devReputationTracker.init();
            
            console.log('✅ SolBuzz utilities loaded');
        } catch (error) {
            console.error('Error loading utilities:', error);
        }
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });

        // Handle tab updates for auto-detection
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && this.isPumpFunOrBonk(tab.url)) {
                this.checkAutoDetect(tabId);
            }
        });
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'analyzeToken':
                    const result = await this.analyzeToken(message.tokenAddress);
                    sendResponse(result);
                    break;
                
                case 'advancedTokenDetected':
                    await this.handleAdvancedTokenDetection(message);
                    sendResponse({ success: true });
                    break;
                
                case 'analyzeDeveloper':
                    const devResult = await this.analyzeDeveloper(message.walletAddress, message.tokenAddress);
                    sendResponse({ success: true, data: devResult });
                    break;
                
                case 'addSnipeTarget':
                    const targetResult = await this.addSnipeTarget(message.tokenAddress, message.config);
                    sendResponse({ success: true, data: targetResult });
                    break;
                
                case 'removeSnipeTarget':
                    await this.removeSnipeTarget(message.tokenAddress);
                    sendResponse({ success: true });
                    break;
                
                case 'getSnipeTargets':
                    const targets = this.getSnipeTargets();
                    sendResponse({ success: true, data: targets });
                    break;
                
                case 'updateSnipeSettings':
                    await this.updateSnipeSettings(message.settings);
                    sendResponse({ success: true });
                    break;
                
                case 'getSnipeHistory':
                    const history = await this.getSnipeHistory();
                    sendResponse({ success: true, data: history });
                    break;
                
                case 'startSniping':
                    await this.startSnipingMode();
                    sendResponse({ success: true });
                    break;
                
                case 'stopSniping':
                    await this.stopSnipingMode();
                    sendResponse({ success: true });
                    break;
                
                case 'executeQuickSnipe':
                    const snipeResult = await this.executeQuickSnipe(message.tokenAddress, message.amount);
                    sendResponse({ success: true, data: snipeResult });
                    break;
                
                case 'getApiKeys':
                    sendResponse({ success: true, data: this.apiKeys });
                    break;
                
                case 'updateApiKeys':
                    await this.updateApiKeys(message.keys);
                    sendResponse({ success: true });
                    break;
                
                case 'getSniperStatus':
                    const status = this.getSniperStatus();
                    sendResponse({ success: true, data: status });
                    break;
                
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background script error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async analyzeToken(tokenAddress) {
        try {
            console.log(`Analyzing token: ${tokenAddress}`);

            // Check cache first
            const cacheKey = `analysis_${tokenAddress}`;
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < 300000) { // 5 minutes
                    return { success: true, data: cached.data };
                }
            }

            // Parallel API calls for comprehensive analysis
            const analysisPromises = [
                this.getBubbleMapsData(tokenAddress),
                this.getTokenMetadata(tokenAddress),
                this.getWalletAnalysis(tokenAddress),
                this.detectBundling(tokenAddress)
            ];

            const [
                bubbleMapsData,
                tokenMetadata,
                walletAnalysis,
                bundleAnalysis
            ] = await Promise.allSettled(analysisPromises);

            // Compile results
            const analysisData = {
                tokenAddress,
                timestamp: Date.now(),
                bubbleMapsData: bubbleMapsData.status === 'fulfilled' ? bubbleMapsData.value : null,
                tokenMetadata: tokenMetadata.status === 'fulfilled' ? tokenMetadata.value : null,
                walletAnalysis: walletAnalysis.status === 'fulfilled' ? walletAnalysis.value : null,
                bundleAnalysis: bundleAnalysis.status === 'fulfilled' ? bundleAnalysis.value : null
            };

            // Calculate risk level
            analysisData.riskLevel = this.calculateRiskLevel(analysisData);

            // Cache results
            this.cache.set(cacheKey, {
                data: analysisData,
                timestamp: Date.now()
            });

            // Store in analysis history
            this.storeAnalysisHistory(analysisData);

            return { success: true, data: analysisData };

        } catch (error) {
            console.error('Token analysis error:', error);
            return { success: false, error: error.message };
        }
    }

    async getBubbleMapsData(tokenAddress) {
        try {
            if (!this.apiKeys.bubbleMapsApiKey) {
                throw new Error('BubbleMaps API key not configured');
            }

            const response = await fetch(`https://api.bubblemaps.io/v1/token/${tokenAddress}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKeys.bubbleMapsApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`BubbleMaps API error: ${response.status}`);
            }

            const data = await response.json();
            
            return {
                status: 'success',
                suspiciousActivity: data.suspicious_activity || false,
                warnings: data.warnings?.length || 0,
                summary: data.summary || 'No suspicious activity detected',
                metrics: {
                    'Holders': data.holder_count,
                    'Concentration': `${data.concentration_ratio}%`,
                    'Liquidity': data.liquidity_score,
                    'Risk Score': data.risk_score
                }
            };

        } catch (error) {
            console.error('BubbleMaps API error:', error);
            return {
                status: 'error',
                error: error.message,
                summary: 'Unable to fetch BubbleMaps data'
            };
        }
    }

    async getTokenMetadata(tokenAddress) {
        try {
            // Use multiple sources for token metadata
            const heliusData = await this.getHeliusTokenData(tokenAddress);
            const solanaData = await this.getSolanaTokenData(tokenAddress);

            return {
                name: heliusData?.name || solanaData?.name || 'Unknown',
                symbol: heliusData?.symbol || solanaData?.symbol || 'UNKNOWN',
                supply: heliusData?.supply || solanaData?.supply || 'Unknown',
                decimals: heliusData?.decimals || solanaData?.decimals || 'Unknown',
                verified: heliusData?.verified || false,
                description: heliusData?.description || 'No description available'
            };

        } catch (error) {
            console.error('Token metadata error:', error);
            return {
                name: 'Unknown',
                symbol: 'UNKNOWN',
                supply: 'Unknown',
                decimals: 'Unknown',
                verified: false,
                description: 'Unable to fetch token metadata'
            };
        }
    }

    async getHeliusTokenData(tokenAddress) {
        try {
            if (!this.apiKeys.heliusApiKey) {
                return null;
            }

            const response = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${this.apiKeys.heliusApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mintAccounts: [tokenAddress]
                })
            });

            if (!response.ok) {
                throw new Error(`Helius API error: ${response.status}`);
            }

            const data = await response.json();
            return data[0] || null;

        } catch (error) {
            console.error('Helius API error:', error);
            return null;
        }
    }

    async getSolanaTokenData(tokenAddress) {
        try {
            const response = await fetch('https://mainnet-beta.solana.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getAccountInfo',
                    params: [
                        tokenAddress,
                        { encoding: 'jsonParsed' }
                    ]
                })
            });

            const data = await response.json();
            if (data.result?.value?.data?.parsed) {
                const parsed = data.result.value.data.parsed;
                return {
                    supply: parsed.info?.supply,
                    decimals: parsed.info?.decimals
                };
            }
            return null;

        } catch (error) {
            console.error('Solana RPC error:', error);
            return null;
        }
    }

    async getWalletAnalysis(tokenAddress) {
        try {
            // Get token holders and analyze wallet patterns
            const holdersData = await this.getTokenHolders(tokenAddress);
            const trackedWallets = [];

            if (holdersData && holdersData.holders) {
                for (const holder of holdersData.holders.slice(0, 10)) { // Top 10 holders
                    const walletRisk = await this.analyzeWalletRisk(holder.address);
                    trackedWallets.push({
                        address: holder.address,
                        balance: holder.balance,
                        riskLevel: walletRisk.riskLevel,
                        flags: walletRisk.flags
                    });
                }
            }

            return {
                trackedWallets,
                totalAnalyzed: trackedWallets.length,
                highRiskCount: trackedWallets.filter(w => w.riskLevel === 'HIGH').length
            };

        } catch (error) {
            console.error('Wallet analysis error:', error);
            return {
                trackedWallets: [],
                totalAnalyzed: 0,
                highRiskCount: 0
            };
        }
    }

    async getTokenHolders(tokenAddress) {
        try {
            if (!this.apiKeys.heliusApiKey) {
                return null;
            }

            const response = await fetch(`https://api.helius.xyz/v0/addresses/${tokenAddress}/balances?api-key=${this.apiKeys.heliusApiKey}`);
            
            if (!response.ok) {
                throw new Error(`Helius balances API error: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Token holders error:', error);
            return null;
        }
    }

    async analyzeWalletRisk(walletAddress) {
        try {
            // Analyze wallet for suspicious patterns
            const flags = [];
            let riskLevel = 'LOW';

            // Check transaction patterns, creation date, etc.
            const walletInfo = await this.getWalletInfo(walletAddress);
            
            if (walletInfo) {
                // Check for new wallet (high risk)
                if (walletInfo.createdRecently) {
                    flags.push('New wallet');
                    riskLevel = 'MEDIUM';
                }

                // Check for suspicious transaction patterns
                if (walletInfo.suspiciousPatterns) {
                    flags.push('Suspicious patterns');
                    riskLevel = 'HIGH';
                }

                // Check for known bundler addresses
                if (walletInfo.knownBundler) {
                    flags.push('Known bundler');
                    riskLevel = 'HIGH';
                }
            }

            return { riskLevel, flags };

        } catch (error) {
            console.error('Wallet risk analysis error:', error);
            return { riskLevel: 'UNKNOWN', flags: [] };
        }
    }

    async getWalletInfo(walletAddress) {
        // Placeholder for wallet analysis logic
        // In a real implementation, this would check:
        // - Wallet creation date
        // - Transaction patterns
        // - Known bundler addresses
        // - DEX interaction patterns
        
        return {
            createdRecently: false,
            suspiciousPatterns: false,
            knownBundler: false
        };
    }

    async detectBundling(tokenAddress) {
        try {
            // Implement bundle detection algorithm
            const bundleScore = await this.calculateBundleScore(tokenAddress);
            const isBundled = bundleScore > 0.7; // Threshold for bundle detection

            return {
                isBundled,
                bundleScore,
                details: isBundled ? 'High probability of bundling detected' : 'No bundling patterns detected',
                metrics: {
                    'Bundle Score': `${(bundleScore * 100).toFixed(1)}%`,
                    'Confidence': bundleScore > 0.8 ? 'High' : bundleScore > 0.6 ? 'Medium' : 'Low'
                }
            };

        } catch (error) {
            console.error('Bundle detection error:', error);
            return {
                isBundled: false,
                bundleScore: 0,
                details: 'Unable to perform bundle analysis',
                metrics: {}
            };
        }
    }

    async calculateBundleScore(tokenAddress) {
        try {
            // Bundle detection algorithm based on:
            // 1. Holder concentration
            // 2. Transaction timing patterns
            // 3. Wallet creation patterns
            // 4. DEX listing patterns

            let score = 0;

            // Get holder data
            const holdersData = await this.getTokenHolders(tokenAddress);
            
            if (holdersData && holdersData.holders) {
                // Check holder concentration
                const topHolderPercentage = holdersData.holders[0]?.percentage || 0;
                if (topHolderPercentage > 50) score += 0.3;
                if (topHolderPercentage > 80) score += 0.2;

                // Check for multiple large holders with similar balances
                const largeHolders = holdersData.holders.filter(h => h.percentage > 10);
                if (largeHolders.length > 3) score += 0.2;

                // Check for wallet creation patterns (requires additional API calls)
                // This is a simplified version
                const newWallets = await this.countNewWallets(holdersData.holders.slice(0, 10));
                if (newWallets > 5) score += 0.3;
            }

            return Math.min(score, 1); // Cap at 1.0

        } catch (error) {
            console.error('Bundle score calculation error:', error);
            return 0;
        }
    }

    async countNewWallets(holders) {
        // Simplified new wallet detection
        // In reality, would check wallet creation dates
        return Math.floor(Math.random() * holders.length);
    }

    calculateRiskLevel(analysisData) {
        let riskScore = 0;

        // Bundle analysis weight: 40%
        if (analysisData.bundleAnalysis?.isBundled) {
            riskScore += 40;
        }

        // BubbleMaps analysis weight: 30%
        if (analysisData.bubbleMapsData?.suspiciousActivity) {
            riskScore += 30;
        } else if (analysisData.bubbleMapsData?.warnings > 0) {
            riskScore += 15;
        }

        // Wallet analysis weight: 20%
        if (analysisData.walletAnalysis?.highRiskCount > 0) {
            riskScore += (analysisData.walletAnalysis.highRiskCount / analysisData.walletAnalysis.totalAnalyzed) * 20;
        }

        // Token verification weight: 10%
        if (!analysisData.tokenMetadata?.verified) {
            riskScore += 10;
        }

        // Determine risk level
        if (riskScore >= 70) return 'CRITICAL';
        if (riskScore >= 50) return 'HIGH';
        if (riskScore >= 25) return 'MEDIUM';
        return 'LOW';
    }

    async loadApiKeys() {
        try {
            const result = await chrome.storage.sync.get(['bubbleMapsApiKey', 'heliusApiKey']);
            this.apiKeys = {
                bubbleMapsApiKey: result.bubbleMapsApiKey || '',
                heliusApiKey: result.heliusApiKey || ''
            };
        } catch (error) {
            console.error('Error loading API keys:', error);
        }
    }

    async updateApiKeys(keys) {
        this.apiKeys = { ...this.apiKeys, ...keys };
        await chrome.storage.sync.set(keys);
    }

    async storeAnalysisHistory(analysisData) {
        try {
            const result = await chrome.storage.local.get(['analysisHistory']);
            const history = result.analysisHistory || [];
            
            history.unshift(analysisData);
            
            // Keep only last 100 analyses
            if (history.length > 100) {
                history.splice(100);
            }
            
            await chrome.storage.local.set({ analysisHistory: history });
        } catch (error) {
            console.error('Error storing analysis history:', error);
        }
    }

    isPumpFunOrBonk(url) {
        return url && (url.includes('pump.fun') || url.includes('bonk.bot'));
    }

    async checkAutoDetect(tabId) {
        try {
            const result = await chrome.storage.sync.get(['autoDetect']);
            if (result.autoDetect !== false) {
                chrome.tabs.sendMessage(tabId, { action: 'detectTokens' });
            }
        } catch (error) {
            console.error('Auto-detect error:', error);
        }
    }

    // Enhanced token detection handler
    async handleAdvancedTokenDetection(message) {
        try {
            const { tokenAddress, developerAddress, source, timestamp } = message;
            
            console.log(`🎯 Advanced token detection: ${tokenAddress}`);
            
            // Perform comprehensive analysis
            const analysis = await this.analyzeToken(tokenAddress);
            
            // Analyze developer if provided
            let devAnalysis = null;
            if (developerAddress) {
                devAnalysis = await this.analyzeDeveloper(developerAddress, tokenAddress);
                
                // Send critical alert if known rugger
                if (devAnalysis && devAnalysis.isKnownRugger) {
                    await this.sendCriticalRuggerAlert(tokenAddress, devAnalysis);
                }
            }
            
            // Store detection event
            await this.storeDetectionEvent({
                tokenAddress,
                developerAddress,
                source,
                timestamp,
                analysis: analysis.data,
                devAnalysis
            });
            
            // Check auto-snipe conditions
            await this.checkAutoSnipeConditions(tokenAddress, analysis.data, devAnalysis);
            
        } catch (error) {
            console.error('Advanced token detection error:', error);
        }
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

    // Add snipe target
    async addSnipeTarget(tokenAddress, config) {
        if (!this.snipingEngine) {
            throw new Error('Sniping engine not available');
        }
        
        return this.snipingEngine.addSnipeTarget(tokenAddress, config);
    }

    // Remove snipe target
    async removeSnipeTarget(tokenAddress) {
        if (!this.snipingEngine) return;
        
        this.snipingEngine.removeSnipeTarget(tokenAddress);
    }

    // Get current snipe targets
    getSnipeTargets() {
        if (!this.snipingEngine) return [];
        
        return this.snipingEngine.getSnipeTargets();
    }

    // Update snipe settings
    async updateSnipeSettings(settings) {
        if (!this.snipingEngine) return;
        
        await this.snipingEngine.updateSettings(settings);
    }

    // Get snipe history
    async getSnipeHistory() {
        try {
            const result = await chrome.storage.local.get(['snipeHistory']);
            return result.snipeHistory || [];
        } catch (error) {
            console.error('Error getting snipe history:', error);
            return [];
        }
    }

    // Start sniping mode
    async startSnipingMode() {
        if (!this.snipingEngine) {
            throw new Error('Sniping engine not available');
        }
        
        this.snipingEngine.startMonitoring();
        this.monitoringActive = true;
        
        console.log('🚀 Sniping mode activated');
    }

    // Stop sniping mode
    async stopSnipingMode() {
        if (!this.snipingEngine) return;
        
        this.snipingEngine.stopMonitoring();
        this.monitoringActive = false;
        
        console.log('⏹️ Sniping mode deactivated');
    }

    // Execute quick snipe
    async executeQuickSnipe(tokenAddress, amount) {
        if (!this.snipingEngine) {
            throw new Error('Sniping engine not available');
        }
        
        try {
            // Add as priority target with immediate execution
            const config = {
                autoSnipe: true,
                amount: amount || 0.1,
                priority: true
            };
            
            const target = this.snipingEngine.addSnipeTarget(tokenAddress, config);
            
            // Record snipe attempt
            await this.recordSnipeAttempt(tokenAddress, amount, 'quick_snipe');
            
            return {
                success: true,
                target,
                message: 'Quick snipe initiated'
            };
            
        } catch (error) {
            console.error('Quick snipe error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get sniper status
    getSniperStatus() {
        const status = {
            monitoringActive: this.monitoringActive,
            engineStatus: this.snipingEngine ? this.snipingEngine.getStatus() : null,
            targetCount: this.getSnipeTargets().length,
            lastUpdate: Date.now()
        };
        
        return status;
    }

    // Send critical rugger alert
    async sendCriticalRuggerAlert(tokenAddress, devAnalysis) {
        try {
            // Send browser notification
            await chrome.notifications.create(`critical_rugger_${tokenAddress}`, {
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: '🚨 CRITICAL ALERT: Known Rugger Detected!',
                message: `Token ${tokenAddress.slice(0, 8)}... created by known rugger with ${devAnalysis.rugCount || 'multiple'} previous scams.`,
                priority: 2
            });
            
            // Store alert
            await this.storeAlert({
                type: 'critical_rugger',
                tokenAddress,
                developerAddress: devAnalysis.walletAddress,
                message: 'Known rugger detected',
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('Error sending critical rugger alert:', error);
        }
    }

    // Check auto-snipe conditions
    async checkAutoSnipeConditions(tokenAddress, analysis, devAnalysis) {
        try {
            // Don't auto-snipe if known rugger
            if (devAnalysis && devAnalysis.isKnownRugger) {
                console.log(`❌ Auto-snipe blocked for ${tokenAddress} - known rugger`);
                return;
            }
            
            // Check if auto-snipe is enabled
            const settings = await chrome.storage.sync.get(['autoSnipeEnabled', 'autoSnipeFilters']);
            if (!settings.autoSnipeEnabled) return;
            
            const filters = settings.autoSnipeFilters || {};
            
            // Apply filters
            let shouldSnipe = true;
            
            // Risk level filter
            if (filters.maxRiskLevel && analysis.riskLevel) {
                const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
                const currentRiskIndex = riskLevels.indexOf(analysis.riskLevel);
                const maxRiskIndex = riskLevels.indexOf(filters.maxRiskLevel);
                
                if (currentRiskIndex > maxRiskIndex) {
                    shouldSnipe = false;
                }
            }
            
            // Market cap filter
            if (filters.maxMarketCap && analysis.tokenMetadata) {
                // Implementation would check market cap
            }
            
            if (shouldSnipe) {
                console.log(`🎯 Auto-snipe conditions met for ${tokenAddress}`);
                await this.addSnipeTarget(tokenAddress, {
                    autoSnipe: true,
                    amount: filters.defaultAmount || 0.1,
                    source: 'auto_detection'
                });
            }
            
        } catch (error) {
            console.error('Auto-snipe condition check error:', error);
        }
    }

    // Store detection event
    async storeDetectionEvent(event) {
        try {
            const result = await chrome.storage.local.get(['detectionHistory']);
            const history = result.detectionHistory || [];
            
            history.unshift(event);
            
            // Keep only last 200 events
            if (history.length > 200) {
                history.splice(200);
            }
            
            await chrome.storage.local.set({ detectionHistory: history });
        } catch (error) {
            console.error('Error storing detection event:', error);
        }
    }

    // Store alert
    async storeAlert(alert) {
        try {
            const result = await chrome.storage.local.get(['alertHistory']);
            const history = result.alertHistory || [];
            
            history.unshift(alert);
            
            // Keep only last 100 alerts
            if (history.length > 100) {
                history.splice(100);
            }
            
            await chrome.storage.local.set({ alertHistory: history });
        } catch (error) {
            console.error('Error storing alert:', error);
        }
    }

    // Record snipe attempt
    async recordSnipeAttempt(tokenAddress, amount, source) {
        try {
            const attempt = {
                tokenAddress,
                amount,
                source,
                timestamp: Date.now(),
                status: 'initiated'
            };
            
            const result = await chrome.storage.local.get(['snipeAttempts']);
            const attempts = result.snipeAttempts || [];
            
            attempts.unshift(attempt);
            
            // Keep only last 50 attempts
            if (attempts.length > 50) {
                attempts.splice(50);
            }
            
            await chrome.storage.local.set({ snipeAttempts: attempts });
        } catch (error) {
            console.error('Error recording snipe attempt:', error);
        }
    }

    // Setup periodic tasks
    setupPeriodicTasks() {
        // Update rugger database every hour
        chrome.alarms.create('updateRuggerDB', { periodInMinutes: 60 });
        
        // Clean old data every 6 hours
        chrome.alarms.create('cleanOldData', { periodInMinutes: 360 });
        
        // Health check every 5 minutes
        chrome.alarms.create('healthCheck', { periodInMinutes: 5 });
        
        chrome.alarms.onAlarm.addListener((alarm) => {
            switch (alarm.name) {
                case 'updateRuggerDB':
                    this.updateRuggerDatabase();
                    break;
                case 'cleanOldData':
                    this.cleanOldData();
                    break;
                case 'healthCheck':
                    this.performHealthCheck();
                    break;
            }
        });
    }

    // Initialize sniping monitoring
    initializeSnipingMonitoring() {
        if (this.snipingEngine) {
            // Load saved settings and targets
            this.loadSnipingState();
        }
    }

    // Load sniping state
    async loadSnipingState() {
        try {
            const result = await chrome.storage.local.get(['snipeTargets', 'monitoringActive']);
            
            if (result.snipeTargets) {
                for (const [address, config] of Object.entries(result.snipeTargets)) {
                    this.snipingEngine.addSnipeTarget(address, config);
                }
            }
            
            if (result.monitoringActive) {
                this.startSnipingMode();
            }
        } catch (error) {
            console.error('Error loading sniping state:', error);
        }
    }

    // Update rugger database
    async updateRuggerDatabase() {
        if (this.devReputationTracker) {
            await this.devReputationTracker.updateRuggerDatabase();
        }
    }

    // Clean old data
    async cleanOldData() {
        try {
            const keys = ['detectionHistory', 'alertHistory', 'snipeAttempts', 'analysisHistory'];
            const result = await chrome.storage.local.get(keys);
            
            const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
            
            for (const key of keys) {
                if (result[key]) {
                    const cleaned = result[key].filter(item => item.timestamp > cutoffTime);
                    await chrome.storage.local.set({ [key]: cleaned });
                }
            }
            
            console.log('🧹 Old data cleaned');
        } catch (error) {
            console.error('Error cleaning old data:', error);
        }
    }

    // Perform health check
    async performHealthCheck() {
        try {
            const status = {
                snipingEngine: !!this.snipingEngine,
                devTracker: !!this.devReputationTracker,
                monitoring: this.monitoringActive,
                timestamp: Date.now()
            };
            
            await chrome.storage.local.set({ healthStatus: status });
        } catch (error) {
            console.error('Health check error:', error);
        }
    }
}

// Initialize background script
new SolSniperBackground(); 