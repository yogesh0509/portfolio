    async signTransaction(xdr: string, network: string): Promise<SigningResult> {
        try {
            // Get the private key from environment
            const config = await validateStellarConfig(this.runtime);
            const secretKey = config.STELLAR_SECRET_KEY;

            // Determine network passphrase
            const networkPassphrase = network === "TESTNET"
                ? StellarSdk.Networks.TESTNET
                : StellarSdk.Networks.PUBLIC;

            // Create keypair from secret
            const keypair = StellarSdk.Keypair.fromSecret(secretKey);

            // Decode and sign the transaction
            const transaction = new StellarSdk.Transaction(
                xdr,
                networkPassphrase
            );

            transaction.sign(keypair);
            const signedXdr = transaction.toXDR();

            return {
                success: true,
                message: "Transaction signed successfully",
                signedXdr
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to sign transaction",
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    }
