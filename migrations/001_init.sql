CREATE TABLE users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL,
    ob_title    TEXT,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_users_email_active ON users (LOWER(email)) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users (role);

CREATE TABLE teams (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_teams_name ON teams (LOWER(name));
CREATE INDEX idx_teams_type ON teams (type);

CREATE TABLE user_teams (
    user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id   TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    position  TEXT NOT NULL,
    PRIMARY KEY (user_id, team_id)
);
CREATE INDEX idx_user_teams_team ON user_teams (team_id);

CREATE TABLE meetings (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,
    color       TEXT NOT NULL,
    team_id     TEXT REFERENCES teams(id) ON DELETE SET NULL,
    topic       TEXT NOT NULL,
    date        DATE NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    note        TEXT,
    location    TEXT,
    link        TEXT,
    created_by  TEXT NOT NULL REFERENCES users(id),
    status      TEXT NOT NULL DEFAULT 'scheduled',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    CONSTRAINT chk_meetings_time_order CHECK (end_time > start_time)
);
CREATE INDEX idx_meetings_date ON meetings (date);
CREATE INDEX idx_meetings_team ON meetings (team_id);
CREATE INDEX idx_meetings_status ON meetings (status);

CREATE TABLE announcements (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,
    team_id     TEXT REFERENCES teams(id) ON DELETE SET NULL,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    priority    TEXT NOT NULL DEFAULT 'normal',
    is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
    created_by  TEXT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ
);
CREATE INDEX idx_announcements_feed ON announcements (is_pinned DESC, created_at DESC);
CREATE INDEX idx_announcements_team ON announcements (team_id);

