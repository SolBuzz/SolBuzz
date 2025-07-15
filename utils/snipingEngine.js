// SolBuzz - Advanced Sniping Engine
class AdvancedSnipingEngine {
    constructor() {
        this.isActive = false;
        this.snipeTargets = new Map();
        this.priceAlerts = new Map();
        this.volumeThresholds = new Map();
        this.autoSnipeSettings = null;
        this.monitoringInterval = null;
        this.connectionPool = [];
        
        this.init();
    }

    async init() {
        await this.loadSnipeSettings();
        this.setupConnectionPool();
        this.initializeMonitoring();
    }

    // Setup multiple RPC connections for faster response
    setupConnectionPool() {
        const rpcEndpoints = [
            'https://mainnet-beta.solana.com',
            'https://api.mainnet-beta.solana.com',
            'https://solana-api.projectserum.com',
            'https://rpc.ankr.com/solana',
            'https://api.metaplex.solana.com'
        ];

        this.connectionPool = rpcEndpoints.map(endpoint => ({
            url: endpoint,
            latency: 0,
            isHealthy: true,
            lastCheck: Date.now()
        }));

        // Test connection latencies
        this.testConnectionLatencies();
        
        // Setup periodic health checks
        setInterval(() => this.healthCheckConnections(), 30000);
    }

    // Test and rank RPC connections by latency
    async testConnectionLatencies() {
        for (const connection of this.connectionPool) {
            try {
                const start = Date.now();
                
                const response = await fetch(connection.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getHealth'
                    })
                });

                if (response.ok) {
                    connection.latency = Date.now() - start;
                    connection.isHealthy = true;
                } else {
                    connection.isHealthy = false;
                }
            } catch (error) {
                connection.isHealthy = false;
                connection.latency = 9999;
            }
            connection.lastCheck = Date.now();
        }

        // Sort by latency (fastest first)
        this.connectionPool.sort((a, b) => a.latency - b.latency);
    }

    // Health check for RPC connections
    async healthCheckConnections() {
        await this.testConnectionLatencies();
    }

    // Get fastest available RPC connection
    getFastestRPC() {
        const healthyConnections = this.connectionPool.filter(conn => conn.isHealthy);
        return healthyConnections.length > 0 ? healthyConnections[0] : this.connectionPool[0];
    }

    // Load sniping settings
    async loadSnipeSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'autoSnipeEnabled',
                'snipeAmount',
                'maxSlippage',
                'gasPrice',
                'priceTargets',
                'volumeThresholds',
                'stopLossPercentage',
                'takeProfitPercentage'
            ]);

            this.autoSnipeSettings = {
                enabled: result.autoSnipeEnabled || false,
                amount: result.snipeAmount || 0.1, // SOL
                maxSlippage: result.maxSlippage || 5, // %
                gasPrice: result.gasPrice || 'fast',
                stopLoss: result.stopLossPercentage || 50, // %
                takeProfit: result.takeProfitPercentage || 200, // %
                priceTargets: result.priceTargets || {},
                volumeThresholds: result.volumeThresholds || {}
            };
        } catch (error) {
            console.error('Error loading snipe settings:', error);
            this.autoSnipeSettings = this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            enabled: false,
            amount: 0.1,
            maxSlippage: 5,
            gasPrice: 'fast',
            stopLoss: 50,
            takeProfit: 200,
            priceTargets: {},
            volumeThresholds: {}
        };
    }

    // Initialize real-time monitoring
    initializeMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        // Monitor every 500ms for maximum speed
        this.monitoringInterval = setInterval(() => {
            this.monitorTargets();
        }, 500);

        console.log('✅ Advanced sniping monitoring initialized');
    }

    // Add token to snipe monitoring
    addSnipeTarget(tokenAddress, config) {
        const target = {
            tokenAddress,
            addedAt: Date.now(),
            priceTarget: config.priceTarget || null,
            volumeTarget: config.volumeTarget || null,
            maxMarketCap: config.maxMarketCap || null,
            autoSnipe: config.autoSnipe || false,
            amount: config.amount || this.autoSnipeSettings.amount,
            triggered: false,
            lastCheck: 0,
            metadata: null,
            currentPrice: null,
            volume24h: null,
            marketCap: null,
            liquidityUSD: null,
            alerts: []
        };

        this.snipeTargets.set(tokenAddress, target);
        
        chrome.runtime.sendMessage({
            action: 'snipeTargetAdded',
            tokenAddress,
            config
        });

        console.log(`🎯 Added snipe target: ${tokenAddress}`);
        return target;
    }

    // Remove snipe target
    removeSnipeTarget(tokenAddress) {
        if (this.snipeTargets.has(tokenAddress)) {
            this.snipeTargets.delete(tokenAddress);
            console.log(`❌ Removed snipe target: ${tokenAddress}`);
            
            chrome.runtime.sendMessage({
                action: 'snipeTargetRemoved',
                tokenAddress
            });
        }
    }

    // Monitor all snipe targets
    async monitorTargets() {
        if (!this.isActive || this.snipeTargets.size === 0) return;

        const promises = Array.from(this.snipeTargets.entries()).map(([address, target]) => 
            this.checkTarget(address, target)
        );

        await Promise.allSettled(promises);
    }

    // Check individual snipe target
    async checkTarget(tokenAddress, target) {
        try {
            // Avoid checking too frequently for the same token
            if (Date.now() - target.lastCheck < 1000) return;
            target.lastCheck = Date.now();

            // Get latest token data
            const tokenData = await this.getTokenDataFast(tokenAddress);
            
            if (!tokenData) return;

            // Update target data
            target.currentPrice = tokenData.price;
            target.volume24h = tokenData.volume24h;
            target.marketCap = tokenData.marketCap;
            target.liquidityUSD = tokenData.liquidity;
            target.metadata = tokenData.metadata;

            // Check trigger conditions
            const shouldTrigger = this.checkTriggerConditions(target);
            
            if (shouldTrigger && !target.triggered) {
                target.triggered = true;
                await this.handleSnipeTrigger(tokenAddress, target, shouldTrigger.reason);
            }

            // Check price alerts
            this.checkPriceAlerts(tokenAddress, target);

        } catch (error) {
            console.error(`Error checking target ${tokenAddress}:`, error);
        }
    }

    // Get token data using fastest available method
    async getTokenDataFast(tokenAddress) {
        try {
            // Use parallel requests to multiple APIs for speed
            const promises = [
                this.getDexScreenerDataFast(tokenAddress),
                this.getBirdeyeDataFast(tokenAddress),
                this.getJupiterPriceFast(tokenAddress)
            ];

            const results = await Promise.allSettled(promises);
            
            // Combine data from fastest responding source
            const dexData = results[0].status === 'fulfilled' ? results[0].value : null;
            const birdeyeData = results[1].status === 'fulfilled' ? results[1].value : null;
            const jupiterData = results[2].status === 'fulfilled' ? results[2].value : null;

            return this.combineTokenData(dexData, birdeyeData, jupiterData);

        } catch (error) {
            console.error('Error getting token data:', error);
            return null;
        }
    }

    // Fast DexScreener API call
    async getDexScreenerDataFast(tokenAddress) {
        const fastRPC = this.getFastestRPC();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

        try {
            const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, {
                signal: controller.signal,
                headers: { 'User-Agent': 'SolSniper-Pro' }
            });

            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            return data.pairs && data.pairs.length > 0 ? data.pairs[0] : null;

        } catch (error) {
            clearTimeout(timeoutId);
            return null;
        }
    }

    // Fast Birdeye API call
    async getBirdeyeDataFast(tokenAddress) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        try {
            const response = await fetch(`https://public-api.birdeye.so/public/price?address=${tokenAddress}`, {
                signal: controller.signal,
                headers: { 'X-API-KEY': 'your-birdeye-api-key' }
            });

            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            return await response.json();

        } catch (error) {
            clearTimeout(timeoutId);
            return null;
        }
    }

    // Fast Jupiter price API call
    async getJupiterPriceFast(tokenAddress) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        try {
            const response = await fetch(`https://price.jup.ag/v4/price?ids=${tokenAddress}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            return data.data && data.data[tokenAddress] ? data.data[tokenAddress] : null;

        } catch (error) {
            clearTimeout(timeoutId);
            return null;
        }
    }

    // Combine data from multiple sources
    combineTokenData(dexData, birdeyeData, jupiterData) {
        if (!dexData && !birdeyeData && !jupiterData) return null;

        return {
            price: dexData?.priceUsd || birdeyeData?.value || jupiterData?.price || 0,
            volume24h: dexData?.volume?.h24 || 0,
            marketCap: dexData?.fdv || birdeyeData?.marketCap || 0,
            liquidity: dexData?.liquidity?.usd || 0,
            priceChange24h: dexData?.priceChange?.h24 || 0,
            metadata: {
                name: dexData?.baseToken?.name || 'Unknown',
                symbol: dexData?.baseToken?.symbol || 'UNK',
                address: dexData?.baseToken?.address
            },
            source: dexData ? 'dexscreener' : birdeyeData ? 'birdeye' : 'jupiter',
            timestamp: Date.now()
        };
    }

    // Check if target conditions are met
    checkTriggerConditions(target) {
        const reasons = [];

        // Price target check
        if (target.priceTarget && target.currentPrice >= target.priceTarget) {
            reasons.push(`Price target reached: $${target.currentPrice} >= $${target.priceTarget}`);
        }

        // Volume target check
        if (target.volumeTarget && target.volume24h >= target.volumeTarget) {
            reasons.push(`Volume target reached: $${target.volume24h} >= $${target.volumeTarget}`);
        }

        // Market cap check
        if (target.maxMarketCap && target.marketCap <= target.maxMarketCap) {
            reasons.push(`Market cap under threshold: $${target.marketCap} <= $${target.maxMarketCap}`);
        }

        // Liquidity check for safety
        if (target.liquidityUSD > 10000) { // Minimum $10k liquidity
            reasons.push('Sufficient liquidity detected');
        }

        // New token detection (price movement spike)
        const priceChange = target.metadata?.priceChange24h || 0;
        if (priceChange > 100) { // 100% price increase
            reasons.push(`Significant price movement: +${priceChange}%`);
        }

        return reasons.length > 0 ? { triggered: true, reason: reasons.join(', ') } : { triggered: false };
    }

    // Handle snipe trigger
    async handleSnipeTrigger(tokenAddress, target, reason) {
        console.log(`🚀 SNIPE TRIGGERED for ${tokenAddress}: ${reason}`);

        // Send notification
        this.sendSnipeAlert(tokenAddress, target, reason);

        // Execute auto-snipe if enabled
        if (target.autoSnipe && this.autoSnipeSettings.enabled) {
            await this.executeAutoSnipe(tokenAddress, target);
        }

        // Log snipe event
        await this.logSnipeEvent(tokenAddress, target, reason);
    }

    // Send snipe alert
    sendSnipeAlert(tokenAddress, target, reason) {
        const notification = {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '🚀 SolBuzz Alert!',
            message: `Snipe opportunity: ${target.metadata?.symbol || tokenAddress.slice(0, 8)}...\n${reason}`
        };

        chrome.notifications.create(`snipe_${tokenAddress}`, notification);

        // Send message to popup/content script
        chrome.runtime.sendMessage({
            action: 'snipeTriggered',
            tokenAddress,
            target,
            reason,
            timestamp: Date.now()
        });
    }

    // Execute automatic snipe
    async executeAutoSnipe(tokenAddress, target) {
        try {
            console.log(`🎯 Executing auto-snipe for ${tokenAddress}`);

            // Prepare transaction parameters
            const txParams = {
                tokenAddress,
                amount: target.amount,
                slippage: this.autoSnipeSettings.maxSlippage,
                gasPrice: this.autoSnipeSettings.gasPrice,
                timestamp: Date.now()
            };

            // Build transaction (this would integrate with wallet)
            const transaction = await this.buildSnipeTransaction(txParams);
            
            if (transaction) {
                // In a real implementation, this would send the transaction
                console.log('📝 Transaction built:', transaction);
                
                // Simulate successful snipe
                await this.recordSuccessfulSnipe(tokenAddress, target, txParams);
            }

        } catch (error) {
            console.error('Auto-snipe execution error:', error);
            
            chrome.notifications.create(`snipe_error_${tokenAddress}`, {
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: '❌ Auto-Snipe Failed',
                message: `Failed to execute snipe for ${target.metadata?.symbol}: ${error.message}`
            });
        }
    }

    // Build snipe transaction
    async buildSnipeTransaction(params) {
        // This is a placeholder for transaction building
        // In a real implementation, this would integrate with:
        // - Jupiter aggregator for best routes
        // - Raydium/Orca for direct DEX interaction
        // - Wallet connection for signing

        return {
            type: 'swap',
            fromToken: 'SOL',
            toToken: params.tokenAddress,
            amount: params.amount,
            slippage: params.slippage,
            route: 'jupiter',
            estimatedOutput: params.amount * 1000000, // Placeholder
            gasEstimate: 0.001,
            built: true,
            timestamp: params.timestamp
        };
    }

    // Record successful snipe
    async recordSuccessfulSnipe(tokenAddress, target, txParams) {
        const snipeRecord = {
            tokenAddress,
            symbol: target.metadata?.symbol,
            price: target.currentPrice,
            amount: txParams.amount,
            timestamp: Date.now(),
            reason: 'auto_snipe',
            status: 'completed'
        };

        // Store in snipe history
        const result = await chrome.storage.local.get(['snipeHistory']);
        const history = result.snipeHistory || [];
        history.unshift(snipeRecord);
        
        // Keep only last 100 snipes
        if (history.length > 100) history.splice(100);
        
        await chrome.storage.local.set({ snipeHistory: history });
    }

    // Price alert checking
    checkPriceAlerts(tokenAddress, target) {
        const alerts = this.priceAlerts.get(tokenAddress) || [];
        
        alerts.forEach(alert => {
            if (!alert.triggered && this.isPriceAlertTriggered(alert, target.currentPrice)) {
                alert.triggered = true;
                this.sendPriceAlert(tokenAddress, alert, target);
            }
        });
    }

    isPriceAlertTriggered(alert, currentPrice) {
        switch (alert.type) {
            case 'above':
                return currentPrice >= alert.price;
            case 'below':
                return currentPrice <= alert.price;
            case 'change':
                return Math.abs(currentPrice - alert.basePrice) / alert.basePrice * 100 >= alert.percentage;
            default:
                return false;
        }
    }

    sendPriceAlert(tokenAddress, alert, target) {
        chrome.notifications.create(`price_alert_${tokenAddress}`, {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '📈 Price Alert',
            message: `${target.metadata?.symbol}: $${target.currentPrice} (${alert.type} $${alert.price})`
        });
    }

    // Log snipe event
    async logSnipeEvent(tokenAddress, target, reason) {
        const event = {
            tokenAddress,
            symbol: target.metadata?.symbol,
            price: target.currentPrice,
            marketCap: target.marketCap,
            volume: target.volume24h,
            reason,
            timestamp: Date.now()
        };

        const result = await chrome.storage.local.get(['snipeEvents']);
        const events = result.snipeEvents || [];
        events.unshift(event);
        
        if (events.length > 500) events.splice(500);
        
        await chrome.storage.local.set({ snipeEvents: events });
    }

    // Start/stop monitoring
    startMonitoring() {
        this.isActive = true;
        console.log('🔍 Sniping monitoring started');
    }

    stopMonitoring() {
        this.isActive = false;
        console.log('⏹️ Sniping monitoring stopped');
    }

    // Get current status
    getStatus() {
        return {
            isActive: this.isActive,
            targetCount: this.snipeTargets.size,
            connectionPool: this.connectionPool.map(conn => ({
                url: conn.url,
                latency: conn.latency,
                healthy: conn.isHealthy
            })),
            autoSnipeEnabled: this.autoSnipeSettings.enabled
        };
    }

    // Update settings
    async updateSettings(newSettings) {
        this.autoSnipeSettings = { ...this.autoSnipeSettings, ...newSettings };
        await chrome.storage.sync.set(newSettings);
    }

    // Add price alert
    addPriceAlert(tokenAddress, alertConfig) {
        if (!this.priceAlerts.has(tokenAddress)) {
            this.priceAlerts.set(tokenAddress, []);
        }
        
        const alert = {
            id: Date.now(),
            type: alertConfig.type, // 'above', 'below', 'change'
            price: alertConfig.price,
            percentage: alertConfig.percentage,
            basePrice: alertConfig.basePrice,
            triggered: false,
            created: Date.now()
        };
        
        this.priceAlerts.get(tokenAddress).push(alert);
        return alert.id;
    }

    // Remove price alert
    removePriceAlert(tokenAddress, alertId) {
        if (this.priceAlerts.has(tokenAddress)) {
            const alerts = this.priceAlerts.get(tokenAddress);
            const index = alerts.findIndex(alert => alert.id === alertId);
            if (index > -1) {
                alerts.splice(index, 1);
                if (alerts.length === 0) {
                    this.priceAlerts.delete(tokenAddress);
                }
            }
        }
    }

    // Get snipe targets
    getSnipeTargets() {
        return Array.from(this.snipeTargets.entries()).map(([address, target]) => ({
            address,
            ...target
        }));
    }

    // Clear all targets
    clearAllTargets() {
        this.snipeTargets.clear();
        this.priceAlerts.clear();
        console.log('🗑️ All snipe targets cleared');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedSnipingEngine;
} else if (typeof window !== 'undefined') {
    window.AdvancedSnipingEngine = AdvancedSnipingEngine;
} 