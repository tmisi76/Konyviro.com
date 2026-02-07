-- Új mezők a referrals táblához az affiliate tracking-hez
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS ip_address inet;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS is_fraud boolean DEFAULT false;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS fraud_reason text;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- Indexek a gyors lekérdezéshez
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_is_fraud ON referrals(is_fraud);
CREATE INDEX IF NOT EXISTS idx_referrals_ip_address ON referrals(ip_address);

-- Új mezők a profiles táblához az affiliate ban kezeléshez
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_banned boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_ban_reason text;