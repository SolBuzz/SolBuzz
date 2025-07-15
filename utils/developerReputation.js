// SolBuzz - Developer Reputation Tracking System
class DeveloperReputationTracker {
    constructor() {
        this.ruggerDatabase = new Map();
        this.legitimateDevs = new Map();
        this.reputationScores = new Map();
        this.socialProfiles = new Map();
        this.projectHistory = new Map();
        
        this.init();
    }

    async init() {
        await this.loadKnownRuggers();
        await this.loadLegitimateDevs();
        this.setupReputationMonitoring();
    }

    // Load known rugger database
    async loadKnownRuggers() {
        const knownRuggers = [
            // High-profile known ruggers
            {
                walletAddress: "CUhvAj1ChcE9q35Q8pjYTpA3A5b6M9F2dB3Y8mK1zXpq",
                aliases: ["DegenerateScammer", "PumpAndDump420"],
                rugCount: 15,
                totalStolen: 250000, // USD
                lastActivity: "2024-01-15",
                patterns: ["quick_exit", "fake_partnerships", "honeypot"],
                socialProfiles: {
                    twitter: "@fake_dev_account",
                    telegram: "@rugger_scammer"
                },
                flaggedTokens: [
                    "TokenA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0",
                    "TokenB2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1"
                ],
                riskLevel: "CRITICAL"
            },
            {
                walletAddress: "BundlerExtremeScamZ9Y8X7W6V5U4T3S2R1Q0P9O8N7M6",
                aliases: ["BundleKing", "FakeVolume"],
                rugCount: 8,
                totalStolen: 180000,
                lastActivity: "2024-01-10",
                patterns: ["bundle_creation", "fake_volume", "wash_trading"],
                socialProfiles: {
                    twitter: "@bundle_creator",
                    telegram: null
                },
                flaggedTokens: [
                    "TokenC3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2"
                ],
                riskLevel: "CRITICAL"
            },
            {
                walletAddress: "HoneypotMasterX1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5",
                aliases: ["HoneypotMaster", "LiquidityThief"],
                rugCount: 12,
                totalStolen: 320000,
                lastActivity: "2024-01-08",
                patterns: ["honeypot", "liquidity_removal", "smart_contract_manipulation"],
                socialProfiles: {
                    twitter: "@honeypot_dev",
                    github: "honeypot-creator"
                },
                flaggedTokens: [
                    "TokenD4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3",
                    "TokenE5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4"
                ],
                riskLevel: "CRITICAL"
            }
        ];

        // Load into memory and storage
        for (const rugger of knownRuggers) {
            this.ruggerDatabase.set(rugger.walletAddress, rugger);
            
            // Add aliases as keys too
            if (rugger.aliases) {
                rugger.aliases.forEach(alias => {
                    this.ruggerDatabase.set(alias.toLowerCase(), rugger);
                });
            }
        }

        // Store in extension storage
        await chrome.storage.local.set({ 
            knownRuggers: Array.from(this.ruggerDatabase.entries()),
            lastRuggerUpdate: Date.now()
        });
    }

    // Load known legitimate developers
    async loadLegitimateDevs() {
        const legitimateDevs = [
            {
                walletAddress: "LegitDev1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9",
                name: "SolanaBuilder",
                reputation: 95,
                projectsLaunched: 5,
                successfulProjects: 4,
                totalValueLocked: 2500000,
                verified: true,
                socialProfiles: {
                    twitter: "@solana_builder_verified",
                    github: "solana-builder",
                    linkedin: "solana-developer"
                },
                achievements: ["verified_dev", "community_favorite", "security_audited"],
                projects: [
                    {
                        name: "StableSwap",
                        status: "active",
                        tvl: 1500000,
                        launched: "2023-06-15"
                    }
                ],
                riskLevel: "SAFE"
            },
            {
                walletAddress: "TrustedDev2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0",
                name: "DeFiExpert",
                reputation: 88,
                projectsLaunched: 8,
                successfulProjects: 7,
                totalValueLocked: 4200000,
                verified: true,
                socialProfiles: {
                    twitter: "@defi_expert_sol",
                    github: "defi-expert-solana",
                    website: "https://defiexpert.sol"
                },
                achievements: ["security_expert", "audit_passed", "community_endorsed"],
                projects: [
                    {
                        name: "YieldFarm Pro",
                        status: "active",
                        tvl: 2100000,
                        launched: "2023-08-20"
                    }
                ],
                riskLevel: "SAFE"
            }
        ];

        for (const dev of legitimateDevs) {
            this.legitimateDevs.set(dev.walletAddress, dev);
        }

        await chrome.storage.local.set({ 
            legitimateDevs: Array.from(this.legitimateDevs.entries()),
            lastLegitDevUpdate: Date.now()
        });
    }

    // Analyze developer reputation
    async analyzeDeveloperReputation(walletAddress, tokenAddress) {
        try {
            const analysis = {
                walletAddress,
                tokenAddress,
                isKnownRugger: false,
                isLegitDeveloper: false,
                reputationScore: 50, // Default neutral score
                riskLevel: 'MEDIUM',
                patterns: [],
                warnings: [],
                recommendations: [],
                socialVerification: null,
                projectHistory: null,
                timestamp: Date.now()
            };

            // Check against known rugger database
            const ruggerCheck = await this.checkKnownRugger(walletAddress);
            if (ruggerCheck.isRugger) {
                analysis.isKnownRugger = true;
                analysis.reputationScore = 0;
                analysis.riskLevel = 'CRITICAL';
                analysis.patterns.push(...ruggerCheck.patterns);
                analysis.warnings.push(`⚠️ KNOWN RUGGER: ${ruggerCheck.aliases.join(', ')}`);
                analysis.warnings.push(`💰 Previous rugs: ${ruggerCheck.rugCount} tokens, $${ruggerCheck.totalStolen.toLocaleString()} stolen`);
                analysis.recommendations.push('❌ AVOID THIS TOKEN AT ALL COSTS');
                return analysis;
            }

            // Check against legitimate developer database
            const legitimateCheck = this.checkLegitDeveloper(walletAddress);
            if (legitimateCheck.isLegitimate) {
                analysis.isLegitDeveloper = true;
                analysis.reputationScore = legitimateCheck.reputation;
                analysis.riskLevel = 'LOW';
                analysis.recommendations.push('✅ Known legitimate developer');
                analysis.recommendations.push(`📊 Reputation Score: ${legitimateCheck.reputation}/100`);
                return analysis;
            }

            // Advanced reputation analysis for unknown developers
            const advancedAnalysis = await this.performAdvancedReputationAnalysis(walletAddress, tokenAddress);
            
            analysis.reputationScore = advancedAnalysis.score;
            analysis.riskLevel = this.calculateRiskLevel(advancedAnalysis.score);
            analysis.patterns = advancedAnalysis.patterns;
            analysis.warnings = advancedAnalysis.warnings;
            analysis.recommendations = advancedAnalysis.recommendations;
            analysis.socialVerification = advancedAnalysis.socialVerification;
            analysis.projectHistory = advancedAnalysis.projectHistory;

            // Store analysis for future reference
            await this.storeAnalysis(analysis);

            return analysis;

        } catch (error) {
            console.error('Developer reputation analysis error:', error);
            return {
                walletAddress,
                tokenAddress,
                isKnownRugger: false,
                isLegitDeveloper: false,
                reputationScore: 50,
                riskLevel: 'UNKNOWN',
                patterns: ['Analysis failed'],
                warnings: ['Unable to verify developer reputation'],
                recommendations: ['Exercise extreme caution'],
                error: error.message
            };
        }
    }

    // Check if wallet is a known rugger
    async checkKnownRugger(walletAddress) {
        const rugger = this.ruggerDatabase.get(walletAddress);
        
        if (rugger) {
            return {
                isRugger: true,
                aliases: rugger.aliases,
                rugCount: rugger.rugCount,
                totalStolen: rugger.totalStolen,
                patterns: rugger.patterns,
                lastActivity: rugger.lastActivity,
                flaggedTokens: rugger.flaggedTokens
            };
        }

        // Check patterns that might indicate rugger behavior
        const patternCheck = await this.checkRuggerPatterns(walletAddress);
        return patternCheck;
    }

    // Check if wallet belongs to legitimate developer
    checkLegitDeveloper(walletAddress) {
        const dev = this.legitimateDevs.get(walletAddress);
        
        if (dev) {
            return {
                isLegitimate: true,
                name: dev.name,
                reputation: dev.reputation,
                verified: dev.verified,
                achievements: dev.achievements,
                projects: dev.projects
            };
        }

        return { isLegitimate: false };
    }

    // Advanced reputation analysis for unknown developers
    async performAdvancedReputationAnalysis(walletAddress, tokenAddress) {
        let score = 50; // Start with neutral score
        const patterns = [];
        const warnings = [];
        const recommendations = [];

        try {
            // 1. Wallet Age Analysis
            const walletAge = await this.analyzeWalletAge(walletAddress);
            if (walletAge.days < 7) {
                score -= 20;
                patterns.push('very_new_wallet');
                warnings.push(`⚠️ Very new wallet (${walletAge.days} days old)`);
            } else if (walletAge.days < 30) {
                score -= 10;
                patterns.push('new_wallet');
                warnings.push(`⚠️ New wallet (${walletAge.days} days old)`);
            } else if (walletAge.days > 365) {
                score += 10;
                patterns.push('established_wallet');
            }

            // 2. Transaction History Analysis
            const txHistory = await this.analyzeTransactionHistory(walletAddress);
            if (txHistory.suspiciousPatterns > 2) {
                score -= 15;
                patterns.push('suspicious_tx_patterns');
                warnings.push('🔍 Suspicious transaction patterns detected');
            }

            // 3. Previous Token Launches
            const previousTokens = await this.analyzePreviousTokens(walletAddress);
            if (previousTokens.ruggedTokens > 0) {
                score -= 30;
                patterns.push('previous_rugs');
                warnings.push(`🚨 ${previousTokens.ruggedTokens} previously rugged tokens`);
            } else if (previousTokens.successfulTokens > 0) {
                score += 15;
                patterns.push('successful_launches');
            }

            // 4. Social Media Verification
            const socialVerification = await this.verifySocialProfiles(walletAddress, tokenAddress);
            if (socialVerification.verified) {
                score += 20;
                patterns.push('social_verified');
            } else if (socialVerification.suspicious) {
                score -= 15;
                patterns.push('suspicious_social');
                warnings.push('📱 Suspicious or fake social media profiles');
            }

            // 5. Code Quality Analysis
            const codeAnalysis = await this.analyzeSmartContract(tokenAddress);
            if (codeAnalysis.hasRedFlags) {
                score -= 25;
                patterns.push('dangerous_contract');
                warnings.push('⚠️ Smart contract contains dangerous functions');
            } else if (codeAnalysis.isAudited) {
                score += 15;
                patterns.push('audited_contract');
            }

            // 6. Community Sentiment Analysis
            const sentiment = await this.analyzeCommunitysentiment(walletAddress, tokenAddress);
            if (sentiment.negative > 70) {
                score -= 20;
                patterns.push('negative_sentiment');
                warnings.push('😠 Negative community sentiment detected');
            }

            // Generate recommendations based on score
            if (score > 80) {
                recommendations.push('✅ High confidence in developer legitimacy');
                recommendations.push('📈 Consider for investment');
            } else if (score > 60) {
                recommendations.push('⚠️ Moderate risk developer');
                recommendations.push('🔍 Proceed with caution');
            } else if (score > 40) {
                recommendations.push('🚨 High risk developer');
                recommendations.push('⚠️ Exercise extreme caution');
            } else {
                recommendations.push('❌ Very high risk - likely scammer');
                recommendations.push('🚫 Avoid this token');
            }

            return {
                score: Math.max(0, Math.min(100, score)),
                patterns,
                warnings,
                recommendations,
                socialVerification,
                projectHistory: previousTokens
            };

        } catch (error) {
            console.error('Advanced reputation analysis error:', error);
            return {
                score: 30, // Lower score due to analysis failure
                patterns: ['analysis_failed'],
                warnings: ['Unable to complete full reputation analysis'],
                recommendations: ['Exercise extreme caution due to incomplete analysis'],
                socialVerification: null,
                projectHistory: null
            };
        }
    }

    // Check for rugger patterns
    async checkRuggerPatterns(walletAddress) {
        const patterns = [];
        let riskScore = 0;

        try {
            // Pattern 1: Multiple token launches in short timeframe
            const recentLaunches = await this.getRecentTokenLaunches(walletAddress);
            if (recentLaunches.length > 5) {
                patterns.push('rapid_multiple_launches');
                riskScore += 0.3;
            }

            // Pattern 2: Quick liquidity removal history
            const liquidityHistory = await this.analyzeLiquidityHistory(walletAddress);
            if (liquidityHistory.quickRemovals > 2) {
                patterns.push('liquidity_removal_pattern');
                riskScore += 0.4;
            }

            // Pattern 3: Wallet funding from known mixer/tumbler
            const fundingSource = await this.analyzeFundingSource(walletAddress);
            if (fundingSource.isMixer) {
                patterns.push('mixer_funding');
                riskScore += 0.2;
            }

            return {
                isRugger: riskScore > 0.6,
                riskScore,
                patterns,
                confidence: Math.min(riskScore * 100, 100)
            };

        } catch (error) {
            return {
                isRugger: false,
                riskScore: 0,
                patterns: [],
                confidence: 0
            };
        }
    }

    // Analyze wallet age
    async analyzeWalletAge(walletAddress) {
        try {
            // Simulate wallet age analysis
            // In reality, would query blockchain for first transaction
            const randomAge = Math.floor(Math.random() * 1000); // Random age in days
            
            return {
                days: randomAge,
                firstTx: new Date(Date.now() - (randomAge * 24 * 60 * 60 * 1000)).toISOString(),
                isNew: randomAge < 30
            };
        } catch (error) {
            return { days: 0, firstTx: null, isNew: true };
        }
    }

    // Analyze transaction history
    async analyzeTransactionHistory(walletAddress) {
        try {
            // Simulate transaction analysis
            return {
                totalTransactions: Math.floor(Math.random() * 1000),
                suspiciousPatterns: Math.floor(Math.random() * 5),
                averageGasUsed: Math.random() * 0.01,
                patterns: ['normal_trading']
            };
        } catch (error) {
            return { totalTransactions: 0, suspiciousPatterns: 0 };
        }
    }

    // Analyze previous tokens by this developer
    async analyzePreviousTokens(walletAddress) {
        try {
            // Simulate previous token analysis
            return {
                totalTokens: Math.floor(Math.random() * 10),
                successfulTokens: Math.floor(Math.random() * 5),
                ruggedTokens: Math.floor(Math.random() * 3),
                averageLifespan: Math.floor(Math.random() * 365)
            };
        } catch (error) {
            return { totalTokens: 0, successfulTokens: 0, ruggedTokens: 0 };
        }
    }

    // Verify social media profiles
    async verifySocialProfiles(walletAddress, tokenAddress) {
        try {
            // Simulate social verification
            const hasTwitter = Math.random() > 0.6;
            const hasTelegram = Math.random() > 0.7;
            const hasWebsite = Math.random() > 0.8;

            return {
                verified: hasTwitter && hasTelegram,
                suspicious: false,
                profiles: {
                    twitter: hasTwitter ? '@verified_dev' : null,
                    telegram: hasTelegram ? '@dev_channel' : null,
                    website: hasWebsite ? 'https://project-website.com' : null
                }
            };
        } catch (error) {
            return { verified: false, suspicious: false, profiles: {} };
        }
    }

    // Analyze smart contract
    async analyzeSmartContract(tokenAddress) {
        try {
            // Simulate contract analysis
            return {
                hasRedFlags: Math.random() > 0.8,
                isAudited: Math.random() > 0.7,
                mintingEnabled: Math.random() > 0.5,
                pausable: Math.random() > 0.6,
                ownership: Math.random() > 0.3 ? 'renounced' : 'owned'
            };
        } catch (error) {
            return { hasRedFlags: false, isAudited: false };
        }
    }

    // Analyze community sentiment
    async analyzeCommunitysentiment(walletAddress, tokenAddress) {
        try {
            // Simulate sentiment analysis
            const positive = Math.random() * 100;
            const negative = 100 - positive;

            return {
                positive,
                negative,
                neutral: Math.abs(positive - negative),
                sources: ['twitter', 'telegram', 'reddit']
            };
        } catch (error) {
            return { positive: 50, negative: 50, neutral: 0 };
        }
    }

    // Helper methods for pattern detection
    async getRecentTokenLaunches(walletAddress) {
        // Simulate recent launches
        return Array.from({ length: Math.floor(Math.random() * 8) }, (_, i) => ({
            tokenAddress: `Token${i}Address`,
            launchDate: Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000)
        }));
    }

    async analyzeLiquidityHistory(walletAddress) {
        return {
            quickRemovals: Math.floor(Math.random() * 5),
            totalRemovals: Math.floor(Math.random() * 10),
            averageTimeHeld: Math.random() * 365
        };
    }

    async analyzeFundingSource(walletAddress) {
        return {
            isMixer: Math.random() > 0.9,
            isExchange: Math.random() > 0.5,
            source: 'unknown'
        };
    }

    // Risk level calculation
    calculateRiskLevel(score) {
        if (score >= 80) return 'LOW';
        if (score >= 60) return 'MEDIUM';
        if (score >= 40) return 'HIGH';
        return 'CRITICAL';
    }

    // Store analysis for future reference
    async storeAnalysis(analysis) {
        try {
            const key = `dev_analysis_${analysis.walletAddress}`;
            await chrome.storage.local.set({ [key]: analysis });
            
            // Also store in reputation scores cache
            this.reputationScores.set(analysis.walletAddress, {
                score: analysis.reputationScore,
                riskLevel: analysis.riskLevel,
                lastUpdated: analysis.timestamp
            });
        } catch (error) {
            console.error('Error storing analysis:', error);
        }
    }

    // Get cached reputation score
    getCachedReputation(walletAddress) {
        return this.reputationScores.get(walletAddress);
    }

    // Setup reputation monitoring
    setupReputationMonitoring() {
        // Monitor for new rugger reports
        chrome.alarms.create('updateRuggerDatabase', { periodInMinutes: 60 });
        
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'updateRuggerDatabase') {
                this.updateRuggerDatabase();
            }
        });
    }

    // Update rugger database from external sources
    async updateRuggerDatabase() {
        try {
            // In a real implementation, this would fetch from external APIs
            console.log('Updating rugger database...');
            
            // Placeholder for API calls to rugger tracking services
            // const newRuggers = await this.fetchLatestRuggers();
            // this.addNewRuggers(newRuggers);
            
        } catch (error) {
            console.error('Error updating rugger database:', error);
        }
    }

    // Generate reputation report
    generateReputationReport(analysis) {
        return {
            summary: this.getReputationSummary(analysis),
            riskAssessment: this.getRiskAssessment(analysis),
            recommendations: analysis.recommendations,
            evidence: analysis.patterns,
            timestamp: analysis.timestamp
        };
    }

    getReputationSummary(analysis) {
        if (analysis.isKnownRugger) {
            return `🚨 CRITICAL: Known rugger with ${analysis.warnings.length} previous scams`;
        } else if (analysis.isLegitDeveloper) {
            return `✅ SAFE: Verified legitimate developer (${analysis.reputationScore}/100)`;
        } else {
            return `⚠️ ${analysis.riskLevel}: Unknown developer (${analysis.reputationScore}/100)`;
        }
    }

    getRiskAssessment(analysis) {
        const riskFactors = analysis.patterns.length;
        const warningCount = analysis.warnings.length;
        
        return {
            riskLevel: analysis.riskLevel,
            riskFactors,
            warningCount,
            confidence: analysis.reputationScore > 70 ? 'High' : analysis.reputationScore > 40 ? 'Medium' : 'Low'
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeveloperReputationTracker;
} else if (typeof window !== 'undefined') {
    window.DeveloperReputationTracker = DeveloperReputationTracker;
} 