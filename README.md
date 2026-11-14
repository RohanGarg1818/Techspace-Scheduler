# Techspace Scheduler — API Reference

A meeting calendar and coordination backend for a tech society.

---

## Contents

1. [Running the server](#running-the-server)
2. [Basics](#basics)
3. [Roles and permissions](#roles-and-permissions)
4. [Response envelope](#response-envelope)
5. [Error format](#error-format)
6. [Data shapes](#data-shapes)
7. [Auth routes](#auth-routes)
8. [User routes](#user-routes)
9. [Team routes](#team-routes)
10. [Dashboard route](#dashboard-route)
11. [Meeting routes](#meeting-routes)
12. [Announcement routes](#announcement-routes)
13. [Comment routes](#comment-routes)
14. [Seed credentials](#seed-credentials)

---

## Running the server

```bash
# development (nodemon)
npm run dev

# production
npm start
```

Default port is `8000`. Set `PORT` in `.env` to override.

---

## Basics

| Item | Value |
|---|---|
| Base URL | `/api/v1` |
| Content type | `application/json` |
| Auth header | `Authorization: Bearer <token>` |
| Date format | `YYYY-MM-DD` (e.g. `2026-11-20`) |
| Time format | `HH:mm` 24-hour (e.g. `15:30`) |
| IDs | UUID strings |

Every route except `POST /auth/login` requires a valid JWT token in the `Authorization` header. Any protected route returns `401 UNAUTHENTICATED` when the token is missing, invalid, expired, or was issued before a password change. Tokens expire after **7 days**.

---

## Roles and permissions

| Role | Description |
|---|---|
| `ob` | Office Bearer — full admin |
| `faculty` | Faculty coordinator — view only |
| `executive` | Executive — view only |
| `team_lead` | Lead or co-lead of one or more teams |
| `member` | General member — view only |

**Global permission matrix**

| Action | ob | faculty | executive | team_lead | member |
|---|---|---|---|---|---|
| View everything | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create / edit / delete users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage teams | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create meeting | ✅ | ❌ | ❌ | ✅ own team only | ❌ |
| Edit / cancel meeting | ✅ any | ❌ | ❌ | ✅ own creations | ❌ |
| Delete meeting permanently | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create announcement | ✅ | ❌ | ❌ | ✅ own team only | ❌ |
| Edit / delete announcement | ✅ any | ❌ | ❌ | ✅ own creations | ❌ |
| Post / edit / delete own comment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete any comment (moderation) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Change own password | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Response envelope

Every response with a body is wrapped in this shape:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": { }
}
```

What goes in `data`:

- **Single resource** — the object itself.
- **Paginated list** — `{ "items": [...], "pagination": { ... } }`.
- **Unpaginated list** (teams, meetings) — `{ "items": [...] }`.
- **204 No Content** — no body at all.

**Pagination object**

```json
{
  "page": 1,
  "limit": 20,
  "total": 45,
  "totalPages": 3,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

---

## Error format

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid input",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "password", "issue": "Must be at least 8 characters" }
    ]
  },
  "data": null
}
```

`error.details` is `null` for every error code except `VALIDATION_ERROR`, where it is an array of `{ field, issue }` objects.

**Error codes**

| HTTP | code | when |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid field |
| 401 | `UNAUTHENTICATED` | No token, bad token, or wrong password |
| 403 | `FORBIDDEN` | Role not allowed |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Duplicate email, delete self, last OB, etc. |
| 409 | `MEETING_CLASH` | Meeting time overlaps an existing scheduled meeting |

For `MEETING_CLASH`, `data` is not null — it contains `{ "clashes": [ <Meeting>, ... ] }`.

---

## Data shapes

### User

```json
{
  "id": "uuid",
  "name": "Priyanshu Yadav",
  "email": "priyanshu@techspace.com",
  "role": "team_lead",
  "obTitle": null,
  "teams": [
    { "teamId": "uuid", "teamName": "Tech Team", "position": "lead" }
  ]
}
```

`obTitle` is a string for `ob` role (e.g. `"President"`), `null` for everyone else.  
`teams` is an empty array when the user belongs to no teams.  
`password` is never returned.

### Team

```json
{
  "id": "uuid",
  "name": "Tech Team",
  "type": "core",
  "description": "Builds and maintains society tech",
  "leads": [{ "id": "uuid", "name": "Priyanshu Yadav" }],
  "memberCount": 12
}
```

The detail view (`GET /teams/:id`) adds a `members` array:

```json
"members": [
  { "id": "uuid", "name": "Priyanshu Yadav", "position": "lead" },
  { "id": "uuid", "name": "Riya Sharma", "position": "member" }
]
```

### Meeting

```json
{
  "id": "uuid",
  "type": "core",
  "color": "#0D9488",
  "team": { "id": "uuid", "name": "Tech Team" },
  "topic": "Website Planning",
  "date": "2026-11-20",
  "startTime": "15:00",
  "endTime": "16:00",
  "note": "Bring laptops",
  "location": "Room 204",
  "link": null,
  "createdBy": { "id": "uuid", "name": "Priyanshu Yadav" },
  "status": "scheduled"
}
```

| Field | Notes |
|---|---|
| `type` | Set by server: `"ob"` / `"core"` / `"subclub"` |
| `color` | Set by server: ob = `#1E3A8A`, core = `#0D9488`, subclub = `#7C3AED` |
| `team` | `null` for OB meetings |
| `status` | `"scheduled"` or `"cancelled"` |

### Announcement

```json
{
  "id": "uuid",
  "type": "society",
  "team": null,
  "title": "Annual Techfest",
  "content": "Full announcement body here.",
  "priority": "urgent",
  "isPinned": true,
  "createdBy": { "id": "uuid", "name": "Aman Verma" },
  "createdAt": "2026-11-20T10:00:00.000Z",
  "updatedAt": null
}
```

`type` is set by the server: `"society"` when no `teamId`, `"team"` otherwise.  
`updatedAt` is `null` until the first edit.

### Comment

```json
{
  "id": "uuid",
  "announcementId": "uuid",
  "meetingId": null,
  "content": "Will the files be shared?",
  "parentCommentId": null,
  "createdBy": { "id": "uuid", "name": "Riya Sharma" },
  "createdAt": "2026-11-20T11:00:00.000Z",
  "updatedAt": null
}
```

Exactly one of `announcementId` / `meetingId` is set; the other is `null`.  
`parentCommentId` is `null` for top-level comments and a UUID for replies.  
Threads are **one level deep only** — you cannot reply to a reply.

---

## Auth routes

### `POST /api/v1/auth/login`

Public. No token required.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | ✅ | Case-insensitive |
| `password` | string | ✅ | |

**200 OK**

```json
{
  "token": "eyJhbGci...",
  "user": { <User> }
}
```

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing email or password, or invalid email format |
| 401 | `UNAUTHENTICATED` | Email not found or wrong password |

---

### `GET /api/v1/auth/me`

Returns the currently authenticated user.

**Auth** — any role.

**200 OK** — `data` is a `User` object. `password` is never included.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No / invalid / expired token |

---

### `POST /api/v1/auth/change-password`

**Auth** — any role.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `currentPassword` | string | ✅ | Must match the stored password |
| `newPassword` | string | ✅ | Min 8 characters, max 100 |

**204 No Content** on success.

After a successful password change, all previously issued tokens for this user become invalid immediately. The user must log in again.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `newPassword` under 8 characters, or either field missing |
| 401 | `UNAUTHENTICATED` | `currentPassword` is wrong |

---

## User routes

### `GET /api/v1/users`

**Auth** — any role.

**Query parameters**

| Param | Type | Required | Notes |
|---|---|---|---|
| `role` | string | ❌ | Filter by role: `ob`, `faculty`, `executive`, `team_lead`, `member` |
| `teamId` | string | ❌ | Filter users who belong to this team |
| `q` | string | ❌ | Search by name or email (case-insensitive substring) |
| `page` | integer | ❌ | Default `1` |
| `limit` | integer | ❌ | Default `20`, max `100` |

**200 OK** — paginated list.

```json
{
  "items": [ <User>, ... ],
  "pagination": { ... }
}
```

Soft-deleted users never appear.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid `role`, `page`, or `limit` value |

---

### `GET /api/v1/users/:id`

**Auth** — any role.

**Path params** — `id`: user UUID.

**200 OK** — `data` is a `User` object.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 404 | `NOT_FOUND` | User not found or soft-deleted |

---

### `POST /api/v1/users`

**Auth** — `ob` only.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | 1–100 characters, trimmed |
| `email` | string | ✅ | Valid email, stored lowercase, must be unique |
| `password` | string | ✅ | Min 8 characters, max 100; stored as bcrypt hash |
| `role` | string | ✅ | One of: `ob`, `faculty`, `executive`, `team_lead`, `member` |
| `obTitle` | string | ❌ | Only allowed when `role` is `ob` (e.g. `"President"`) |
| `teams` | array | ❌ | Array of `{ "teamId": "uuid", "position": "lead" \| "colead" \| "member" }` |

**Cross-field rules** (all validated server-side):

1. `role = "team_lead"` requires at least one entry in `teams` with `position` of `"lead"` or `"colead"`.
2. `position` of `"lead"` or `"colead"` is only valid when `role = "team_lead"`.
3. `obTitle` is only valid when `role = "ob"`. Must be omitted or `null` for all other roles.
4. Every `teamId` in `teams` must exist.

**201 Created** — `data` is the new `User` object (no password).

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing field, bad email, short password, bad role, or cross-field rule broken |
| 403 | `FORBIDDEN` | Caller is not an OB |
| 404 | `NOT_FOUND` | A `teamId` in `teams` does not exist |
| 409 | `CONFLICT` | Email already in use |

---

### `PATCH /api/v1/users/:id`

**Auth** — `ob` only.

**Path params** — `id`: user UUID.

**Body** — send only the fields you want to change. At least one field is required.

| Field | Type | Notes |
|---|---|---|
| `name` | string | 1–100 characters |
| `email` | string | Valid email, must be unique |
| `password` | string | Min 8 characters; stored as a new bcrypt hash |
| `role` | string | One of the valid roles |
| `obTitle` | string / null | Only valid for `role = "ob"` |
| `teams` | array | Fully **replaces** the user's team list. Send `[]` to remove from all teams. |

**Important behaviours:**

- Cross-field rules are validated against the **final merged state** (existing values combined with your changes).
- Changing `role` away from `ob` automatically clears `obTitle` to `null`.
- An OB cannot change their own role (returns `403`).
- Cannot demote the last remaining OB (returns `409`).

**200 OK** — `data` is the updated `User`.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | No fields sent, invalid value, or cross-field rule broken |
| 403 | `FORBIDDEN` | Caller is not an OB, or OB is trying to change their own role |
| 404 | `NOT_FOUND` | User or a `teamId` doesn't exist |
| 409 | `CONFLICT` | Email taken, or demoting the last OB |

---

### `DELETE /api/v1/users/:id`

**Auth** — `ob` only.

**Path params** — `id`: user UUID.

**Soft delete** — sets a `deletedAt` timestamp. The user can no longer log in and is hidden from all list responses. Their meetings, announcements, and comments remain intact and still show their name.

The user is automatically removed from all teams on deletion.

**204 No Content** on success.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not an OB |
| 404 | `NOT_FOUND` | User not found or already deleted |
| 409 | `CONFLICT` | Cannot delete yourself, or deleting the last OB |

---

## Team routes

### `GET /api/v1/teams`

**Auth** — any role.

**Query parameters**

| Param | Type | Required | Notes |
|---|---|---|---|
| `type` | string | ❌ | `"core"` or `"subclub"` |

**200 OK**

```json
{
  "items": [ <Team>, ... ]
}
```

No pagination. `leads` and `memberCount` are computed live from the current user list.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid `type` value |

---

### `GET /api/v1/teams/:id`

**Auth** — any role.

**Path params** — `id`: team UUID.

**200 OK** — `data` is a `Team` object with the full `members` array included.

```json
{
  "id": "uuid",
  "name": "Tech Team",
  "type": "core",
  "description": "...",
  "leads": [ { "id": "uuid", "name": "Priyanshu Yadav" } ],
  "memberCount": 2,
  "members": [
    { "id": "uuid", "name": "Priyanshu Yadav", "position": "lead" },
    { "id": "uuid", "name": "Riya Sharma", "position": "member" }
  ]
}
```

**Errors**

| Status | Code | Reason |
|---|---|---|
| 404 | `NOT_FOUND` | Team not found |

---

### `POST /api/v1/teams`

**Auth** — `ob` only.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | 1–100 characters, must be unique |
| `type` | string | ✅ | `"core"` or `"subclub"` |
| `description` | string | ❌ | Optional free text |

**201 Created** — `data` is the new `Team` (no `members` array, `leads` will be empty until members are added).

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `name` or `type`, or invalid `type` |
| 403 | `FORBIDDEN` | Caller is not an OB |
| 409 | `CONFLICT` | Team name already exists |

---

### `PATCH /api/v1/teams/:id`

**Auth** — `ob` only.

**Path params** — `id`: team UUID.

**Body** — at least one field required.

| Field | Type | Notes |
|---|---|---|
| `name` | string | 1–100 characters |
| `type` | string | `"core"` or `"subclub"` |
| `description` | string / null | Pass `null` to clear |

**200 OK** — `data` is the updated `Team`.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | No fields sent or invalid value |
| 403 | `FORBIDDEN` | Caller is not an OB |
| 404 | `NOT_FOUND` | Team not found |
| 409 | `CONFLICT` | New name already taken by another team |

---

### `DELETE /api/v1/teams/:id`

**Auth** — `ob` only.

**Path params** — `id`: team UUID.

**Hard delete.** Removes the team entirely. Members of this team are automatically removed from it.

**204 No Content** on success.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not an OB |
| 404 | `NOT_FOUND` | Team not found |
| 409 | `CONFLICT` | Deleting this team would leave a `team_lead` user with no lead/colead team, **or** the team has upcoming or today's scheduled meetings |

---

### `PUT /api/v1/teams/:id/members/:userId`

Add a user to a team, or update their position if already a member.

**Auth** — `ob` only.

**Path params**

| Param | Notes |
|---|---|
| `id` | Team UUID |
| `userId` | User UUID |

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `position` | string | ✅ | `"lead"`, `"colead"`, or `"member"` |

**Rule:** `"lead"` or `"colead"` position can only be assigned to a user whose `role` is `"team_lead"`.

**200 OK** — `data` is the updated `Team` including the full `members` array.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid `position`, or assigning lead/colead to a non-`team_lead` user |
| 403 | `FORBIDDEN` | Caller is not an OB |
| 404 | `NOT_FOUND` | Team or user not found |

---

### `DELETE /api/v1/teams/:id/members/:userId`

Remove a user from a team.

**Auth** — `ob` only.

**Path params**

| Param | Notes |
|---|---|
| `id` | Team UUID |
| `userId` | User UUID |

**204 No Content** on success.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Removing this user would leave a `team_lead` with no lead/colead team |
| 403 | `FORBIDDEN` | Caller is not an OB |
| 404 | `NOT_FOUND` | Team not found, user not found, or user is not a member of this team |

---

## Dashboard route

### `GET /api/v1/dashboard`

Returns everything the dashboard page needs in one call.

**Auth** — any role.

**200 OK**

```json
{
  "counts": {
    "members": 120,
    "officeBearers": 6,
    "executives": 10,
    "teamLeads": 14,
    "faculty": 3
  },
  "officeBearers": [
    { "id": "uuid", "name": "Aman Verma", "obTitle": "President" }
  ],
  "executives": [
    { "id": "uuid", "name": "Neha Singh" }
  ],
  "coreTeams": [
    {
      "id": "uuid",
      "name": "Tech Team",
      "type": "core",
      "leads": [ { "id": "uuid", "name": "Priyanshu Yadav" } ],
      "memberCount": 12
    }
  ],
  "subClubs": [
    {
      "id": "uuid",
      "name": "Design Club",
      "type": "subclub",
      "leads": [ { "id": "uuid", "name": "Kabir Mehta" } ],
      "memberCount": 8
    }
  ]
}
```

Soft-deleted users are excluded from all counts and lists.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No / invalid token |

---

## Meeting routes

### `GET /api/v1/meetings`

**Auth** — any role.

**Query parameters**

| Param | Type | Required | Notes |
|---|---|---|---|
| `from` | string | ✅ | Start of date range, `YYYY-MM-DD` |
| `to` | string | ✅ | End of date range, `YYYY-MM-DD` |
| `type` | string | ❌ | `"ob"`, `"core"`, or `"subclub"` |
| `teamId` | string | ❌ | Filter to one team's meetings |
| `status` | string | ❌ | `"scheduled"` (default), `"cancelled"`, or `"all"` |

The range between `from` and `to` cannot exceed **62 days**.  
By default (no `status` param), only `"scheduled"` meetings are returned. Cancelled meetings are hidden unless `status=cancelled` or `status=all`.

Results are sorted by `date` then `startTime` ascending.

**200 OK**

```json
{
  "items": [ <Meeting>, ... ]
}
```

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `from`/`to`, bad date format, `from` > `to`, range > 62 days, or invalid `type`/`status` value |
| 401 | `UNAUTHENTICATED` | No / invalid token |

---

### `GET /api/v1/meetings/:id`

**Auth** — any role.

**Path params** — `id`: meeting UUID.

**200 OK** — `data` is a `Meeting` object.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 404 | `NOT_FOUND` | Meeting not found |

---

### `POST /api/v1/meetings/check-clash`

Live clash check without saving anything. Use this to show a warning while the user fills out the form.

**Auth** — any role.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `date` | string | ✅ | `YYYY-MM-DD` |
| `startTime` | string | ✅ | `HH:mm` 24-hour |
| `endTime` | string | ✅ | `HH:mm` 24-hour, must be after `startTime` |
| `excludeMeetingId` | string / null | ❌ | Pass the meeting's own ID when checking an edit, so it doesn't clash with itself |

**200 OK — no clash**

```json
{ "hasClash": false, "clashes": [] }
```

**200 OK — clash found**

```json
{
  "hasClash": true,
  "clashes": [ <Meeting>, ... ]
}
```

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing field, bad format, or `endTime` not after `startTime` |

---

### `POST /api/v1/meetings`

**Auth** — `ob` or `team_lead`.

**Query parameters**

| Param | Type | Notes |
|---|---|---|
| `acknowledgeClash` | `"true"` | Pass to force-save despite a clash |

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `topic` | string | ✅ | 1–200 characters |
| `date` | string | ✅ | `YYYY-MM-DD` |
| `startTime` | string | ✅ | `HH:mm` 24-hour |
| `endTime` | string | ✅ | `HH:mm`, must be after `startTime` |
| `teamId` | string / null | Conditional | Required for `team_lead`. OBs omit it (or pass `null`) to create an OB meeting |
| `note` | string | ❌ | Short optional note |
| `location` | string | ❌ | Room name or location |
| `link` | string | ❌ | Valid URL (meet/zoom link) |

**Server-set fields** (never send these): `type`, `color`, `createdBy`, `status`.

**Rules:**
- A `team_lead` must supply a `teamId` for a team they lead or co-lead.
- An OB can create either an OB meeting (no `teamId`) or a team meeting (with `teamId`).
- If `endTime` is not strictly after `startTime`, returns `400`.
- Clash check: if the time overlaps any existing scheduled meeting on that date, returns `409 MEETING_CLASH`. The frontend can then resend with `?acknowledgeClash=true` to override.

**Overlap rule:** `newStart < existingEnd AND newEnd > existingStart AND existing.status == "scheduled"`

**201 Created** — `data` is the new `Meeting`.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing field, bad format, `endTime` not after `startTime`, or invalid URL |
| 403 | `FORBIDDEN` | Role cannot create meetings, or `team_lead` using a team they don't lead |
| 404 | `NOT_FOUND` | `teamId` doesn't exist |
| 409 | `MEETING_CLASH` | Time overlaps another scheduled meeting (data contains `clashes` array) |

---

### `PATCH /api/v1/meetings/:id`

**Auth** — creator of the meeting or `ob`.

**Path params** — `id`: meeting UUID.

**Query parameters**

| Param | Type | Notes |
|---|---|---|
| `acknowledgeClash` | `"true"` | Force-save despite a clash |

**Body** — send only the fields you want to change. At least one is required.

| Field | Type | Notes |
|---|---|---|
| `topic` | string | 1–200 characters |
| `date` | string | `YYYY-MM-DD` |
| `startTime` | string | `HH:mm` |
| `endTime` | string | `HH:mm` |
| `note` | string / null | Pass `null` to clear |
| `location` | string / null | Pass `null` to clear |
| `link` | string / null | Valid URL or `null` |
| `teamId` | string / null | Reassign the meeting's team. Pass a team UUID to change teams (OB: any team; `team_lead`: only a team they lead/co-lead). Pass `null` to convert to an OB meeting — OB only. |

**Rules:**
- Cannot edit a cancelled meeting (returns `409 CONFLICT`).
- Clash check runs only when `date`, `startTime`, or `endTime` is changing. If only `note`, `location`, `topic`, etc. change with no time change, no clash check is performed.
- Uses `?acknowledgeClash=true` to override a clash, same as create.

**200 OK** — `data` is the updated `Meeting`.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | No fields sent, bad format, or `endTime` not after `startTime` |
| 403 | `FORBIDDEN` | Caller is not the creator or an OB; or a `team_lead` passed `teamId: null` (OB-only); or a `team_lead` assigned a team they don't lead |
| 404 | `NOT_FOUND` | Meeting not found, or `teamId` doesn't exist |
| 409 | `CONFLICT` | Meeting is already cancelled |
| 409 | `MEETING_CLASH` | Time change causes an overlap |

---

### `POST /api/v1/meetings/:id/cancel`

Soft cancel — sets status to `"cancelled"`. The meeting stays in the database and still appears on the calendar when filtered by `status=cancelled`.

**Auth** — creator of the meeting or `ob`.

**Path params** — `id`: meeting UUID.

No body.

**200 OK** — `data` is the meeting with `"status": "cancelled"`.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not the creator or an OB |
| 404 | `NOT_FOUND` | Meeting not found |
| 409 | `CONFLICT` | Meeting is already cancelled |

---

### `DELETE /api/v1/meetings/:id`

**Auth** — `ob` only.

**Path params** — `id`: meeting UUID.

**Hard delete.** Permanently removes the meeting **and all comments on it**.

**204 No Content** on success.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not an OB |
| 404 | `NOT_FOUND` | Meeting not found |

---

## Announcement routes

### `GET /api/v1/announcements`

**Auth** — any role.

**Query parameters**

| Param | Type | Required | Notes |
|---|---|---|---|
| `type` | string | ❌ | `"society"` or `"team"` |
| `teamId` | string | ❌ | Filter to one team's announcements |
| `isPinned` | string | ❌ | `"true"` or `"false"` |
| `priority` | string | ❌ | `"normal"` or `"urgent"` |
| `page` | integer | ❌ | Default `1` |
| `limit` | integer | ❌ | Default `20`, max `100` |

**Sorting:** Pinned announcements (`isPinned: true`) always come first, sorted by `createdAt DESC`. Unpinned follow, also sorted by `createdAt DESC`.

**200 OK** — paginated list.

```json
{
  "items": [ <Announcement>, ... ],
  "pagination": { ... }
}
```

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid query param value (`type`, `priority`, `isPinned`, `page`, or `limit`) |

---

### `GET /api/v1/announcements/:id`

**Auth** — any role.

**Path params** — `id`: announcement UUID.

**200 OK** — `data` is an `Announcement` object.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 404 | `NOT_FOUND` | Announcement not found |

---

### `POST /api/v1/announcements`

**Auth** — `ob` or `team_lead`.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | ✅ | 1–150 characters |
| `content` | string | ✅ | Non-empty |
| `teamId` | string / null | Conditional | Required for team announcements. Omit or pass `null` for society-wide |
| `priority` | string | ❌ | `"normal"` (default) or `"urgent"` |
| `isPinned` | boolean | ❌ | Default `false` |

**Rules:**
- If `teamId` is omitted/`null`, only `ob` can create (type becomes `"society"`).
- If `teamId` is provided, a `team_lead` can only post for a team they lead or co-lead. An `ob` can post for any team.
- `type` and `createdBy` are set by the server.

**201 Created** — `data` is the new `Announcement`.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing title/content, or invalid priority value |
| 403 | `FORBIDDEN` | Role is not `ob` or `team_lead`; or non-OB trying a society-wide post; or `team_lead` using a team they don't lead |
| 404 | `NOT_FOUND` | `teamId` doesn't exist |

---

### `PATCH /api/v1/announcements/:id`

**Auth** — creator of the announcement or `ob`.

**Path params** — `id`: announcement UUID.

**Body** — at least one field required.

| Field | Type | Notes |
|---|---|---|
| `title` | string | 1–150 characters |
| `content` | string | Non-empty |
| `priority` | string | `"normal"` or `"urgent"` |
| `isPinned` | boolean | |

`updatedAt` is automatically set to the current timestamp on every successful update.

**200 OK** — `data` is the updated `Announcement`.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | No fields sent, or invalid value |
| 403 | `FORBIDDEN` | Caller is not the creator or an OB |
| 404 | `NOT_FOUND` | Announcement not found |

---

### `DELETE /api/v1/announcements/:id`

**Auth** — creator of the announcement or `ob`.

**Path params** — `id`: announcement UUID.

**Hard delete.** Permanently removes the announcement **and all comments on it**.

**204 No Content** on success.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not the creator or an OB |
| 404 | `NOT_FOUND` | Announcement not found |

---

## Comment routes

Comments exist on announcements and meetings. The read/post endpoints are nested under the parent resource. The edit/delete endpoints live under `/comments/:id`.

### `GET /api/v1/announcements/:id/comments`

**Auth** — any role.

**Path params** — `id`: announcement UUID.

**Query parameters**

| Param | Type | Notes |
|---|---|---|
| `parentCommentId` | string | Pass `"null"` to get only top-level comments. Pass a comment UUID to get only replies to that comment. Omit to get all comments. |
| `page` | integer | Default `1` |
| `limit` | integer | Default `20`, max `100` |

**200 OK** — paginated list sorted by `createdAt` ascending.

```json
{
  "items": [ <Comment>, ... ],
  "pagination": { ... }
}
```

**Errors**

| Status | Code | Reason |
|---|---|---|
| 404 | `NOT_FOUND` | Announcement not found |

---

### `POST /api/v1/announcements/:id/comments`

**Auth** — any role.

**Path params** — `id`: announcement UUID.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `content` | string | ✅ | 1–1000 characters |
| `parentCommentId` | string / null | ❌ | UUID of the comment being replied to. Must be a top-level comment on this announcement |

**Nesting rule:** Only one level of replies is allowed. Attempting to reply to a reply returns `400`.

**201 Created** — `data` is the new `Comment`.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Empty content, or `parentCommentId` is itself a reply |
| 404 | `NOT_FOUND` | Announcement not found, or `parentCommentId` doesn't exist on this announcement |

---

### `GET /api/v1/meetings/:id/comments`

**Auth** — any role.

**Path params** — `id`: meeting UUID.

**Query parameters** — same as `GET /announcements/:id/comments` above.

**200 OK** — paginated list sorted by `createdAt` ascending.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 404 | `NOT_FOUND` | Meeting not found |

---

### `POST /api/v1/meetings/:id/comments`

**Auth** — any role.

**Path params** — `id`: meeting UUID.

**Body** — same as `POST /announcements/:id/comments` above.

Comments can be posted on cancelled meetings.

**201 Created** — `data` is the new `Comment`.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Empty content, or `parentCommentId` is a reply |
| 404 | `NOT_FOUND` | Meeting not found, or `parentCommentId` doesn't exist on this meeting |

---

### `GET /api/v1/comments/:id`

**Auth** — any role.

**Path params** — `id`: comment UUID.

**200 OK** — `data` is a `Comment` object.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 404 | `NOT_FOUND` | Comment not found |

---

### `PATCH /api/v1/comments/:id`

**Auth** — author of the comment only (any role, but must be the creator).

**Path params** — `id`: comment UUID.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `content` | string | ✅ | 1–1000 characters |

`updatedAt` is set automatically.

**200 OK** — `data` is the updated `Comment`.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or empty content |
| 403 | `FORBIDDEN` | Caller is not the author |
| 404 | `NOT_FOUND` | Comment not found |

---

### `DELETE /api/v1/comments/:id`

**Auth** — author of the comment, or `ob` (for moderation).

**Path params** — `id`: comment UUID.

**Hard delete.** If deleting a top-level comment, all replies to it are automatically deleted too.

**204 No Content** on success.

**Errors**

| Status | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not the author or an OB |
| 404 | `NOT_FOUND` | Comment not found |

---

## Seed credentials

The database is wiped and re-seeded every time the server starts (in non-production mode). These users are always available after a fresh start:

| Role | Email | Password |
|---|---|---|
| `ob` | `aman@techspace.com` | `password123` |
| `team_lead` | `priyanshu@techspace.com` | `password123` |
| `team_lead` | `kabir@techspace.com` | `password123` |
| `member` | `riya@techspace.com` | `password123` |
| `executive` | `neha@techspace.com` | `password123` |
| `faculty` | `gupta@techspace.com` | `password123` |

Pre-seeded teams:

| Name | Type | Lead |
|---|---|---|
| Tech Team | `core` | Priyanshu Yadav |
| Design Club | `subclub` | Kabir Mehta |
