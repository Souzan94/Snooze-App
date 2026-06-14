# Snooze App

A Zendesk sidebar app that lets agents temporarily snooze support tickets for a custom duration. When the timer expires, the ticket automatically reopens and the assignee receives a notification — so agents can step away without losing track.

Built for **OmniWise** using the Zendesk Apps Framework (ZAF SDK v2) and AWS serverless infrastructure.

---

## The Problem

Support agents sometimes need to pause work on a ticket — waiting on a customer reply, researching an issue, or taking a break. Without a snooze mechanism, tickets either get forgotten or agents have to manually track follow-ups. Zendesk doesn't offer a built-in snooze feature tied to automated timers.

---

## How It Works

1. **Agent opens a ticket** — the sidebar app loads and checks if an active timer already exists for that ticket (fetched from DynamoDB via AWS API Gateway)
2. **Agent sets a duration** — choose from preset options (5m, 10m, 30m, 1h, 2h, 12h, 24h) or enter a custom value in seconds/minutes/hours (max 7 days)
3. **Timer starts** — the ticket status changes to the custom "Snooze" status; the ticket is tagged `ticket_snoozed_for_{time}_{unit}`; a real-time progress bar and HH:MM:SS countdown appear in the sidebar
4. **Real-time sync** — uses `api_notification` events to keep all open instances of the ticket in sync across agent tabs (every agent viewing the ticket sees the same timer state)
5. **Timer expires** — the countdown reaches zero, the ticket automatically reopens (status set back to "open"), the agent receives a real-time in-app notification
6. **Email notification (optional)** — if enabled by an admin, a Zendesk trigger fires when the ticket transitions out of "Snooze" status and sends an email reminder to the assignee
7. **Resume or delete** — agents can stop, restart, or delete a running timer at any time; stop/restart update the snooze custom field to track cumulative snoozed time

---

## Tech Stack

| Layer | Technology |
|---|---|
| App Framework | Zendesk Apps Framework (ZAF SDK v2) |
| Locations | `ticket_sidebar`, `nav_bar`, `background` |
| Backend | AWS API Gateway + AWS Lambda |
| Database | AWS DynamoDB |
| Auth | Zendesk OAuth 2.0 |
| Real-time | ZAF `api_notification` events |
| Hosting | AWS S3 (static assets) |

---

## Key Features

**Sidebar (ticket_sidebar)**
- Preset and custom snooze durations
- Live countdown timer (HH:MM:SS) with visual progress bar
- Persists timer state on page reload — on open, fetches active timer from DB and resumes the countdown from the correct position
- Stop / Restart / Delete controls
- Role-based access: only Zendesk admins and designated app admins can create timers
- OAuth authorization gate — prompts agents to authorize the app on first use

**Admin Panel (nav_bar)**
- Agent management table: grant or revoke app admin access per agent, or bulk grant/revoke all
- User search filter
- Email notification toggle — creates/deletes a Zendesk trigger that fires when a ticket exits "Snooze" status
- Snooze Field toggle — creates a custom ticket field (`Total Snoozed Time (seconds)`) and adds it to all ticket forms to track cumulative snooze time across restarts

**Optional Snooze Field**
- When enabled, a custom Zendesk ticket field accumulates the total seconds a ticket has been snoozed
- Each start adds the duration; each stop subtracts elapsed time; reports on total snooze time per ticket become possible

---

## Project Structure

```
├── manifest.json          # App configuration, ZAF version, install parameters
├── assets/
│   ├── sideBar.js         # Timer logic: start, stop, restart, delete, progress bar, DB sync
│   ├── navBar.js          # Admin panel: user management, trigger/field settings
│   ├── sidebar.html       # Sidebar UI
│   ├── navBar.html        # Admin panel UI
│   └── back.html          # Background page (handles background events)
└── translations/
    └── en.json            # App name, descriptions, install instructions
```

---

## Setup

The app requires a custom Zendesk ticket status named **"Snooze"** (category: Pending). During installation, the admin provides the Status ID of this custom status as an app parameter.

After install, the nav bar admin panel allows the admin to:
1. Enable email notifications (creates a Zendesk trigger automatically)
2. Enable the Snooze tracking field (creates a custom ticket field and adds it to all forms)
3. Grant timer-creation access to specific agents

---

## License

Private — built for a client (OmniWise).
