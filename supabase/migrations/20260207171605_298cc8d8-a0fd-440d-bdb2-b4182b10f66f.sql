-- Add scheduled_at column to admin_email_campaigns
ALTER TABLE admin_email_campaigns
ADD COLUMN scheduled_at timestamptz DEFAULT NULL;

-- Add index for efficient querying of scheduled campaigns
CREATE INDEX idx_admin_email_campaigns_scheduled 
ON admin_email_campaigns(status, scheduled_at) 
WHERE status = 'scheduled';