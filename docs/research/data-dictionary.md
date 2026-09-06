# Data Dictionary

## Research Study

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique study identifier |
| title | VARCHAR(255) | Study title |
| description | TEXT | Study description |
| status | VARCHAR(20) | Study status: `draft`, `active`, `completed`, `archived` |
| start_date | TIMESTAMP | Study start date |
| end_date | TIMESTAMP | Study end date |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record last update timestamp |

## Research Participant

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique participant identifier |
| study_id | UUID | Foreign key to research_studies |
| user_id | UUID | Foreign key to users (internal only) |
| study_code | VARCHAR(50) | De-identified participant code (e.g., N001, S002) |
| role | VARCHAR(20) | Participant role: `NURSE`, `SUPERVISOR` |
| enrolled_at | TIMESTAMP | Enrollment timestamp |
| is_active | BOOLEAN | Whether participant is currently active |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record last update timestamp |

## Research Survey

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique survey identifier |
| study_id | UUID | Foreign key to research_studies |
| title | VARCHAR(255) | Survey title |
| description | TEXT | Survey description |
| is_active | BOOLEAN | Whether survey is currently accepting responses |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record last update timestamp |

## Survey Question

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique question identifier |
| survey_id | UUID | Foreign key to research_surveys |
| question | TEXT | Question text |
| question_type | VARCHAR(20) | Question type: `likert`, `multiple_choice`, `text`, `numeric` |
| options | JSONB | Answer options (for multiple_choice/likert) |
| is_required | BOOLEAN | Whether response is required |
| order_index | INT | Display order |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record last update timestamp |

### Question Type Specifications

#### Likert Scale
```json
{
  "options": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
  "scale": [1, 2, 3, 4, 5]
}
```

#### Multiple Choice
```json
{
  "options": ["Option A", "Option B", "Option C"],
  "allowMultiple": false
}
```

#### Numeric
```json
{
  "min": 0,
  "max": 100,
  "step": 1
}
```

## Survey Response

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique response identifier |
| survey_id | UUID | Foreign key to research_surveys |
| question_id | UUID | Foreign key to survey_questions |
| participant_id | UUID | Foreign key to research_participants |
| answer | JSONB | Response answer |
| created_at | TIMESTAMP | Response submission timestamp |

## Research Metric

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique metric identifier |
| study_id | UUID | Foreign key to research_studies |
| participant_id | UUID | Foreign key to research_participants (nullable for aggregate) |
| metric_name | VARCHAR(100) | Metric identifier |
| metric_value | JSONB | Metric value |
| period | VARCHAR(20) | Intervention period: `pre`, `post` |
| source | VARCHAR(50) | Data source identifier |
| recorded_at | TIMESTAMP | When the metric was recorded |
| created_at | TIMESTAMP | Record creation timestamp |

### Metric Name Specifications

| Metric Name | Value Schema | Unit |
|-------------|-------------|------|
| handover_completeness | `{ "score": 85 }` | Percentage (0-100) |
| handover_duration | `{ "minutes": 12.5 }` | Minutes |
| information_omission | `{ "count": 3, "sections": ["Background"] }` | Count |
| clarification_frequency | `{ "count": 2 }` | Count per handover |
| task_completion | `{ "rate": 88 }` | Percentage (0-100) |
| user_satisfaction | `{ "score": 4.2, "scale": 5 }` | Likert scale |
| usability | `{ "sus_score": 72.5 }` | SUS score (0-100) |
| perceived_usefulness | `{ "score": 3.8, "scale": 5 }` | Likert scale |
