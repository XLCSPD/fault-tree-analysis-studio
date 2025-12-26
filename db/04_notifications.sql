-- Notifications System
-- Run this migration to add notifications support

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'action_assigned',
  'action_due',
  'action_overdue',
  'analysis_shared',
  'mention',
  'collaboration'
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Notification content
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Links to related entities (optional)
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  action_item_id UUID REFERENCES action_items(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,

  -- Actor who triggered the notification (optional)
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- State
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_org ON notifications(organization_id);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- Service role can insert notifications for any user
CREATE POLICY "Service can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Notification preferences table
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- In-app notification preferences
  action_assigned BOOLEAN DEFAULT true,
  action_due_reminder BOOLEAN DEFAULT true,
  action_overdue BOOLEAN DEFAULT true,
  analysis_shared BOOLEAN DEFAULT true,
  collaboration_updates BOOLEAN DEFAULT true,

  -- Email notification preferences (for future use)
  email_enabled BOOLEAN DEFAULT false,
  email_digest_frequency TEXT DEFAULT 'never', -- 'never', 'daily', 'weekly'

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can upsert own preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_organization_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_analysis_id UUID DEFAULT NULL,
  p_action_item_id UUID DEFAULT NULL,
  p_node_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
  v_preferences notification_preferences;
BEGIN
  -- Check user preferences
  SELECT * INTO v_preferences
  FROM notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences found, create default preferences
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (p_user_id);
    v_preferences.action_assigned := true;
    v_preferences.action_due_reminder := true;
    v_preferences.action_overdue := true;
    v_preferences.analysis_shared := true;
    v_preferences.collaboration_updates := true;
  END IF;

  -- Check if notification should be created based on preferences
  IF (p_type = 'action_assigned' AND NOT v_preferences.action_assigned) OR
     (p_type = 'action_due' AND NOT v_preferences.action_due_reminder) OR
     (p_type = 'action_overdue' AND NOT v_preferences.action_overdue) OR
     (p_type = 'analysis_shared' AND NOT v_preferences.analysis_shared) OR
     (p_type = 'collaboration' AND NOT v_preferences.collaboration_updates) THEN
    RETURN NULL;
  END IF;

  -- Insert notification
  INSERT INTO notifications (
    user_id,
    organization_id,
    type,
    title,
    description,
    analysis_id,
    action_item_id,
    node_id,
    actor_id
  )
  VALUES (
    p_user_id,
    p_organization_id,
    p_type,
    p_title,
    p_description,
    p_analysis_id,
    p_action_item_id,
    p_node_id,
    p_actor_id
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(p_notification_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE id = ANY(p_notification_ids)
    AND user_id = auth.uid()
    AND read_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE user_id = auth.uid()
    AND read_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE user_id = auth.uid()
    AND read_at IS NULL;
$$;

-- Trigger to update notification_preferences.updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add notifications to types (for TypeScript)
COMMENT ON TABLE notifications IS 'User notifications for in-app alerts';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification delivery';
