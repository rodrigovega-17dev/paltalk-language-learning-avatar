-- Migration: Add streak tracking functionality
-- Run this in your Supabase SQL Editor

-- Add streak columns to existing user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_interaction_date DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS streak_freeze_count INTEGER DEFAULT 0;

-- Create daily_interactions table for streak tracking
CREATE TABLE IF NOT EXISTS daily_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_date DATE NOT NULL,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interaction_date)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_daily_interactions_user_date ON daily_interactions(user_id, interaction_date DESC);

-- Enable Row Level Security
ALTER TABLE daily_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_interactions
CREATE POLICY "Users can view their own daily interactions" ON daily_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily interactions" ON daily_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily interactions" ON daily_interactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily interactions" ON daily_interactions
  FOR DELETE USING (auth.uid() = user_id);
