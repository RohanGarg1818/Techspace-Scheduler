CREATE TABLE IF NOT EXISTS tentative_meetings (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  color TEXT NOT NULL,
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,  -- optional: null means all-day
  end_time TIME,    -- optional: null means all-day
  note TEXT,
  location TEXT,
  link TEXT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  
  -- Constraints
  CONSTRAINT chk_tentative_date_order CHECK (start_date <= end_date),
  CONSTRAINT chk_tentative_time_consistency CHECK (
    (start_time IS NULL AND end_time IS NULL) OR 
    (start_time IS NOT NULL AND end_time IS NOT NULL)
  ),
  CONSTRAINT chk_tentative_time_order CHECK (
    start_time IS NULL OR end_time IS NULL OR start_time < end_time
  )
);


CREATE INDEX idx_tentative_meetings_date_range ON tentative_meetings(start_date, end_date);
CREATE INDEX idx_tentative_meetings_team ON tentative_meetings(team_id);
CREATE INDEX idx_tentative_meetings_status ON tentative_meetings(status);
CREATE INDEX idx_tentative_meetings_created_by ON tentative_meetings(created_by);
