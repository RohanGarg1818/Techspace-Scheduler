import { getPool, initPostgres } from "./postgres.js";

class Database {
  constructor() {
    // In-memory fallback structures
    this.memoryUsers = new Map();
    this.memoryTeams = new Map();
    this.memoryMeetings = new Map();
    this.memoryAnnouncements = new Map();
    this.memoryComments = new Map();
  }

  get pool() {
    return getPool();
  }

  async query(text, params) {
    if (this.pool) {
      await initPostgres();
      return this.pool.query(text, params);
    }
    return null;
  }

  async getClient() {
    if (this.pool) {
      await initPostgres();
      return this.pool.connect();
    }
    return null;
  }

  // ==========================================
  // USER METHODS
  // ==========================================

  async createUser(user) {
    const normalizedUser = {
      ...user,
      email: user.email.toLowerCase(),
      obTitle: user.obTitle ?? null,
      deletedAt: user.deletedAt ?? null,
      teams: Array.isArray(user.teams) ? user.teams : [],
    };

    if (this.pool) {
      const client = await this.getClient();
      try {
        await client.query("BEGIN");

        const query = `
          INSERT INTO users (id, name, email, password, role, ob_title, deleted_at, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (email) DO NOTHING
          RETURNING *;
        `;
        const values = [
          normalizedUser.id,
          normalizedUser.name,
          normalizedUser.email,
          normalizedUser.password,
          normalizedUser.role,
          normalizedUser.obTitle,
          normalizedUser.deletedAt,
          new Date().toISOString(),
        ];
        const res = await client.query(query, values);

        if (res.rows.length === 0) {
          await client.query("ROLLBACK");
          return this.getUserByEmail(normalizedUser.email);
        }

        // Insert teams into junction table
        if (normalizedUser.teams.length > 0) {
          for (const team of normalizedUser.teams) {
            await client.query(
              `INSERT INTO user_teams (user_id, team_id, position)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id, team_id) DO UPDATE SET position = EXCLUDED.position;`,
              [normalizedUser.id, team.teamId, team.position],
            );
          }
        }

        await client.query("COMMIT");
        return normalizedUser;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory fallback
    this.memoryUsers.set(normalizedUser.id, normalizedUser);
    return normalizedUser;
  }

  async getUserById(id) {
    if (this.pool) {
      const userRes = await this.query(
        "SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL;",
        [id],
      );
      if (userRes.rows.length === 0) {
        return null;
      }

      const userRow = userRes.rows[0];
      const teamsRes = await this.query(
        "SELECT team_id, position FROM user_teams WHERE user_id = $1;",
        [id],
      );

      return {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        password: userRow.password,
        role: userRow.role,
        obTitle: userRow.ob_title,
        deletedAt: userRow.deleted_at,
        teams: teamsRes.rows.map((r) => ({
          teamId: r.team_id,
          position: r.position,
        })),
      };
    }

    const user = this.memoryUsers.get(id);
    if (!user || user.deletedAt) {
      return null;
    }
    return user;
  }

  async getUserByEmail(email) {
    const normalized = email.toLowerCase();

    if (this.pool) {
      const userRes = await this.query(
        "SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL;",
        [normalized],
      );
      if (userRes.rows.length === 0) {
        return null;
      }

      const userRow = userRes.rows[0];
      const teamsRes = await this.query(
        "SELECT team_id, position FROM user_teams WHERE user_id = $1;",
        [userRow.id],
      );

      return {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        password: userRow.password,
        role: userRow.role,
        obTitle: userRow.ob_title,
        deletedAt: userRow.deleted_at,
        teams: teamsRes.rows.map((r) => ({
          teamId: r.team_id,
          position: r.position,
        })),
      };
    }

    for (const user of this.memoryUsers.values()) {
      if (user.email === normalized && !user.deletedAt) {
        return user;
      }
    }
    return null;
  }

  async updateUser(id, updates) {
    if (this.pool) {
      const existing = await this.getUserById(id);
      if (!existing) {
        return null;
      }

      const client = await this.getClient();
      try {
        await client.query("BEGIN");

        const fields = [];
        const values = [];
        let index = 1;

        if (updates.name !== undefined) {
          fields.push(`name = $${index++}`);
          values.push(updates.name);
        }
        if (updates.email !== undefined) {
          fields.push(`email = $${index++}`);
          values.push(updates.email.toLowerCase());
        }
        if (updates.password !== undefined) {
          fields.push(`password = $${index++}`);
          values.push(updates.password);
        }
        if (updates.role !== undefined) {
          fields.push(`role = $${index++}`);
          values.push(updates.role);
        }
        if (updates.obTitle !== undefined) {
          fields.push(`ob_title = $${index++}`);
          values.push(updates.obTitle);
        }
        if (updates.deletedAt !== undefined) {
          fields.push(`deleted_at = $${index++}`);
          values.push(updates.deletedAt);
        }

        fields.push(`updated_at = $${index++}`);
        values.push(new Date().toISOString());

        values.push(id);
        const updateQuery = `
          UPDATE users
          SET ${fields.join(", ")}
          WHERE id = $${index}
          RETURNING *;
        `;
        await client.query(updateQuery, values);

        // Update teams if specified
        if (updates.teams !== undefined) {
          await client.query("DELETE FROM user_teams WHERE user_id = $1;", [
            id,
          ]);
          if (Array.isArray(updates.teams) && updates.teams.length > 0) {
            for (const team of updates.teams) {
              await client.query(
                `INSERT INTO user_teams (user_id, team_id, position)
                 VALUES ($1, $2, $3);`,
                [id, team.teamId, team.position],
              );
            }
          }
        }

        await client.query("COMMIT");
        return this.getUserById(id);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    const user = this.memoryUsers.get(id);
    if (!user || user.deletedAt) {
      return null;
    }

    const normalizedUpdates = {
      ...updates,
      ...(updates.email !== undefined && {
        email: updates.email.toLowerCase(),
      }),
    };
    Object.assign(user, normalizedUpdates);
    return user;
  }

  async deleteUser(id) {
    if (this.pool) {
      const existing = await this.getUserById(id);
      if (!existing) {
        return null;
      }

      const client = await this.getClient();
      try {
        await client.query("BEGIN");
        const timestamp = new Date().toISOString();
        await client.query("UPDATE users SET deleted_at = $1 WHERE id = $2;", [
          timestamp,
          id,
        ]);
        await client.query("DELETE FROM user_teams WHERE user_id = $1;", [id]);
        await client.query("COMMIT");

        return {
          ...existing,
          deletedAt: timestamp,
          teams: [],
        };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    const user = this.memoryUsers.get(id);
    if (!user || user.deletedAt) {
      return null;
    }
    user.deletedAt = new Date().toISOString();
    user.teams = [];
    return user;
  }

  async getAllUsers() {
    if (this.pool) {
      const usersRes = await this.query(
        "SELECT * FROM users WHERE deleted_at IS NULL;",
      );
      const teamsRes = await this.query("SELECT * FROM user_teams;");

      const teamsByUser = new Map();
      for (const row of teamsRes.rows) {
        if (!teamsByUser.has(row.user_id)) {
          teamsByUser.set(row.user_id, []);
        }
        teamsByUser.get(row.user_id).push({
          teamId: row.team_id,
          position: row.position,
        });
      }

      return usersRes.rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        obTitle: u.ob_title,
        deletedAt: u.deleted_at,
        teams: teamsByUser.get(u.id) || [],
      }));
    }

    return Array.from(this.memoryUsers.values()).filter((u) => !u.deletedAt);
  }

  // ==========================================
  // TEAM METHODS
  // ==========================================

  async createTeam(team) {
    if (this.pool) {
      const query = `
        INSERT INTO teams (id, name, type, description, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO NOTHING
        RETURNING *;
      `;
      const values = [
        team.id,
        team.name,
        team.type,
        team.description ?? null,
        new Date().toISOString(),
      ];
      await this.query(query, values);
      return team;
    }

    this.memoryTeams.set(team.id, team);
    return team;
  }

  async getTeamById(id) {
    if (this.pool) {
      const res = await this.query("SELECT * FROM teams WHERE id = $1;", [id]);
      if (res.rows.length === 0) {
        return null;
      }
      const row = res.rows[0];
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description,
      };
    }

    return this.memoryTeams.get(id) || null;
  }

  async getAllTeams() {
    if (this.pool) {
      const res = await this.query("SELECT * FROM teams;");
      return res.rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description,
      }));
    }

    return Array.from(this.memoryTeams.values());
  }

  async updateTeam(id, updates) {
    if (this.pool) {
      const existing = await this.getTeamById(id);
      if (!existing) {
        return null;
      }

      const fields = [];
      const values = [];
      let index = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${index++}`);
        values.push(updates.name);
      }
      if (updates.type !== undefined) {
        fields.push(`type = $${index++}`);
        values.push(updates.type);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${index++}`);
        values.push(updates.description);
      }

      fields.push(`updated_at = $${index++}`);
      values.push(new Date().toISOString());

      values.push(id);
      await this.query(
        `UPDATE teams SET ${fields.join(", ")} WHERE id = $${index};`,
        values,
      );
      return this.getTeamById(id);
    }

    const team = this.memoryTeams.get(id);
    if (!team) {
      return null;
    }
    Object.assign(team, updates);
    return team;
  }

  async deleteTeam(id) {
    if (this.pool) {
      const res = await this.query("DELETE FROM teams WHERE id = $1;", [id]);
      return res.rowCount > 0;
    }

    return this.memoryTeams.delete(id);
  }

  // ==========================================
  // MEETING METHODS
  // ==========================================

  async createMeeting(meeting) {
    if (this.pool) {
      const query = `
        INSERT INTO meetings (
          id, type, color, team_id, team_name, topic, date,
          start_time, end_time, note, location, link,
          created_by_id, created_by_name, status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16
        ) RETURNING *;
      `;
      const values = [
        meeting.id,
        meeting.type,
        meeting.color,
        meeting.team ? meeting.team.id : null,
        meeting.team ? meeting.team.name : null,
        meeting.topic,
        meeting.date,
        meeting.startTime,
        meeting.endTime,
        meeting.note ?? null,
        meeting.location ?? null,
        meeting.link ?? null,
        meeting.createdBy.id,
        meeting.createdBy.name,
        meeting.status || "scheduled",
        new Date().toISOString(),
      ];
      await this.query(query, values);
      return meeting;
    }

    this.memoryMeetings.set(meeting.id, meeting);
    return meeting;
  }

  async getMeetingById(id) {
    if (this.pool) {
      const res = await this.query("SELECT * FROM meetings WHERE id = $1;", [
        id,
      ]);
      if (res.rows.length === 0) {
        return null;
      }
      return this._mapMeetingRow(res.rows[0]);
    }

    return this.memoryMeetings.get(id) || null;
  }

  async getAllMeetings() {
    if (this.pool) {
      const res = await this.query("SELECT * FROM meetings;");
      return res.rows.map((row) => this._mapMeetingRow(row));
    }

    return Array.from(this.memoryMeetings.values());
  }

  async updateMeeting(id, updates) {
    if (this.pool) {
      const existing = await this.getMeetingById(id);
      if (!existing) {
        return null;
      }

      const fields = [];
      const values = [];
      let index = 1;

      if (updates.topic !== undefined) {
        fields.push(`topic = $${index++}`);
        values.push(updates.topic);
      }
      if (updates.date !== undefined) {
        fields.push(`date = $${index++}`);
        values.push(updates.date);
      }
      if (updates.startTime !== undefined) {
        fields.push(`start_time = $${index++}`);
        values.push(updates.startTime);
      }
      if (updates.endTime !== undefined) {
        fields.push(`end_time = $${index++}`);
        values.push(updates.endTime);
      }
      if (updates.note !== undefined) {
        fields.push(`note = $${index++}`);
        values.push(updates.note);
      }
      if (updates.location !== undefined) {
        fields.push(`location = $${index++}`);
        values.push(updates.location);
      }
      if (updates.link !== undefined) {
        fields.push(`link = $${index++}`);
        values.push(updates.link);
      }
      if (updates.status !== undefined) {
        fields.push(`status = $${index++}`);
        values.push(updates.status);
      }
      if (updates.type !== undefined) {
        fields.push(`type = $${index++}`);
        values.push(updates.type);
      }
      if (updates.color !== undefined) {
        fields.push(`color = $${index++}`);
        values.push(updates.color);
      }
      if (updates.team !== undefined) {
        fields.push(`team_id = $${index++}`);
        values.push(updates.team ? updates.team.id : null);
        fields.push(`team_name = $${index++}`);
        values.push(updates.team ? updates.team.name : null);
      }

      fields.push(`updated_at = $${index++}`);
      values.push(new Date().toISOString());

      values.push(id);
      await this.query(
        `UPDATE meetings SET ${fields.join(", ")} WHERE id = $${index};`,
        values,
      );
      return this.getMeetingById(id);
    }

    const meeting = this.memoryMeetings.get(id);
    if (!meeting) {
      return null;
    }
    Object.assign(meeting, updates);
    return meeting;
  }

  async deleteMeeting(id) {
    if (this.pool) {
      const res = await this.query("DELETE FROM meetings WHERE id = $1;", [id]);
      return res.rowCount > 0;
    }

    return this.memoryMeetings.delete(id);
  }

  _mapMeetingRow(row) {
    return {
      id: row.id,
      type: row.type,
      color: row.color,
      team: row.team_id ? { id: row.team_id, name: row.team_name } : null,
      topic: row.topic,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      note: row.note,
      location: row.location,
      link: row.link,
      createdBy: {
        id: row.created_by_id,
        name: row.created_by_name,
      },
      status: row.status,
    };
  }

  // ==========================================
  // ANNOUNCEMENT METHODS
  // ==========================================

  async createAnnouncement(announcement) {
    if (this.pool) {
      const query = `
        INSERT INTO announcements (
          id, type, team_id, team_name, title, content,
          priority, is_pinned, created_by_id, created_by_name,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12
        ) RETURNING *;
      `;
      const values = [
        announcement.id,
        announcement.type,
        announcement.team ? announcement.team.id : null,
        announcement.team ? announcement.team.name : null,
        announcement.title,
        announcement.content,
        announcement.priority || "normal",
        Boolean(announcement.isPinned),
        announcement.createdBy.id,
        announcement.createdBy.name,
        announcement.createdAt || new Date().toISOString(),
        announcement.updatedAt ?? null,
      ];
      await this.query(query, values);
      return announcement;
    }

    this.memoryAnnouncements.set(announcement.id, announcement);
    return announcement;
  }

  async getAnnouncementById(id) {
    if (this.pool) {
      const res = await this.query(
        "SELECT * FROM announcements WHERE id = $1;",
        [id],
      );
      if (res.rows.length === 0) {
        return null;
      }
      return this._mapAnnouncementRow(res.rows[0]);
    }

    return this.memoryAnnouncements.get(id) || null;
  }

  async getAllAnnouncements() {
    if (this.pool) {
      const res = await this.query("SELECT * FROM announcements;");
      return res.rows.map((row) => this._mapAnnouncementRow(row));
    }

    return Array.from(this.memoryAnnouncements.values());
  }

  async updateAnnouncement(id, updates) {
    if (this.pool) {
      const existing = await this.getAnnouncementById(id);
      if (!existing) {
        return null;
      }

      const fields = [];
      const values = [];
      let index = 1;

      if (updates.title !== undefined) {
        fields.push(`title = $${index++}`);
        values.push(updates.title);
      }
      if (updates.content !== undefined) {
        fields.push(`content = $${index++}`);
        values.push(updates.content);
      }
      if (updates.priority !== undefined) {
        fields.push(`priority = $${index++}`);
        values.push(updates.priority);
      }
      if (updates.isPinned !== undefined) {
        fields.push(`is_pinned = $${index++}`);
        values.push(Boolean(updates.isPinned));
      }

      const updatedAt = updates.updatedAt || new Date().toISOString();
      fields.push(`updated_at = $${index++}`);
      values.push(updatedAt);

      values.push(id);
      await this.query(
        `UPDATE announcements SET ${fields.join(", ")} WHERE id = $${index};`,
        values,
      );
      return this.getAnnouncementById(id);
    }

    const announcement = this.memoryAnnouncements.get(id);
    if (!announcement) {
      return null;
    }
    Object.assign(announcement, updates);
    return announcement;
  }

  async deleteAnnouncement(id) {
    if (this.pool) {
      const res = await this.query("DELETE FROM announcements WHERE id = $1;", [
        id,
      ]);
      return res.rowCount > 0;
    }

    return this.memoryAnnouncements.delete(id);
  }

  _mapAnnouncementRow(row) {
    return {
      id: row.id,
      type: row.type,
      team: row.team_id ? { id: row.team_id, name: row.team_name } : null,
      title: row.title,
      content: row.content,
      priority: row.priority,
      isPinned: Boolean(row.is_pinned),
      createdBy: {
        id: row.created_by_id,
        name: row.created_by_name,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ==========================================
  // COMMENT METHODS
  // ==========================================

  async createComment(comment) {
    if (this.pool) {
      const query = `
        INSERT INTO comments (
          id, announcement_id, meeting_id, parent_comment_id,
          content, created_by_id, created_by_name,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9
        ) RETURNING *;
      `;
      const values = [
        comment.id,
        comment.announcementId ?? null,
        comment.meetingId ?? null,
        comment.parentCommentId ?? null,
        comment.content,
        comment.createdBy.id,
        comment.createdBy.name,
        comment.createdAt || new Date().toISOString(),
        comment.updatedAt ?? null,
      ];
      await this.query(query, values);
      return comment;
    }

    this.memoryComments.set(comment.id, comment);
    return comment;
  }

  async getCommentById(id) {
    if (this.pool) {
      const res = await this.query("SELECT * FROM comments WHERE id = $1;", [
        id,
      ]);
      if (res.rows.length === 0) {
        return null;
      }
      return this._mapCommentRow(res.rows[0]);
    }

    return this.memoryComments.get(id) || null;
  }

  async getAllComments() {
    if (this.pool) {
      const res = await this.query("SELECT * FROM comments;");
      return res.rows.map((row) => this._mapCommentRow(row));
    }

    return Array.from(this.memoryComments.values());
  }

  async updateComment(id, updates) {
    if (this.pool) {
      const existing = await this.getCommentById(id);
      if (!existing) {
        return null;
      }

      const fields = [];
      const values = [];
      let index = 1;

      if (updates.content !== undefined) {
        fields.push(`content = $${index++}`);
        values.push(updates.content);
      }

      const updatedAt = updates.updatedAt || new Date().toISOString();
      fields.push(`updated_at = $${index++}`);
      values.push(updatedAt);

      values.push(id);
      await this.query(
        `UPDATE comments SET ${fields.join(", ")} WHERE id = $${index};`,
        values,
      );
      return this.getCommentById(id);
    }

    const comment = this.memoryComments.get(id);
    if (!comment) {
      return null;
    }
    Object.assign(comment, updates);
    return comment;
  }

  async deleteComment(id) {
    if (this.pool) {
      const res = await this.query("DELETE FROM comments WHERE id = $1;", [id]);
      return res.rowCount > 0;
    }

    return this.memoryComments.delete(id);
  }

  _mapCommentRow(row) {
    return {
      id: row.id,
      announcementId: row.announcement_id,
      meetingId: row.meeting_id,
      parentCommentId: row.parent_comment_id,
      content: row.content,
      createdBy: {
        id: row.created_by_id,
        name: row.created_by_name,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

const db = new Database();

export default db;
