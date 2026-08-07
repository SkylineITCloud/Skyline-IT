# Product Requirements Document: StudySync

**Version:** 2.0  
**Status:** Living Document  

---

## 1. Product Overview

StudySync is a collaborative group study platform that enables university students to form compatible study groups, schedule and conduct structured study sessions, track progress, and stay motivated through gamification.

### 1.1 Product Principles

1. **Purpose-Built:** Every feature serves a specific study-related function. No distractions.
2. **Social Accountability:** Groups create peer pressure and motivation.
3. **Progress Visibility:** Users can see their own and their group's progress.
4. **Low Friction:** Join a group and start studying in under 2 minutes.
5. **Privacy First:** Minimal data collection; no social media integration.

---

## 2. User Stories by Epic

### Epic 1: Authentication & Onboarding

| ID | User Story | Priority | Effort |
|----|-----------|----------|--------|
| AUTH-1 | As a new user, I want to create an account with my university email so I can access StudySync | P0 | Complete |
| AUTH-2 | As a returning user, I want to log in with email and password | P0 | Complete |
| AUTH-3 | As a user, I want to see password strength requirements during signup | P1 | Complete |
| AUTH-4 | As a user, I want to toggle password visibility | P1 | Complete |
| AUTH-5 | As a user, I want to log out securely | P0 | Complete |
| AUTH-6 | As a user, I want to delete my account and all associated data | P1 | Complete |
| AUTH-7 | As a user, I want to reset my password if I forget it | P1 | Not started |
| AUTH-8 | As a user, I want to sign in with Google/Uni SSO | P2 | Not started |
| AUTH-9 | As a user, I want email verification on signup | P1 | Not started |

### Epic 2: Group Discovery & Management

| ID | User Story | Priority | Effort |
|----|-----------|----------|--------|
| GRP-1 | As a user, I want to see available study groups filtered by course and method | P0 | Complete |
| GRP-2 | As a user, I want to see match percentage for each group | P1 | Complete |
| GRP-3 | As a user, I want to join a group with one click | P0 | Complete |
| GRP-4 | As a user, I want to create a new group with course, method, and size | P0 | Complete |
| GRP-5 | As a user, I want to see my current group members and their online status | P0 | Complete |
| GRP-6 | As a user, I want to leave a group | P1 | Complete |
| GRP-7 | As a group admin, I want to remove members from the group | P2 | Not started |
| GRP-8 | As a user, I want to invite others via email/link | P2 | Not started |
| GRP-9 | As a user, I want to see group study statistics | P2 | Not started |

### Epic 3: Dashboard & Progress

| ID | User Story | Priority | Effort |
|----|-----------|----------|--------|
| DASH-1 | As a user, I want a personalized dashboard showing my group, streak, and progress | P0 | Complete |
| DASH-2 | As a user, I want to see my weekly study hours goal | P0 | Complete |
| DASH-3 | As a user, I want to see my total study hours | P1 | Complete |
| DASH-4 | As a user, I want to see and earn badges for milestones | P1 | Complete |
| DASH-5 | As a user, I want to see upcoming sessions on my dashboard | P0 | Complete |
| DASH-6 | As a user, I want to see recent chat messages on my dashboard | P1 | Complete |
| DASH-7 | As a user, I want to toggle a leaderboard showing group member hours | P1 | Complete |
| DASH-8 | As a user, I want a "missed session" encouragement banner | P2 | Complete |

### Epic 4: Study Sessions & Pomodoro

| ID | User Story | Priority | Effort |
|----|-----------|----------|--------|
| POMO-1 | As a user, I want a Pomodoro timer with configurable focus/break intervals | P0 | Complete |
| POMO-2 | As a user, I want to start, pause, and reset the timer | P0 | Complete |
| POMO-3 | As a user, I want to see session completion with confetti celebration | P1 | Complete |
| POMO-4 | As a user, I want my Pomodoro sessions tracked to my study hours | P1 | Complete |
| POMO-5 | As a user, I want to see who else is studying at the same time | P2 | Complete |
| POMO-6 | As a user, I want to schedule study sessions on a shared calendar | P0 | Complete |
| POMO-7 | As a user, I want to join sessions and mark attendance | P1 | Complete |
| POMO-8 | As a user, I want calendar events color-coded by type | P2 | Complete |

### Epic 5: Task Management

| ID | User Story | Priority | Effort |
|----|-----------|----------|--------|
| TASK-1 | As a user, I want to add tasks visible to my group | P0 | Complete |
| TASK-2 | As a user, I want to mark tasks as complete | P0 | Complete |
| TASK-3 | As a user, I want to assign tasks to group members | P1 | Complete |
| TASK-4 | As a user, I want to react to tasks with emojis | P2 | Complete |
| TASK-5 | As a user, I want to drag-and-drop reorder tasks | P2 | Complete |
| TASK-6 | As a user, I want to see task completion progress | P0 | Complete |

### Epic 6: Chat & Communication

| ID | User Story | Priority | Effort |
|----|-----------|----------|--------|
| CHAT-1 | As a user, I want to send messages to my study group | P0 | Complete |
| CHAT-2 | As a user, I want my messages to show with my name and avatar | P0 | Complete |
| CHAT-3 | As a user, I want to mention other members with @ | P1 | Complete |
| CHAT-4 | As a user, I want to send shout-outs to praise members | P1 | Complete |
| CHAT-5 | As a user, I want quick-access emoji buttons | P2 | Complete |
| CHAT-6 | As a user, I want to see chat preview on the dashboard | P1 | Complete |
| CHAT-7 | As a user, I want to receive notifications for new messages | P2 | Not started |

### Epic 7: Profile & Settings

| ID | User Story | Priority | Effort |
|----|-----------|----------|--------|
| PROF-1 | As a user, I want to view my profile with name, email, and course | P0 | Complete |
| PROF-2 | As a user, I want to edit my name and course | P0 | Complete |
| PROF-3 | As a user, I want to toggle dark mode | P0 | Complete |
| PROF-4 | As a user, I want to set Do Not Disturb | P1 | Complete |
| PROF-5 | As a user, I want to control leaderboard visibility | P1 | Complete |
| PROF-6 | As a user, I want to set my weekly availability | P1 | Complete |
| PROF-7 | As a user, I want to see and manage notification preferences | P2 | Not started |

### Epic 8: Notifications

| ID | User Story | Priority | Effort |
|----|-----------|----------|--------|
| NOTIF-1 | As a user, I want to see notifications for new sessions | P1 | Complete |
| NOTIF-2 | As a user, I want to see notifications when someone joins my group | P1 | Complete |
| NOTIF-3 | As a user, I want to see notifications for task assignments | P1 | Complete |
| NOTIF-4 | As a user, I want to mark notifications as read | P2 | Complete |
| NOTIF-5 | As a user, I want email/push notifications off-platform | P2 | Not started |

---

## 3. Non-Functional Requirements

### 3.1 Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Page load time | <2s | Lighthouse |
| API response time (p50) | <200ms | Grafana |
| API response time (p99) | <1s | Grafana |
| Concurrent users per instance | 200 | Load test |
| Time to first meaningful paint | <1.5s | Lighthouse |
| Database query time | <100ms | Query logging |

### 3.2 Security

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Password hashing | bcrypt, 12 rounds | Complete |
| API authentication | JWT Bearer tokens | Complete |
| Rate limiting | express-rate-limit (200/15min) | Complete |
| Security headers | Helmet middleware | Complete |
| CORS | Configurable origin whitelist | Complete |
| SQL injection protection | Parameterized queries | Complete |
| XSS prevention | Content Security Policy ready | Complete |
| Input validation | express-validator on all endpoints | Complete |
| Session management | Token expiry configurable (default: 7d) | Complete |

### 3.3 Accessibility (WCAG 2.1 AA)

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Semantic HTML | nav, main, section, header, role attributes | Complete |
| ARIA labels | All interactive elements labeled | Complete |
| Keyboard navigation | All features accessible via keyboard | Complete |
| Focus management | Visible focus rings, modal focus trapping | Complete |
| Color contrast | WCAG AA ratios in both light and dark modes | Complete |
| Screen reader support | aria-live regions, aria-required, role attributes | Complete |
| Skip navigation | Skip-to-content link | Complete |

### 3.4 Browser Support

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Chrome | 90+ | Tested |
| Firefox | 88+ | Tested |
| Safari | 14+ | Tested |
| Edge | 90+ | Tested |
| Opera | 76+ | Likely works |
| Mobile Chrome (Android) | 90+ | Tested |
| Mobile Safari (iOS) | 14+ | Not tested |

---

## 4. APIs & Integrations

### 4.1 Current API Surface

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Authenticate |
| `/api/auth/me` | GET | Current user |
| `/api/groups` | GET | List discoverable groups |
| `/api/groups/mine` | GET | User's groups |
| `/api/groups/:id` | GET | Group details |
| `/api/groups` | POST | Create group |
| `/api/groups/:id/join` | POST | Join group |
| `/api/groups/:id/leave` | POST | Leave group |
| `/api/sessions` | GET | List sessions |
| `/api/sessions` | POST | Create session |
| `/api/sessions/:id/attend` | POST | Mark attendance |
| `/api/tasks` | GET | List tasks |
| `/api/tasks` | POST | Create task |
| `/api/tasks/:id` | PUT | Update task |
| `/api/tasks/:id` | DELETE | Delete task |
| `/api/messages` | GET | Get messages |
| `/api/messages` | POST | Send message |
| `/api/messages/shoutout` | POST | Send shout-out |
| `/api/pomodoro/complete` | POST | Log pomodoro |
| `/api/pomodoro/stats` | GET | Pomodoro stats |
| `/api/notifications` | GET | Get notifications |
| `/api/notifications/:id/read` | PUT | Mark read |
| `/api/notifications/read-all` | PUT | Mark all read |
| `/api/users/profile` | GET | Get profile |
| `/api/users/profile` | PUT | Update profile |
| `/api/users/settings` | PUT | Update settings |
| `/api/users/leaderboard` | GET | Leaderboard |
| `/api/users/account` | DELETE | Delete account |

### 4.2 Planned Integrations

| Integration | Timeline | Purpose |
|-------------|----------|---------|
| Google OAuth | Phase 2 | Frictionless login |
| Microsoft SSO | Phase 2 | University email login |
| SendGrid / Resend | Phase 2 | Email notifications |
| Stripe | Phase 2 | Payment processing |
| Socket.io | Phase 2 | Real-time messaging |
| Zoom / Jitsi API | Phase 3 | In-app video sessions |
| OpenAI API | Phase 4 | AI study assistant |

---

## 5. Analytics & Metrics

### 5.1 Events to Track

| Event | Category | Purpose |
|-------|----------|---------|
| User Signup | Acquisition | Growth tracking |
| Group Join | Activation | Value realization |
| First Pomodoro | Activation | Core action |
| Session Created | Engagement | Feature adoption |
| Message Sent | Engagement | Communication |
| Task Completed | Engagement | Academic progress |
| Streak Achieved (3, 7, 14, 30 day) | Retention | Habit formation |
| Payment Started | Revenue | Funnel tracking |
| Payment Completed | Revenue | Revenue tracking |
| Account Deleted | Churn | Retention analysis |

### 5.2 North Star Metric

**"Weekly Active Study Sessions"** — Number of completed Pomodoro or scheduled study sessions per week across all users. This metric captures genuine learning engagement rather than vanity metrics like MAU.
