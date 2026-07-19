# User Stories — Jamming Events Platform

## Format

```
As a [persona], I want [capability] so that [benefit].
```

**Priority:** P0 (MVP), P1 (Phase 2), P2 (Phase 3)
**Story Points:** 1 (small), 2 (medium), 3 (large), 5 (complex), 8 (epic)

---

## EPIC 1: Event Creation & Management

### Stories

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| E-01 | As Maya, I want to create an event with a form so that I can list my jamming session. | P0 | 3 |
| E-02 | As Maya, I want to set event capacity so that I don't exceed venue limits. | P0 | 2 |
| E-03 | As Maya, I want to add a cover image so that the event looks appealing. | P0 | 2 |
| E-04 | As Maya, I want to set ticket types (free/paid) so that I can control pricing. | P0 | 3 |
| E-05 | As Maya, I want to edit event details after creation so that I can update information. | P0 | 2 |
| E-06 | As Maya, I want to cancel an event so that attendees know it's not happening. | P0 | 2 |
| E-07 | As Maya, I want to make events private (invite-only) so that I control who attends. | P1 | 3 |
| E-08 | As Maya, I want to duplicate a past event so that I can quickly create recurring sessions. | P1 | 2 |
| E-09 | As Maya, I want to set a waitlist so that I can fill spots when people cancel. | P1 | 3 |
| E-10 | As Maya, I want to schedule recurring events (weekly/monthly) so that I save time. | P2 | 5 |

---

## EPIC 2: User Registration & Profiles

### Stories

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| U-01 | As a visitor, I want to register with email and password so that I can buy tickets. | P0 | 3 |
| U-02 | As a visitor, I want to sign in with Google so that I don't need another password. | P0 | 3 |
| U-03 | As Alex, I want to edit my profile (name, photo, instrument) so that I can represent myself. | P0 | 2 |
| U-04 | As a user, I want to reset my password so that I can regain access. | P0 | 2 |
| U-05 | As Jordan, I want to purchase a ticket without creating an account so that I can attend quickly. | P1 | 3 |
| U-06 | As a user, I want to delete my account so that I can control my data. | P1 | 2 |
| U-07 | As a user, I want to set my instrument preferences so that I find relevant events. | P2 | 2 |

---

## EPIC 3: Event Discovery & Browsing

### Stories

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| D-01 | As Alex, I want to browse upcoming events in a grid so that I can find sessions to join. | P0 | 3 |
| D-02 | As Alex, I want to view event details (date, venue, description) so that I know what to expect. | P0 | 2 |
| D-03 | As Alex, I want to filter events by date range so that I can plan my week. | P1 | 2 |
| D-04 | As Alex, I want to search events by keyword so that I can find specific sessions. | P1 | 2 |
| D-05 | As Alex, I want to see which instruments are needed so that I know if I can contribute. | P1 | 2 |
| D-06 | As Alex, I want to share an event link so that I can invite musician friends. | P1 | 1 |
| D-07 | As Alex, I want to save/bookmark events so that I can find them later. | P2 | 2 |
| D-08 | As Alex, I want to see who else is attending so that I know which friends will be there. | P2 | 3 |

---

## EPIC 4: Ticketing & Checkout

### Stories

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| T-01 | As Alex, I want to RSVP for a free event so that I can secure my spot. | P0 | 3 |
| T-02 | As Alex, I want to purchase a paid ticket so that I can attend. | P1 | 5 |
| T-03 | As Alex, I want to receive a confirmation after booking so that I know it worked. | P0 | 2 |
| T-04 | As Alex, I want to view my ticket with a QR code so that I can use it for entry. | P0 | 3 |
| T-05 | As Alex, I want to download my ticket as PDF/PNG so that I can access it offline. | P1 | 2 |
| T-06 | As Alex, I want to cancel my ticket so that someone else can take my spot. | P1 | 3 |
| T-07 | As Jordan, I want to RSVP without creating an account (guest mode) so that I can attend quickly. | P1 | 3 |
| T-08 | As Alex, I want my ticket to be verifiable so that no one can fake it. | P1 | 3 |
| T-09 | As Alex, I want to receive event reminders so that I don't forget. | P1 | 2 |
| T-10 | As Alex, I want to add tickets to Apple Wallet / Google Pay so that I don't need the app. | P2 | 5 |

---

## EPIC 5: QR Check-In & Verification

### Stories

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| Q-01 | As Sam, I want to scan a QR code from my phone so that I can check in attendees. | P0 | 5 |
| Q-02 | As Sam, I want to see valid/invalid/used status so that I know if the ticket is good. | P0 | 2 |
| Q-03 | As Maya, I want to see real-time check-in stats so that I know how many people are inside. | P0 | 3 |
| Q-04 | As Sam, I want to manually enter a ticket code so that I can check in someone with a broken screen. | P1 | 2 |
| Q-05 | As Maya, I want the ticket to be blockchain-verified so that I can trust its authenticity. | P1 | 5 |
| Q-06 | As Maya, I want scanning feedback (sound/vibration) so that I know it worked without looking. | P1 | 1 |
| Q-07 | As Maya, I want offline scan capability so that check-in works even if internet is down. | P2 | 5 |
| Q-08 | As Casey, I want to see the current count so that I know when we're nearing capacity. | P2 | 2 |

---

## EPIC 6: Organizer Dashboard

### Stories

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| O-01 | As Maya, I want to see all my events in a dashboard so that I can manage them. | P0 | 3 |
| O-02 | As Maya, I want to see attendee list with check-in status so that I know who's here. | P0 | 3 |
| O-03 | As Maya, I want to see ticket sales data so that I understand revenue. | P1 | 2 |
| O-04 | As Maya, I want to export attendee list as CSV so that I can use it elsewhere. | P1 | 2 |
| O-05 | As Maya, I want to message all attendees so that I can send last-minute updates. | P1 | 3 |
| O-06 | As Maya, I want to see attendance trends over time so that I can plan better events. | P2 | 3 |
| O-07 | As Sam, I want role-based access so that I can scan tickets without full admin rights. | P1 | 2 |
| O-08 | As Maya, I want to scan tickets from my own dashboard so that I can help at the door. | P1 | 2 |

---

## EPIC 7: Blockchain & Security

### Stories

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| B-01 | As Maya, I want each ticket to have a unique blockchain hash so that I can verify authenticity. | P1 | 5 |
| B-02 | As Sam, when scanning, I want the system to verify the ticket against the blockchain so that fraud is impossible. | P1 | 3 |
| B-03 | As Maya, I want an audit log of all check-ins so that I have a record. | P1 | 2 |
| B-04 | As Casey, I want to trust that tickets are legitimate so that I don't worry about fraud. | P1 | 1 |

---

## EPIC 8: Notifications

### Stories

| ID | Story | Priority | Points |
|----|-------|----------|--------|
| N-01 | As Alex, I want a booking confirmation on-screen so that I know my ticket is secured. | P0 | 1 |
| N-02 | As Alex, I want an email confirmation so that I have a record. | P1 | 2 |
| N-03 | As Alex, I want a reminder 24 hours before so that I don't forget. | P1 | 2 |
| N-04 | As Maya, I want to be notified when someone cancels so that I can manage the waitlist. | P1 | 1 |
| N-05 | As Alex, I want to be notified if an event is cancelled so that I don't show up. | P0 | 2 |

---

## Velocity Planning

| Epic | P0 Stories | P1 Stories | P2 Stories | Total Points |
|------|-----------|-----------|-----------|-------------|
| Event Creation | 6 | 2 | 2 | 10 |
| User Registration | 4 | 2 | 1 | 7 |
| Event Discovery | 2 | 4 | 2 | 8 |
| Ticketing | 4 | 5 | 1 | 10 |
| QR Check-In | 3 | 3 | 2 | 8 |
| Organizer Dashboard | 2 | 4 | 2 | 8 |
| Blockchain & Security | 0 | 4 | 0 | 4 |
| Notifications | 2 | 3 | 0 | 5 |
| **Total** | **23** | **27** | **10** | **60** |

## Definition of Ready

A story is ready for development when:
- [ ] Acceptance criteria are defined
- [ ] Design mockups are available
- [ ] Dependencies are identified
- [ ] Estimated (story points assigned)
- [ ] Backend API contract is defined

## Definition of Done

A story is done when:
- [ ] Code is written and reviewed
- [ ] Tests pass (unit + integration)
- [ ] Feature works in staging environment
- [ ] Documentation is updated
- [ ] Acceptance criteria are met
- [ ] No regressions introduced
