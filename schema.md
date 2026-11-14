# Techspace Meeting Calendar
this shi is ai generated but i designed the specs and schemas so they are good to go
## 0. Basics

- Base URL: `/api/v1`
- All requests/responses are JSON.
- Login first, then send the token on every other request:
  `Authorization: Bearer <token>`
- Dates are `"2026-11-20"` (YYYY-MM-DD). Times are `"15:00"` (24h, HH:mm).
- IDs are strings (UUIDs), like `"a1b2c3"` in the booms below (shortened for readability).

### Roles (user.role)

| role | who |
|---|---|
| `ob` | Office Bearers (admins) |
| `faculty` | Faculty coordinators (view only) |
| `executive` | Executives (view only) |
| `team_lead` | Lead / co-lead of a core team or sub-club |
| `member` | Everyone else (view only) |

### Who can do what

| Action | ob | faculty | executive | team_lead | member |
|---|---|---|---|---|---|
| View calendar, teams, dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create meeting | ✅ | ❌ | ❌ | ✅ (only for their own team) | ❌ |
| Edit / cancel meeting | ✅ any | ❌ | ❌ | ✅ only ones they created | ❌ |
| Delete meeting for good | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create / edit / delete users, manage teams | ✅ | ❌ | ❌ | ❌ | ❌ |
| Change own password | ✅ | ✅ | ✅ | ✅ | ✅ |

### Errors (same shape everywhere)

```json
{ "error": { "code": "FORBIDDEN", "message": "Only OBs can do this" } }
```

| HTTP | code | when |
|---|---|---|
| 400 | `VALIDATION_ERROR` | bad/missing field |
| 401 | `UNAUTHENTICATED` | no token / wrong login |
| 403 | `FORBIDDEN` | role not allowed |
| 404 | `NOT_FOUND` | id doesn't exist |
| 409 | `MEETING_CLASH` | meeting overlaps another (see Meetings) |
| 409 | `CONFLICT` | duplicate email, etc. |

---

## 1. Data shapes

### User

| field | type | notes |
|---|---|---|
| id | string | |
| name | string | |
| email | string | unique |
| role | string | one of the roles above |
| obTitle | string or null | e.g. "President". Only for OBs |
| teams | array | list of `{ teamId, teamName, position }`, position is `"lead"`, `"colead"` or `"member"` |

```json
{
  "id": "u1",
  "name": "Priyanshu Yadav",
  "email": "priyanshu@boom.com",
  "role": "team_lead",
  "obTitle": null,
  "teams": [
    { "teamId": "t1", "teamName": "Tech Team", "position": "lead" }
  ]
}
```

### Team (core teams and sub-clubs)

| field | type | notes |
|---|---|---|
| id | string | |
| name | string | |
| type | string | `"core"` or `"subclub"` |
| description | string or null | |
| leads | array | leads and co-leads, each `{ id, name }` |
| memberCount | number | |

```json
{
  "id": "t1",
  "name": "Tech Team",
  "type": "core",
  "description": "Builds and maintains society tech",
  "leads": [{ "id": "u1", "name": "Priyanshu Yadav" }],
  "memberCount": 12
}
```

### Meeting

| field | type | notes |
|---|---|---|
| id | string | |
| type | string | `"ob"`, `"core"` or `"subclub"`. **Set by server**, don't send it |
| color | string | **Set by server**. ob = `#1E3A8A` (dark blue), core = `#0D9488` (teal), subclub = `#7C3AED` (purple) |
| team | object or null | `{ id, name }`. `null` for OB meetings |
| topic | string | e.g. "Website Planning" |
| date | string | `2026-11-20` |
| startTime | string | `15:00` |
| endTime | string | `16:00` (must be after startTime) |
| note | string or null | optional short note |
| location | string or null | optional, room name |
| link | string or null | optional, meet/zoom link |
| createdBy | object | `{ id, name }`. **Set by server** from the token |
| status | string | `"scheduled"` or `"cancelled"` |

```json
{
  "id": "m1",
  "type": "core",
  "color": "#0D9488",
  "team": { "id": "t1", "name": "Tech Team" },
  "topic": "Website Planning",
  "date": "2026-11-20",
  "startTime": "15:00",
  "endTime": "16:00",
  "note": "Bring laptops",
  "location": "Room 204",
  "link": null,
  "createdBy": { "id": "u1", "name": "Priyanshu Yadav" },
  "status": "scheduled"
}
```

---

## 2. Auth

### POST `/auth/login` (public)

Input:
```json
{ "email": "priyanshu@boom.com", "password": "boom123" }
```

Output `200`:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "u1",
    "name": "Priyanshu Yadav",
    "email": "priyanshu@boom.com",
    "role": "team_lead",
    "obTitle": null,
    "teams": [{ "teamId": "t1", "teamName": "Tech Team", "position": "lead" }]
  }
}
```
Errors: `400` missing fields, `401` wrong email/password.

### GET `/auth/me`

No input (token only).

Output `200`: the logged-in **User** object (same as `user` above).

---

## 3. Users

Only OBs create, edit and delete users (there is no public signup). Everyone can view users.

### Rules for user fields (used by create and update)

| field | rules |
|---|---|
| name | required on create, 1 to 100 chars, trimmed |
| email | required on create, valid email, saved in lowercase, must be unique |
| password | required on create, min 8 chars. Server stores a hash only, never returns it |
| role | required on create, one of `ob`, `faculty`, `executive`, `team_lead`, `member` |
| obTitle | only for `role = "ob"` (e.g. "President", "boomary"). Must be `null`/omitted for other roles |
| teams | optional array of `{ "teamId": "t1", "position": "lead" }`. `position` is `lead`, `colead` or `member` |

Cross-field rules (return `400 VALIDATION_ERROR` if broken):
1. `role = "team_lead"` needs at least one team with position `lead` or `colead`.
2. A team with position `lead` or `colead` is only allowed if `role = "team_lead"`.
3. `obTitle` is only allowed when `role = "ob"`.
4. Every `teamId` must exist (else `404 NOT_FOUND`).

### GET `/users`

Query params (all optional): `role=team_lead`, `teamId=t1`, `q=riya` (search by name or email), `page=1` (default 1), `limit=20` (default 20, max 100)

boom: `GET /users?role=team_lead&page=1&limit=20`

Output `200`:
```json
{
  "data": [
    {
      "id": "u1",
      "name": "Priyanshu Yadav",
      "email": "priyanshu@boom.com",
      "role": "team_lead",
      "obTitle": null,
      "teams": [{ "teamId": "t1", "teamName": "Tech Team", "position": "lead" }]
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1 }
}
```
Deleted users never show up here.

### GET `/users/:id`

boom: `GET /users/u1`

Output `200`: one **User**.
Errors: `404` if not found (or deleted).

### POST `/users` (ob only): create

Input (a team lead):
```json
{
  "name": "Priyanshu Yadav",
  "email": "Priyanshu@boom.com",
  "password": "boom123",
  "role": "team_lead",
  "teams": [
    { "teamId": "t1", "position": "lead" }
  ]
}
```

Input (an OB):
```json
{
  "name": "Aman Verma",
  "email": "aman@boom.com",
  "password": "boom123",
  "role": "ob",
  "obTitle": "President"
}
```

Input (a plain member, minimum fields):
```json
{
  "name": "Riya Sharma",
  "email": "riya@boom.com",
  "password": "boom123",
  "role": "member"
}
```

Output `201` (password is never in the response, email is lowercased):
```json
{
  "id": "u1",
  "name": "Priyanshu Yadav",
  "email": "priyanshu@boom.com",
  "role": "team_lead",
  "obTitle": null,
  "teams": [{ "teamId": "t1", "teamName": "Tech Team", "position": "lead" }]
}
```

Errors:
- `400 VALIDATION_ERROR`: missing field, bad email, short password, bad role, or a cross-field rule broken
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "password", "issue": "Must be at least 8 characters" },
      { "field": "teams", "issue": "role team_lead needs at least one lead/colead team" }
    ]
  }
}
```
- `403 FORBIDDEN`: caller is not an OB
- `404 NOT_FOUND`: a `teamId` doesn't exist
- `409 CONFLICT`: email already used
```json
{ "error": { "code": "CONFLICT", "message": "Email already in use" } }
```

### PATCH `/users/:id` (ob only): update

Send **only the fields you want to change**. At least one field is required. Allowed fields: `name`, `email`, `password`, `role`, `obTitle`, `teams`.

boom 1: change role to executive
```json
{ "role": "executive" }
```

boom 2: reset someone's password (OB sets a new one)
```json
{ "password": "newboom456" }
```

boom 3: make someone a co-lead of Design Club
```json
{
  "role": "team_lead",
  "teams": [{ "teamId": "t5", "position": "colead" }]
}
```

Important: `teams`, if sent, **replaces the whole list** of that user's teams (it does not add). To keep existing teams, include them again in the array. To remove the user from all teams, send `"teams": []`.

Output `200`: the updated **User**.
```json
{
  "id": "u1",
  "name": "Priyanshu Yadav",
  "email": "priyanshu@boom.com",
  "role": "executive",
  "obTitle": null,
  "teams": []
}
```

Rules and side effects:
- Same cross-field rules as create are checked on the **final result** (existing values + your changes). boom: changing `role` from `team_lead` to `member` while they are still lead of a team fails with `400`, unless you also send `"teams": []` (or a list without lead/colead).
- Changing `role` away from `ob` clears `obTitle` automatically.
- Changing `email` to one already used returns `409 CONFLICT`.
- Meetings the user already created stay as they are. If they stop being a team lead, they can no longer edit those meetings (only the OB can).
- An OB cannot change **their own** role (so the society never ends up with zero OBs by accident). Returns `403`. Also you cannot demote the last remaining OB: `409 CONFLICT`.

Errors: `400`, `403`, `404` (user or teamId), `409`.

### POST `/auth/change-password` (any logged-in user, for themselves)

Input:
```json
{ "currentPassword": "boom123", "newPassword": "newboom456" }
```
Output `204` (empty).
Errors: `400` (new password under 8 chars), `401` (current password wrong).

### DELETE `/users/:id` (ob only): delete

No input. Output `204` (empty).

How delete works: it is a **soft delete**. Set a `deletedAt` timestamp on the user instead of removing the row.
- The user can no longer log in, and is hidden from `/users`, team member lists and the dashboard.
- Their old meetings stay on the calendar and still show `createdBy` with their name. (A hard delete would break those meetings.)
- They are removed from all teams.

Errors:
- `403 FORBIDDEN`: caller is not an OB
- `404 NOT_FOUND`: user doesn't exist or is already deleted
- `409 CONFLICT`: you cannot delete yourself, and you cannot delete the last remaining OB
```json
{ "error": { "code": "CONFLICT", "message": "You cannot delete the last OB" } }
```

---

## 4. Teams / Sub-clubs

### GET `/teams`

Query param (optional): `type=core` or `type=subclub`

boom: `GET /teams?type=core`

Output `200`:
```json
{
  "data": [
    {
      "id": "t1",
      "name": "Tech Team",
      "type": "core",
      "description": "Builds and maintains society tech",
      "leads": [{ "id": "u1", "name": "Priyanshu Yadav" }],
      "memberCount": 12
    }
  ]
}
```

### GET `/teams/:id`

Same as a Team, plus the member list.

Output `200`:
```json
{
  "id": "t1",
  "name": "Tech Team",
  "type": "core",
  "description": "Builds and maintains society tech",
  "leads": [{ "id": "u1", "name": "Priyanshu Yadav" }],
  "memberCount": 2,
  "members": [
    { "id": "u1", "name": "Priyanshu Yadav", "position": "lead" },
    { "id": "u2", "name": "Riya Sharma", "position": "member" }
  ]
}
```

### POST `/teams` (ob only)

Input:
```json
{ "name": "Design Club", "type": "subclub", "description": "UI/UX and graphics" }
```
Required: `name`, `type`.

Output `201`: the new **Team**.

### PATCH `/teams/:id` (ob only)

Input (only what changes):
```json
{ "description": "UI/UX, graphics and branding" }
```
Output `200`: updated **Team**.

### DELETE `/teams/:id` (ob only)

Output `204`. Returns `409 CONFLICT` if the team still has upcoming scheduled meetings.

### PUT `/teams/:id/members/:userId` (ob only)

Add a person to a team, or change their position.

Input:
```json
{ "position": "lead" }
```
`position` is `"lead"`, `"colead"` or `"member"`.

Output `200`: the updated team (with `members`).

### DELETE `/teams/:id/members/:userId` (ob only)

Output `204`.

---

## 5. Dashboard

### GET `/dashboard`

No input. Gives everything the dashboard page needs in one call.

Output `200`:
```json
{
  "counts": {
    "members": 120,
    "officeBearers": 6,
    "executives": 10,
    "teamLeads": 14
  },
  "officeBearers": [
    { "id": "u9", "name": "Aman Verma", "obTitle": "President" }
  ],
  "executives": [
    { "id": "u5", "name": "Neha Singh" }
  ],
  "coreTeams": [
    {
      "id": "t1",
      "name": "Tech Team",
      "type": "core",
      "leads": [{ "id": "u1", "name": "Priyanshu Yadav" }],
      "memberCount": 12
    }
  ],
  "subClubs": [
    {
      "id": "t5",
      "name": "Design Club",
      "type": "subclub",
      "leads": [{ "id": "u7", "name": "Kabir Mehta" }],
      "memberCount": 8
    }
  ]
}
```

---

## 6. Meetings 

### GET `/meetings`

Get meetings in a date range. Use a month range for month view, a 7-day range for week view, a single day for day view.

Query params:
- `from` (required): `2026-11-01`
- `to` (required): `2026-11-30` (max 62 days apart)
- `type` (optional): `ob`, `core` or `subclub`
- `teamId` (optional): only that team's meetings

boom: `GET /meetings?from=2026-11-01&to=2026-11-30`

Output `200`:
```json
{
  "data": [
    {
      "id": "m1",
      "type": "core",
      "color": "#0D9488",
      "team": { "id": "t1", "name": "Tech Team" },
      "topic": "Website Planning",
      "date": "2026-11-20",
      "startTime": "15:00",
      "endTime": "16:00",
      "note": null,
      "location": "Room 204",
      "link": null,
      "createdBy": { "id": "u1", "name": "Priyanshu Yadav" },
      "status": "scheduled"
    }
  ]
}
```
Cancelled meetings are hidden unless you add `status=cancelled`.

### GET `/meetings/:id`

boom: `GET /meetings/m1`

Output `200`: one **Meeting**. `404` if not found.

### POST `/meetings/check-clash`

Use this while the user is filling the form, to show a live "this clashes" warning. It does not save anything.

Input:
```json
{
  "date": "2026-11-20",
  "startTime": "15:00",
  "endTime": "16:00",
  "excludeMeetingId": null
}
```
(`excludeMeetingId` is only for editing: pass the meeting's own id so it doesn't clash with itself.)

Output `200` (no clash):
```json
{ "hasClash": false, "clashes": [] }
```

Output `200` (clash):
```json
{
  "hasClash": true,
  "clashes": [
    {
      "id": "m7",
      "type": "ob",
      "color": "#1E3A8A",
      "team": null,
      "topic": "Monthly OB Sync",
      "date": "2026-11-20",
      "startTime": "15:30",
      "endTime": "16:30",
      "note": null,
      "location": null,
      "link": null,
      "createdBy": { "id": "u9", "name": "Aman Verma" },
      "status": "scheduled"
    }
  ]
}
```

### POST `/meetings` (ob or team_lead)

Create a meeting.

Input (team lead):
```json
{
  "teamId": "t1",
  "topic": "Website Planning",
  "date": "2026-11-20",
  "startTime": "15:00",
  "endTime": "16:00",
  "note": "Bring laptops",
  "location": "Room 204",
  "link": null
}
```

Required: `topic`, `date`, `startTime`, `endTime`.
- `teamId`: required for team leads (must be a team they lead). OBs leave it out (or `null`) to make an OB meeting.
- `note`, `location`, `link`: optional.

Output `201`: the new **Meeting** (with `type`, `color`, `createdBy` filled in by the server).

**Clash handling:** if the time overlaps any existing scheduled meeting on that date, the server does NOT save it and returns:

Output `409`:
```json
{
  "error": { "code": "MEETING_CLASH", "message": "This overlaps with 1 meeting" },
  "clashes": [
    {
      "id": "m7",
      "type": "ob",
      "color": "#1E3A8A",
      "team": null,
      "topic": "Monthly OB Sync",
      "date": "2026-11-20",
      "startTime": "15:30",
      "endTime": "16:30",
      "note": null,
      "location": null,
      "link": null,
      "createdBy": { "id": "u9", "name": "Aman Verma" },
      "status": "scheduled"
    }
  ]
}
```
The frontend shows the warning. If the user says "create anyway", send the **same body** again to `POST /meetings?acknowledgeClash=true` and it saves.

Overlap rule (for the code): same date AND `newStart < existingEnd` AND `newEnd > existingStart` AND existing status is `scheduled`.

Other errors:
- `400` if `endTime` is not after `startTime`, or a field is missing/invalid.
- `403` if a team lead uses a team they don't lead, or the user's role can't create meetings.

### PATCH `/meetings/:id` (creator or ob)

Edit a meeting. Send only the fields that change. Same clash check and `?acknowledgeClash=true` flow as create.

Input:
```json
{ "startTime": "16:00", "endTime": "17:00" }
```

Output `200`: updated **Meeting**.
Errors: `403` (not creator/ob), `404`, `409 MEETING_CLASH`, `409 CONFLICT` (meeting already cancelled).

### POST `/meetings/:id/cancel` (creator or ob)

No input.

Output `200`: the **Meeting** with `"status": "cancelled"`. It stays in the database (soft cancel) so it can show as cancelled on the calendar.

### DELETE `/meetings/:id` (ob only)

Permanently deletes. No input. Output `204`.

---


## 7. Announcements

Official announcement board for society-wide notices and team-specific updates.

### Who can do what

| Action | ob | faculty | executive | team_lead | member |
|---|---|---|---|---|---|
| View announcements | ✅ | ✅ | ✅ | ✅ | ✅ |
| Post society-wide announcement | ✅ | ❌ | ❌ | ❌ | ❌ |
| Post team announcement | ✅ (any team) | ❌ | ❌ | ✅ (only for their own team) | ❌ |
| Edit announcement | ✅ any | ❌ | ❌ | ✅ only ones they created | ❌ |
| Pin / Unpin announcement | ✅ any | ❌ | ❌ | ✅ only ones they created | ❌ |
| Delete announcement | ✅ any | ❌ | ❌ | ✅ only ones they created | ❌ |

---

### Data shape: Announcement

| field | type | notes |
|---|---|---|
| id | string | UUID |
| type | string | `"society"` or `"team"`. **Set by server** depending on `teamId` |
| team | object or null | `{ id, name }`. `null` for society-level announcements |
| title | string | 1 to 150 characters, trimmed |
| content | string | Full text / markdown body |
| priority | string | `"normal"` or `"urgent"` (default `"normal"`) |
| isPinned | boolean | If `true`, stays pinned to the top of the board (default `false`) |
| createdBy | object | `{ id, name }`. **Set by server** from the token |
| createdAt | string | ISO 8601 timestamp |
| updatedAt | string or null | ISO 8601 timestamp, `null` until edited |

```json
{
  "id": "a1",
  "type": "society",
  "team": null,
  "title": "Annual Techfest Schedule & Meeting Guidelines",
  "content": "All core teams and sub-clubs are requested to submit their upcoming meeting schedules by this Friday to avoid auditorium booking clashes.",
  "priority": "urgent",
  "isPinned": true,
  "createdBy": { "id": "u9", "name": "Aman Verma" },
  "createdAt": "2026-11-20T10:00:00Z",
  "updatedAt": null
}
```

---

### Endpoints

### GET `/announcements`

Fetch announcements visible to the user. Society-wide announcements are visible to everyone; team announcements can be viewed by all or filtered per team.

Query params (all optional):
- `type`: `"society"` or `"team"`
- `teamId`: filter by specific team (e.g. `teamId=t1`)
- `isPinned`: `true` or `false`
- `priority`: `"normal"` or `"urgent"`
- `page`: default `1`
- `limit`: default `20` (max `100`)

boom: `GET /announcements?type=society&isPinned=true&page=1&limit=20`

Output `200`:
```json
{
  "data": [
    {
      "id": "a1",
      "type": "society",
      "team": null,
      "title": "Annual Techfest Schedule & Meeting Guidelines",
      "content": "All core teams and sub-clubs are requested to submit their upcoming meeting schedules...",
      "priority": "urgent",
      "isPinned": true,
      "createdBy": { "id": "u9", "name": "Aman Verma" },
      "createdAt": "2026-11-20T10:00:00Z",
      "updatedAt": null
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1 }
}
```

*Sorting order:* Pinned posts (`isPinned: true`) always appear first, sorted by `createdAt DESC`, followed by unpinned announcements sorted by `createdAt DESC`.

### GET `/announcements/:id`

boom: `GET /announcements/a1`

Output `200`: one **Announcement**.  
Errors: `404 NOT_FOUND` if the id does not exist.

### POST `/announcements` (ob or team_lead)

Create a new announcement.

Input (Society-wide announcement by an OB):
```json
{
  "title": "Orientation Dates Announced",
  "content": "Techspace society orientation will take place on November 25th in the Auditorium.",
  "priority": "urgent",
  "isPinned": true
}
```

Input (Team announcement by a Team Lead or OB):
```json
{
  "teamId": "t1",
  "title": "Git Workshop Practice Files",
  "content": "Please clone the starter repository before coming to Wednesday's meeting.",
  "priority": "normal",
  "isPinned": false
}
```

Rules:
1. `title` (required, 1 to 150 characters) and `content` (required, non-empty string).
2. If `teamId` is omitted or `null`: only `ob` role can create it (`type` becomes `"society"`). If a non-OB tries, returns `403 FORBIDDEN`.
3. If `teamId` is provided: `team_lead` can only create announcements for a team they lead (position `lead` or `colead`). `ob` can create announcements for any team.
4. `priority`: optional, must be `"normal"` or `"urgent"`. Defaults to `"normal"`.
5. `isPinned`: optional boolean. Defaults to `false`.

Output `201`: the created **Announcement**.

Errors:
- `400 VALIDATION_ERROR`: title/content missing or invalid priority value.
- `403 FORBIDDEN`: user is not an OB (when `teamId` is null), or team lead does not lead the specified team.
- `404 NOT_FOUND`: specified `teamId` does not exist.

### PATCH `/announcements/:id` (creator or ob)

Update an announcement. Send only the fields you want to change (`title`, `content`, `priority`, `isPinned`).

boom: pin an announcement and mark it urgent:
```json
{
  "priority": "urgent",
  "isPinned": true
}
```

Output `200`: updated **Announcement** (with updated `updatedAt` timestamp).

Errors:
- `400 VALIDATION_ERROR`: invalid field values.
- `403 FORBIDDEN`: caller is neither an OB nor the creator of this announcement.
- `404 NOT_FOUND`: announcement doesn't exist.

### DELETE `/announcements/:id` (creator or ob)

Deletes an announcement.

No input. Output `204` (empty).

Errors:
- `403 FORBIDDEN`: caller is neither an OB nor the creator of this announcement.
- `404 NOT_FOUND`: announcement doesn't exist.

---

## 8. Comments

Discussion and replies on announcements and meetings.

### Who can do what

| Action | ob | faculty | executive | team_lead | member |
|---|---|---|---|---|---|
| View comments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Post comment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own comment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete own comment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete any comment (moderation) | ✅ | ❌ | ❌ | ❌ | ❌ |

---

### Data shape: Comment

| field | type | notes |
|---|---|---|
| id | string | UUID |
| announcementId | string or null | UUID of the announcement (if commenting on an announcement) |
| meetingId | string or null | UUID of the meeting (if commenting on a meeting) |
| content | string | 1 to 1000 characters, trimmed |
| parentCommentId | string or null | UUID of parent comment if replying (must be a top-level comment), `null` for top-level comments |
| createdBy | object | `{ id, name }`. **Set by server** from the token |
| createdAt | string | ISO 8601 timestamp |
| updatedAt | string or null | ISO 8601 timestamp, `null` until edited |

```json
{
  "id": "c1",
  "announcementId": "a1",
  "meetingId": null,
  "content": "Will the practice files be shared before Wednesday?",
  "parentCommentId": null,
  "createdBy": { "id": "u2", "name": "Riya Sharma" },
  "createdAt": "2026-11-20T11:00:00Z",
  "updatedAt": null
}
```

---

### Endpoints

### GET `/announcements/:id/comments`

Fetch all comments for an announcement.

Query params (all optional):
- `parentCommentId`: filter replies to a specific comment, or pass `"null"` for top-level comments only
- `page`: default `1`
- `limit`: default `20` (max `100`)

boom: `GET /announcements/a1/comments?page=1&limit=20`

Output `200`:
```json
{
  "data": [
    {
      "id": "c1",
      "announcementId": "a1",
      "meetingId": null,
      "content": "Will the practice files be shared before Wednesday?",
      "parentCommentId": null,
      "createdBy": { "id": "u2", "name": "Rohit Singh" },
      "createdAt": "2026-11-20T11:00:00Z",
      "updatedAt": null
    },
    {
      "id": "c2",
      "announcementId": "a1",
      "meetingId": null,
      "content": "Yes, we will push them to GitHub by Tuesday evening.",
      "parentCommentId": "c1",
      "createdBy": { "id": "u1", "name": "Priyanshu Yadav" },
      "createdAt": "2026-11-20T11:30:00Z",
      "updatedAt": null
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 2 }
}
```

*Sorting order:* Comments are sorted chronologically by `createdAt ASC` so discussions read naturally from top to bottom.

### GET `/comments/:id`

boom: `GET /comments/c1`

Output `200`: one **Comment**.  
Errors: `404 NOT_FOUND` if the comment id does not exist.

### POST `/announcements/:id/comments` (any logged-in user)

Post a comment on an announcement.

Input (top-level comment):
```json
{
  "content": "Will the practice files be shared before Wednesday?"
}
```

Input (reply to an existing comment):
```json
{
  "content": "Yes, we will push them to GitHub by Tuesday evening.",
  "parentCommentId": "c1"
}
```

Rules:
1. `content`: required, string, 1 to 1000 characters, trimmed.
2. `parentCommentId`: optional string or `null`. If provided, it must be the id of an existing **top-level** comment (`parentCommentId === null`) on the same announcement. Replying to a reply is not allowed (strict 1-level reply nesting).
3. The parent announcement must exist.
4. Any authenticated user can comment.

Output `201`: the created **Comment**.

Errors:
- `400 VALIDATION_ERROR`: content missing, empty, exceeds 1000 characters, or attempting to reply to a reply (depth limit exceeded).
- `401 UNAUTHENTICATED`: missing or invalid token.
- `404 NOT_FOUND`: announcement or `parentCommentId` does not exist.

### GET `/meetings/:id/comments`

Fetch all comments for a meeting. Supports the same query parameters (`page`, `limit`, `parentCommentId`) and response structure as announcement comments.

boom: `GET /meetings/m1/comments?page=1&limit=20`

### POST `/meetings/:id/comments` (any logged-in user)

Post a comment on a meeting. Same body structure as announcement comments (`content`, optional `parentCommentId`). Sets `meetingId` to the target meeting id and `announcementId` to `null`.

Output `201`: the created **Comment**.

### PATCH `/comments/:id` (creator only)

Update a comment's content. Only the author can edit their own comment.

Input:
```json
{
  "content": "Will the practice files be shared before Tuesday evening?"
}
```

Output `200`: updated **Comment** (with updated `updatedAt` timestamp).

Errors:
- `400 VALIDATION_ERROR`: content missing or invalid length.
- `403 FORBIDDEN`: caller is not the author of this comment.
- `404 NOT_FOUND`: comment doesn't exist.

### DELETE `/comments/:id` (creator or ob)

Delete a comment. Authors can delete their own comments; OBs can delete any comment for moderation.

No input. Output `204` (empty).

*Cascade rule:* Permanently hard deletes the comment. Deleting a top-level comment permanently cascade-deletes all its child replies.

Errors:
- `403 FORBIDDEN`: caller is neither an OB nor the creator of this comment.
- `404 NOT_FOUND`: comment doesn't exist.

---

