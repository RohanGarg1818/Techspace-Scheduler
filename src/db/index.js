class Database {
  constructor() {
    this.users = new Map();
    this.teams = new Map();
    this.meetings = new Map();
    this.announcements = new Map();
    this.comments = new Map();
    this.userTeams = new Map(); // userId -> [{teamId, position}]
  }

  // User
  async createUser(user) {
    this.users.set(user.id, user);
    if (user.teams && user.teams.length > 0) {
      this.userTeams.set(user.id, user.teams);
    }
    return user;
  }

  async getUserById(id) {
    const user = this.users.get(id);
    if (!user || user.deletedAt) {
      return null;
    }
    return user;
  }

  async getUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email.toLowerCase() && !user.deletedAt) {
        return user;
      }
    }
    return null;
  }

  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user || user.deletedAt) {
      return null;
    }
    Object.assign(user, updates);
    return user;
  }

  async deleteUser(id) {
    const user = this.users.get(id);
    if (!user || user.deletedAt) {
      return null;
    }
    user.deletedAt = new Date().toISOString();
    return user;
  }

  async getAllUsers() {
    return Array.from(this.users.values()).filter((u) => !u.deletedAt);
  }

  // Team
  async createTeam(team) {
    this.teams.set(team.id, team);
    return team;
  }

  async getTeamById(id) {
    return this.teams.get(id) || null;
  }

  async getAllTeams() {
    return Array.from(this.teams.values());
  }

  async updateTeam(id, updates) {
    const team = this.teams.get(id);
    if (!team) {
      return null;
    }
    Object.assign(team, updates);
    return team;
  }

  async deleteTeam(id) {
    return this.teams.delete(id);
  }

  // Meeting
  async createMeeting(meeting) {
    this.meetings.set(meeting.id, meeting);
    return meeting;
  }

  async getMeetingById(id) {
    return this.meetings.get(id) || null;
  }

  async getAllMeetings() {
    return Array.from(this.meetings.values());
  }

  async updateMeeting(id, updates) {
    const meeting = this.meetings.get(id);
    if (!meeting) {
      return null;
    }
    Object.assign(meeting, updates);
    return meeting;
  }

  async deleteMeeting(id) {
    return this.meetings.delete(id);
  }

  // Announcement
  async createAnnouncement(announcement) {
    this.announcements.set(announcement.id, announcement);
    return announcement;
  }

  async getAnnouncementById(id) {
    return this.announcements.get(id) || null;
  }

  async getAllAnnouncements() {
    return Array.from(this.announcements.values());
  }

  async updateAnnouncement(id, updates) {
    const announcement = this.announcements.get(id);
    if (!announcement) {
      return null;
    }
    Object.assign(announcement, updates);
    return announcement;
  }

  async deleteAnnouncement(id) {
    return this.announcements.delete(id);
  }

  // Comment
  async createComment(comment) {
    this.comments.set(comment.id, comment);
    return comment;
  }

  async getCommentById(id) {
    return this.comments.get(id) || null;
  }

  async getAllComments() {
    return Array.from(this.comments.values());
  }

  async updateComment(id, updates) {
    const comment = this.comments.get(id);
    if (!comment) {
      return null;
    }
    Object.assign(comment, updates);
    return comment;
  }

  async deleteComment(id) {
    return this.comments.delete(id);
  }
}

const db = new Database();

export default db;
