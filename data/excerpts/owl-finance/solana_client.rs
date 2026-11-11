    /// Submit UpdateCreditScore transaction to Solana
    pub async fn update_credit_score(
        &self,
        user_pubkey: &str,
        new_score: u16,
        proof_hash: &str,
        expiry: i64,
    ) -> Result<String> {
        let user_pk = Pubkey::from_str(user_pubkey)
            .map_err(|e| anyhow!("Invalid user pubkey: {}", e))?;
    
        // Convert proof_hash hex string to [u8; 32]
        let proof_hash_bytes = hex::decode(proof_hash)
            .map_err(|e| anyhow!("Invalid proof hash: {}", e))?;
    
        if proof_hash_bytes.len() != 32 {
            return Err(anyhow!("Proof hash must be 32 bytes"));
        }
    
        let mut proof_hash_array = [0u8; 32];
        proof_hash_array.copy_from_slice(&proof_hash_bytes);
    
        // Derive CreditScoreAccount PDA
        let (credit_score_account, _bump) = Pubkey::find_program_address(
            &[b"credit_score", user_pk.as_ref()],
            &self.credit_score_program_id,
        );
    
        tracing::info!(
            "Updating credit score for {} to {} (proof: {})",
            user_pubkey,
            new_score,
            &proof_hash[..8]
        );
    
        // Clone references for the blocking task
        let program = self.client.program(self.credit_score_program_id)?;
        let authority = Arc::clone(&self.authority_keypair);
    
        // Run the synchronous anchor-client send in a blocking thread
        let signature = tokio::task::spawn_blocking(move || {
            program
                .request()
                .accounts(accounts::UpdateCreditScore {
                    credit_score_account,
                    authority: authority.pubkey(),
                    system_program: system_program::ID,
                })
                .args(args::UpdateCreditScore {
                    user_pubkey: user_pk,
                    new_score,
                    proof_hash: proof_hash_array,
                    expiry,
                })
                .signer(&*authority)
                .send()
        })
        .await??; // first ? unwraps JoinHandle<Result<...>>, second ? unwraps ClientError
    
        tracing::info!("Credit score updated, tx: {}", signature);
        Ok(signature.to_string())
    }
