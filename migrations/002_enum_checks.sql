-- 002: enum CHECK constraints

ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('ob', 'faculty', 'executive', 'team_lead', 'member'));
ALTER TABLE teams ADD CONSTRAINT chk_teams_type CHECK (type IN ('core', 'subclub'));
ALTER TABLE user_teams ADD CONSTRAINT chk_user_teams_position CHECK (position IN ('lead', 'colead', 'member'));
ALTER TABLE meetings ADD CONSTRAINT chk_meetings_type CHECK (type IN ('ob', 'core', 'subclub'));
ALTER TABLE meetings ADD CONSTRAINT chk_meetings_status CHECK (status IN ('scheduled', 'cancelled'));
ALTER TABLE announcements ADD CONSTRAINT chk_announcements_type CHECK (type IN ('society', 'team'));
ALTER TABLE announcements ADD CONSTRAINT chk_announcements_priority CHECK (priority IN ('normal', 'urgent'));
