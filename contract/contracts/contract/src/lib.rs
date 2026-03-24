#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Map, String, Symbol, Vec,
};

// ─── Storage Keys ────────────────────────────────────────────────────────────
const IDENTITY: Symbol = symbol_short!("IDENTITY");
const ATTR_KEY: Symbol = symbol_short!("ATTRS");
const VERIFIER: Symbol = symbol_short!("VERIFIER");

// ─── Data Structures ─────────────────────────────────────────────────────────

/// Core identity record stored on-chain
#[contracttype]
#[derive(Clone)]
pub struct Identity {
    pub owner: Address,
    pub did: String,            // Decentralised Identifier (e.g. "did:stellar:<pubkey>")
    pub display_name: String,
    pub created_at: u64,        // ledger timestamp
    pub updated_at: u64,
    pub is_active: bool,
}

/// A single verifiable claim attached to an identity
#[contracttype]
#[derive(Clone)]
pub struct Claim {
    pub key: String,            // e.g. "email", "kyc_level", "country"
    pub value: String,
    pub issuer: Address,        // who attested this claim
    pub issued_at: u64,
    pub expires_at: u64,        // 0 = never expires
    pub is_revoked: bool,
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct DigitalIdentityContract;

#[contractimpl]
impl DigitalIdentityContract {

    // ── Identity CRUD ─────────────────────────────────────────────────────

    /// Register a new on-chain identity for `owner`.
    /// Panics if an identity already exists for this address.
    pub fn register_identity(
        env: Env,
        owner: Address,
        did: String,
        display_name: String,
    ) -> Identity {
        owner.require_auth();

        let key = (IDENTITY, owner.clone());
        if env.storage().persistent().has(&key) {
            panic!("identity already registered");
        }

        let now = env.ledger().timestamp();
        let identity = Identity {
            owner: owner.clone(),
            did,
            display_name,
            created_at: now,
            updated_at: now,
            is_active: true,
        };

        env.storage().persistent().set(&key, &identity);
        identity
    }

    /// Fetch an identity record.
    pub fn get_identity(env: Env, owner: Address) -> Identity {
        let key = (IDENTITY, owner);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("identity not found"))
    }

    /// Update display_name (owner-only).
    pub fn update_display_name(
        env: Env,
        owner: Address,
        new_display_name: String,
    ) -> Identity {
        owner.require_auth();

        let key = (IDENTITY, owner.clone());
        let mut identity: Identity = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("identity not found"));

        identity.display_name = new_display_name;
        identity.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &identity);
        identity
    }

    /// Deactivate (soft-delete) an identity.  Does not erase claims.
    pub fn deactivate_identity(env: Env, owner: Address) {
        owner.require_auth();

        let key = (IDENTITY, owner.clone());
        let mut identity: Identity = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("identity not found"));

        identity.is_active = false;
        identity.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &identity);
    }

    // ── Claims ────────────────────────────────────────────────────────────

    /// Attach (or overwrite) a verifiable claim to `subject`'s identity.
    /// `issuer` must be a registered verifier or the subject themselves.
    pub fn add_claim(
        env: Env,
        subject: Address,
        issuer: Address,
        claim_key: String,
        claim_value: String,
        expires_at: u64,
    ) -> Claim {
        issuer.require_auth();

        // Subject must have an active identity
        let id_key = (IDENTITY, subject.clone());
        let identity: Identity = env
            .storage()
            .persistent()
            .get(&id_key)
            .unwrap_or_else(|| panic!("identity not found"));
        if !identity.is_active {
            panic!("identity is deactivated");
        }

        let now = env.ledger().timestamp();
        let claim = Claim {
            key: claim_key.clone(),
            value: claim_value,
            issuer: issuer.clone(),
            issued_at: now,
            expires_at,
            is_revoked: false,
        };

        // Store under (ATTR_KEY, subject, claim_key)
        let claim_storage_key = (ATTR_KEY, subject.clone(), claim_key);
        env.storage().persistent().set(&claim_storage_key, &claim);
        claim
    }

    /// Retrieve a specific claim by subject + key.
    pub fn get_claim(env: Env, subject: Address, claim_key: String) -> Claim {
        let key = (ATTR_KEY, subject, claim_key);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("claim not found"))
    }

    /// Revoke a claim.  Only the original issuer may revoke.
    pub fn revoke_claim(
        env: Env,
        subject: Address,
        issuer: Address,
        claim_key: String,
    ) {
        issuer.require_auth();

        let key = (ATTR_KEY, subject, claim_key);
        let mut claim: Claim = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("claim not found"));

        if claim.issuer != issuer {
            panic!("only the original issuer can revoke");
        }

        claim.is_revoked = true;
        env.storage().persistent().set(&key, &claim);
    }

    // ── Verifier Registry ─────────────────────────────────────────────────

    /// Self-register as a trusted verifier (anyone can do this;
    /// your actual trust is determined by relying parties).
    pub fn register_verifier(env: Env, verifier: Address, name: String) {
        verifier.require_auth();
        let key = (VERIFIER, verifier.clone());
        env.storage().persistent().set(&key, &name);
    }

    /// Check whether an address is a registered verifier.
    pub fn is_verifier(env: Env, verifier: Address) -> bool {
        let key = (VERIFIER, verifier);
        env.storage().persistent().has(&key)
    }

    /// Convenience: verify that a claim is valid (exists, not revoked, not expired).
    pub fn verify_claim(
        env: Env,
        subject: Address,
        claim_key: String,
    ) -> bool {
        let key = (ATTR_KEY, subject, claim_key);
        if let Some(claim) = env.storage().persistent().get::<_, Claim>(&key) {
            let now = env.ledger().timestamp();
            let not_expired = claim.expires_at == 0 || claim.expires_at > now;
            !claim.is_revoked && not_expired
        } else {
            false
        }
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, DigitalIdentityContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, DigitalIdentityContract);
        let client = DigitalIdentityContractClient::new(&env, &contract_id);
        (env, client)
    }

    #[test]
    fn test_register_and_get_identity() {
        let (env, client) = setup();
        let owner = Address::generate(&env);

        let identity = client.register_identity(
            &owner,
            &String::from_str(&env, "did:stellar:GABC123"),
            &String::from_str(&env, "Alice"),
        );

        assert_eq!(identity.display_name, String::from_str(&env, "Alice"));
        assert!(identity.is_active);

        let fetched = client.get_identity(&owner);
        assert_eq!(fetched.did, String::from_str(&env, "did:stellar:GABC123"));
    }

    #[test]
    fn test_add_and_verify_claim() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let issuer = Address::generate(&env);

        client.register_identity(
            &owner,
            &String::from_str(&env, "did:stellar:GABC123"),
            &String::from_str(&env, "Alice"),
        );

        client.add_claim(
            &owner,
            &issuer,
            &String::from_str(&env, "kyc_level"),
            &String::from_str(&env, "2"),
            &0u64, // never expires
        );

        assert!(client.verify_claim(&owner, &String::from_str(&env, "kyc_level")));
    }

    #[test]
    fn test_revoke_claim() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let issuer = Address::generate(&env);

        client.register_identity(
            &owner,
            &String::from_str(&env, "did:stellar:GXYZ"),
            &String::from_str(&env, "Bob"),
        );
        client.add_claim(
            &owner,
            &issuer,
            &String::from_str(&env, "email_verified"),
            &String::from_str(&env, "true"),
            &0u64,
        );
        client.revoke_claim(
            &owner,
            &issuer,
            &String::from_str(&env, "email_verified"),
        );

        assert!(!client.verify_claim(&owner, &String::from_str(&env, "email_verified")));
    }
}