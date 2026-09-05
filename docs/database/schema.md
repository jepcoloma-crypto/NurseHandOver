# NurseHandOver — Database Schema

## Overview

This document describes the PostgreSQL database schema for the NurseHandOver system.

## Tables

### Authentication & Authorization

#### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

#### roles
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| name | VARCHAR(50) | UNIQUE, NOT NULL |
| description | TEXT | NULLABLE |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

#### user_roles
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | FOREIGN KEY → users, CASCADE |
| role_id | UUID | FOREIGN KEY → roles, CASCADE |
| created_at | TIMESTAMP | DEFAULT now() |

**Constraints:** UNIQUE(user_id, role_id)

### Hospital Structure

#### departments
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| name | VARCHAR(100) | UNIQUE, NOT NULL |
| description | TEXT | NULLABLE |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

#### wards
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| name | VARCHAR(100) | NOT NULL |
| department_id | UUID | FOREIGN KEY → departments, RESTRICT |
| capacity | INTEGER | DEFAULT 0 |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

**Constraints:** UNIQUE(name, department_id)

#### rooms
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| number | VARCHAR(20) | NOT NULL |
| ward_id | UUID | FOREIGN KEY → wards, RESTRICT |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

**Constraints:** UNIQUE(number, ward_id)

#### beds
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| number | VARCHAR(20) | NOT NULL |
| room_id | UUID | FOREIGN KEY → rooms, RESTRICT |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

**Constraints:** UNIQUE(number, room_id)

### Shift Management

#### shifts
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| name | VARCHAR(50) | NOT NULL |
| start_time | TIMESTAMP | NOT NULL |
| end_time | TIMESTAMP | NOT NULL |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

#### nurse_assignments
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| nurse_id | UUID | FOREIGN KEY → users, RESTRICT |
| ward_id | UUID | FOREIGN KEY → wards, RESTRICT |
| shift_id | UUID | FOREIGN KEY → shifts, RESTRICT |
| assigned_date | TIMESTAMP | NOT NULL |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

### Patient Management

#### patients
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| mrn | VARCHAR(50) | UNIQUE, NOT NULL |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| date_of_birth | TIMESTAMP | NOT NULL |
| gender | VARCHAR(20) | NOT NULL |
| admission_date | TIMESTAMP | NOT NULL |
| ward_id | UUID | FOREIGN KEY → wards, RESTRICT |
| bed_id | UUID | FOREIGN KEY → beds, SET NULL |
| status | VARCHAR(20) | DEFAULT 'active' |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

### Clinical Data

#### vital_signs
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| patient_id | UUID | FOREIGN KEY → patients, CASCADE |
| recorded_by | UUID | NOT NULL |
| temperature | DECIMAL(4,1) | NULLABLE |
| heart_rate | INTEGER | NULLABLE |
| respiratory_rate | INTEGER | NULLABLE |
| blood_pressure_systolic | INTEGER | NULLABLE |
| blood_pressure_diastolic | INTEGER | NULLABLE |
| oxygen_saturation | DECIMAL(5,2) | NULLABLE |
| pain_scale | INTEGER | NULLABLE |
| notes | TEXT | NULLABLE |
| recorded_at | TIMESTAMP | DEFAULT now() |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

**Indexes:** (patient_id, recorded_at)

#### nursing_assessments
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| patient_id | UUID | FOREIGN KEY → patients, CASCADE |
| assessed_by | UUID | NOT NULL |
| assessment_type | VARCHAR(50) | NOT NULL |
| findings | TEXT | NOT NULL |
| pain_scale | INTEGER | NULLABLE |
| notes | TEXT | NULLABLE |
| assessed_at | TIMESTAMP | DEFAULT now() |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

**Indexes:** (patient_id, assessed_at)

#### nursing_tasks
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| patient_id | UUID | FOREIGN KEY → patients, CASCADE |
| assigned_to | UUID | NULLABLE |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | NULLABLE |
| priority | VARCHAR(20) | DEFAULT 'medium' |
| status | VARCHAR(20) | DEFAULT 'pending' |
| due_date | TIMESTAMP | NULLABLE |
| completed_at | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

**Indexes:** (patient_id, status)

### Handover Management

#### handovers
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| patient_id | UUID | FOREIGN KEY → patients, RESTRICT |
| outgoing_nurse_id | UUID | FOREIGN KEY → users, RESTRICT |
| incoming_nurse_id | UUID | FOREIGN KEY → users, SET NULL |
| shift_id | UUID | FOREIGN KEY → shifts, RESTRICT |
| status | VARCHAR(30) | DEFAULT 'DRAFT' |
| completeness_score | INTEGER | NULLABLE |
| submitted_at | TIMESTAMP | NULLABLE |
| received_at | TIMESTAMP | NULLABLE |
| accepted_at | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

**Indexes:** (patient_id, status), (outgoing_nurse_id, status), (incoming_nurse_id, status)

#### handover_sections
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| handover_id | UUID | FOREIGN KEY → handovers, CASCADE |
| section_type | VARCHAR(20) | NOT NULL |
| content | TEXT | NOT NULL |
| is_complete | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

**Constraints:** UNIQUE(handover_id, section_type)

#### handover_versions
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| handover_id | UUID | FOREIGN KEY → handovers, CASCADE |
| version | INTEGER | DEFAULT 1 |
| snapshot | JSONB | NOT NULL |
| created_by | UUID | NOT NULL |
| created_at | TIMESTAMP | DEFAULT now() |

#### handover_events
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| handover_id | UUID | FOREIGN KEY → handovers, CASCADE |
| event_type | VARCHAR(50) | NOT NULL |
| user_id | UUID | NOT NULL |
| details | JSONB | NULLABLE |
| created_at | TIMESTAMP | DEFAULT now() |

**Indexes:** (handover_id, created_at)

#### handover_clarifications
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| handover_id | UUID | FOREIGN KEY → handovers, CASCADE |
| requested_by | UUID | NOT NULL |
| question | TEXT | NOT NULL |
| response | TEXT | NULLABLE |
| responded_by | UUID | NULLABLE |
| status | VARCHAR(20) | DEFAULT 'pending' |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

**Indexes:** (handover_id, status)

### Notifications

#### notifications
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | FOREIGN KEY → users, CASCADE |
| type | VARCHAR(50) | NOT NULL |
| title | VARCHAR(255) | NOT NULL |
| message | TEXT | NOT NULL |
| is_read | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | DEFAULT now() |

**Indexes:** (user_id, is_read)

### Audit Logging

#### audit_logs
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | FOREIGN KEY → users, SET NULL |
| action | VARCHAR(50) | NOT NULL |
| entity | VARCHAR(50) | NOT NULL |
| entity_id | UUID | NULLABLE |
| details | JSONB | NULLABLE |
| ip_address | VARCHAR(45) | NULLABLE |
| created_at | TIMESTAMP | DEFAULT now() |

**Indexes:** (user_id, created_at), (entity, entity_id)

### Research Module

#### research_studies
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | NULLABLE |
| status | VARCHAR(20) | DEFAULT 'draft' |
| start_date | TIMESTAMP | NULLABLE |
| end_date | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

#### research_participants
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| study_id | UUID | FOREIGN KEY → research_studies, CASCADE |
| user_id | UUID | FOREIGN KEY → users, CASCADE |
| enrolled_at | TIMESTAMP | DEFAULT now() |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

**Constraints:** UNIQUE(study_id, user_id)

#### research_surveys
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| study_id | UUID | FOREIGN KEY → research_studies, CASCADE |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | NULLABLE |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

#### survey_questions
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| survey_id | UUID | FOREIGN KEY → research_surveys, CASCADE |
| question | TEXT | NOT NULL |
| question_type | VARCHAR(20) | NOT NULL |
| options | JSONB | NULLABLE |
| is_required | BOOLEAN | DEFAULT true |
| order_index | INTEGER | NOT NULL |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | AUTO-UPDATE |

#### survey_responses
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| survey_id | UUID | FOREIGN KEY → research_surveys, CASCADE |
| question_id | UUID | FOREIGN KEY → survey_questions, CASCADE |
| participant_id | UUID | FOREIGN KEY → research_participants, CASCADE |
| answer | JSONB | NOT NULL |
| created_at | TIMESTAMP | DEFAULT now() |

#### research_metrics
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| study_id | UUID | FOREIGN KEY → research_studies, CASCADE |
| metric_name | VARCHAR(100) | NOT NULL |
| metric_value | JSONB | NOT NULL |
| period | VARCHAR(50) | NULLABLE |
| recorded_at | TIMESTAMP | DEFAULT now() |
| created_at | TIMESTAMP | DEFAULT now() |

**Indexes:** (study_id, metric_name)
