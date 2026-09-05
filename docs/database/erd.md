# NurseHandOver — Entity Relationship Diagram

## Overview

This document describes the database entity relationships for the NurseHandOver system.

## Core Entities

### Authentication & Authorization

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    users     │────<│  user_roles  │>────│    roles     │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Hospital Structure

```
┌─────────────┐
│ departments  │
└──────┬──────┘
       │
       v
┌─────────────┐
│    wards     │
└──────┬──────┘
       │
       v
┌─────────────┐
│    rooms     │
└──────┬──────┘
       │
       v
┌─────────────┐
│    beds      │
└─────────────┘
```

### Shift Management

```
┌─────────────┐     ┌──────────────────┐
│   shifts     │────<│ nurse_assignments │
└─────────────┘     └──────────────────┘
```

### Patient Management

```
┌─────────────┐
│   patients   │
└──────┬──────┘
       │
       ├──<┌─────────────────┐
       │   │   vital_signs    │
       │   └─────────────────┘
       │
       ├──<┌─────────────────────┐
       │   │ nursing_assessments  │
       │   └─────────────────────┘
       │
       ├──<┌─────────────────┐
       │   │  nursing_tasks   │
       │   └─────────────────┘
       │
       └──<┌─────────────┐
           │  handovers   │
           └──────┬──────┘
                  │
                  ├──<┌───────────────────┐
                  │   │ handover_sections  │
                  │   └───────────────────┘
                  │
                  ├──<┌───────────────────┐
                  │   │ handover_versions  │
                  │   └───────────────────┘
                  │
                  ├──<┌───────────────────┐
                  │   │  handover_events   │
                  │   └───────────────────┘
                  │
                  └──<┌───────────────────────┐
                      │ handover_clarifications │
                      └───────────────────────┘
```

### Notifications & Audit

```
┌─────────────────┐
│  notifications   │
└─────────────────┘

┌─────────────────┐
│   audit_logs     │
└─────────────────┘
```

### Research Module

```
┌─────────────────┐
│ research_studies  │
└──────┬──────────┘
       │
       ├──<┌──────────────────────┐
       │   │ research_participants │
       │   └──────────────────────┘
       │
       ├──<┌────────────────────┐
       │   │  research_surveys   │
       │   └────────┬───────────┘
       │            │
       │            └──<┌─────────────────┐
       │                │  survey_questions │
       │                └────────┬────────┘
       │                         │
       │                         └──<┌─────────────────┐
       │                             │ survey_responses  │
       │                             └─────────────────┘
       │
       └──<┌───────────────────┐
           │  research_metrics  │
           └───────────────────┘
```

## Relationship Summary

| Relationship | Type | Description |
|-------------|------|-------------|
| users → user_roles | One-to-Many | A user can have multiple roles |
| roles → user_roles | One-to-Many | A role can be assigned to multiple users |
| departments → wards | One-to-Many | A department contains multiple wards |
| wards → rooms | One-to-Many | A ward contains multiple rooms |
| rooms → beds | One-to-Many | A room contains multiple beds |
| wards → nurse_assignments | One-to-Many | A ward has multiple nurse assignments |
| shifts → nurse_assignments | One-to-Many | A shift has multiple nurse assignments |
| users → nurse_assignments | One-to-Many | A nurse can have multiple assignments |
| patients → vital_signs | One-to-Many | A patient has multiple vital sign records |
| patients → nursing_assessments | One-to-Many | A patient has multiple assessments |
| patients → nursing_tasks | One-to-Many | A patient has multiple tasks |
| patients → handovers | One-to-Many | A patient has multiple handovers |
| handovers → handover_sections | One-to-Many | A handover has multiple SBAR sections |
| handovers → handover_versions | One-to-Many | A handover has multiple versions |
| handovers → handover_events | One-to-Many | A handover has multiple events |
| handovers → handover_clarifications | One-to-Many | A handover can have multiple clarifications |
| users → notifications | One-to-Many | A user has multiple notifications |
| users → audit_logs | One-to-Many | A user has multiple audit entries |
| research_studies → research_participants | One-to-Many | A study has multiple participants |
| research_studies → research_surveys | One-to-Many | A study has multiple surveys |
| research_surveys → survey_questions | One-to-Many | A survey has multiple questions |
| survey_questions → survey_responses | One-to-Many | A question has multiple responses |
| research_studies → research_metrics | One-to-Many | A study has multiple metrics |
