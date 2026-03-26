# Product Improvement Opportunities

## Goal

Build features that are still weak or missing in most expense-sharing products, and use AI where it creates real value.

## Bifurcation by Platform

## Mobile Only

### 1) Android Background Ingestion

- Read SMS/notification signals (permission-based) and convert them into draft expenses.
- Strong differentiator for India-style payment workflows.

### 2) Quick Actions from Notifications

- Approve draft, mark as paid, remind member directly from notification tray.
- Reduces app-open friction.

### 3) One-Tap Settlement via UPI Deep Links

- Launch payment app with pre-filled recipient/amount.
- Capture payment proof screenshot after completion.

### 4) Offline-First Expense + Split Editing

- Create/edit expenses fully offline and sync later.
- Conflict assistant suggests merge resolutions.

### 5) Camera-First Batch Receipt Mode

- Scan multiple receipts in one session and queue OCR in background.
- Useful for trips/household monthly bill day.

## Web Only

### 1) Scenario Simulator

- "What if rent increases by 8%?" and immediate impact on group balances.

### 2) Admin Ops Dashboard

- Invite conversion funnel, pending members, recurring failures, unresolved disputes.

### 3) Finance Audit Timeline

- Immutable event history: who changed amount/split/date and when.

### 4) Team Reconciliation Workspace

- Spreadsheet-like review table for bulk validation and correction of auto-captured entries.

### 5) Governance + Policy Controls

- Group policies (approval thresholds, mandatory notes, role-based edit limits).

## Both (Web + Mobile)

### 1) AI Expense Copilot

- Natural-language to expense draft.
- Example: "I paid 1450 at DMart with Rahul and Neha."

### 2) AI Receipt Intelligence

- Extract merchant, tax, line items, payment mode.
- Detect duplicates and subscription-like patterns.

### 3) AI Smart Reconciliation

- Match transactions/signals/receipts to existing group expenses.
- Raise unmatched items for quick review.

### 4) Autonomous Settlement Orchestrator

- Compute minimal payment graph for entire group.
- Recommend best settlement order and rail.

### 5) Context-Aware Split Suggestions

- Suggest split type by event pattern and group history.
- Learns each group's behavior over time.

### 6) Invite-to-Activation Intelligence

- Smart invite links, reminder cadence, and conversion nudges.
- Surfaces "who is blocking settlement."

### 7) Financial Fairness Score

- Tracks recurring imbalance and fronting burden.
- Gives transparent fairness insights to all members.

### 8) AI Negotiation + Dispute Assistant

- Suggests message tone for reminders.
- Generates neutral summaries when members disagree.

### 9) Goal and Forecast Layer

- Shared goals (trip, household, event) with weekly guidance.
- Predicts overshoot risk and recommends actions.

## Not Common in Market (Current Gap)

- Reliable cross-channel ingestion to draft pipeline with human approval.
- True offline collaboration with safe conflict resolution.
- Settlement execution optimization (not just balance display).
- Transparent trust/audit layer for edits and disputes.
- Fairness analytics that quantify long-term imbalance.

## AI Usage Principles (Must Have)

- Consent by source (SMS, notifications, camera, email).
- Explainable AI suggestions ("why this was suggested").
- Human-in-the-loop for all money-impacting actions.
- On-device preprocessing where possible to reduce privacy risk.
