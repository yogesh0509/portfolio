    // Allocate funds according to protocol constraints
    Object.entries(config.protocols).forEach(([protocol, protocolConfig]) => {
        // Normalize protocol name for comparison
        const normalizedProtocol = protocol.toLowerCase();
        console.log(`Processing allocations for ${protocol}:`, protocolConfig);

        // Find matching pools using case-insensitive comparison
        const matchingPools = poolsByProtocol[Object.keys(poolsByProtocol).find(
            key => key.toLowerCase() === normalizedProtocol
        ) || protocol];

        if (!matchingPools || matchingPools.length === 0) {
            console.log(`No pools found for ${protocol}, skipping`);
            return;
        }

        // Calculate allocation for this protocol based on strategy config
        const minAllocation = protocolConfig.minAllocation / 100;
        const maxAllocation = protocolConfig.maxAllocation / 100;
        
        // Start with minimum allocation, adjust based on market conditions
        let protocolAllocation = minAllocation;
        const marketConditionBonus = matchingPools[0].marketFit * 
            (maxAllocation - minAllocation);
        protocolAllocation = Math.min(maxAllocation, 
            protocolAllocation + marketConditionBonus);

        // Calculate actual amount for this protocol
        const protocolAmount = totalAmount * protocolAllocation;

        // Select top pools for this protocol
        const selectedPools = matchingPools
            .slice(0, Math.min(3, matchingPools.length));

        // Distribute protocol allocation among selected pools
        const totalRiskAdjustedReturn = selectedPools
            .reduce((sum, pool) => sum + pool.riskAdjustedReturn, 0);

        console.log(`${protocol} pool distribution:`, {
            selectedPools: selectedPools.length,
            totalRiskAdjustedReturn
        });

        selectedPools.forEach(pool => {
            const poolWeight = pool.riskAdjustedReturn / totalRiskAdjustedReturn;
            const amount = protocolAmount * poolWeight;

                if (pool.protocol === 'Ekubo') {
                    // For Ekubo, add a single recommendation with both token symbols
                    recommendations.push({
                        protocol: pool.protocol,
                        token: `${pool.token0}/${pool.token1}`, // Show both tokens in the pair
                        amount: amount,
                        expectedReturn: pool.apy,
                        riskScore: calculatePoolRiskScore(pool),
                        confidence: calculateConfidenceScore(pool, sentiment),
                        poolData: {
                            token0Address: pool.token0Address,
                            token1Address: pool.token1Address,
                            fee: pool.fee,
                            tickSpacing: pool.tickSpacing
                        }
                    });
                } else {
                    // For other protocols, keep existing logic
                    recommendations.push({
                        protocol: pool.protocol,
                        token: pool.token0,
                        amount: amount,
                        expectedReturn: pool.apy,
                        riskScore: calculatePoolRiskScore(pool),
                        confidence: calculateConfidenceScore(pool, sentiment)
                    });
                }

                console.log(`Adding recommendation for ${protocol}/${pool.token0}${pool.protocol === 'Ekubo' ? `/${pool.token1}` : ''}:`, {
                    poolWeight,
                    amount,
                    expectedReturn: pool.apy,
                    isEkubo: pool.protocol === 'Ekubo'
                });
            });
        
    });

    console.log("Final recommendations before return:", recommendations);
    return recommendations;
}

function calculateRiskAdjustedReturn(pool: any, config: RiskStrategy): number {
    if (!config) {
        console.log("No config provided for risk adjustment");
        return 0;
    }

    // Extract APY from pool data
    const apy = pool.apy || pool.apr || 0;
    
    // Calculate volatility from volume/TVL ratio as a proxy
    const volume = pool.volume24h?.usd || pool.volume24h || 0;
    const tvl = pool.tvl?.usd || pool.tvl || 1; // Avoid division by zero
    const volatility = volume / tvl;
    
    // Calculate Sharpe ratio with a minimum volatility floor
    const sharpeRatio = (apy - 0.02) / (volatility || 0.1); // Assuming 2% risk-free rate
    
    // Use volume/TVL ratio as a proxy for drawdown risk
    const estimatedDrawdown = Math.min(volatility, 0.3); // Cap at 30%
    const drawdownPenalty = Math.max(0, estimatedDrawdown - (config.maxDrawdown || 0.15));
    
    const result = Math.max(0, sharpeRatio * (1 - drawdownPenalty));
    return result;
}
