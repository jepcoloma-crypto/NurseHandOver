# Export Specification

## Overview

The research export system generates de-identified datasets for statistical analysis. All exports use **study codes** instead of personal identifiers.

## Export Endpoints

### CSV Export

```
GET /api/v1/research/studies/:studyId/export/csv?type=metrics|surveys
```

### XLSX Export (JSON format)

```
GET /api/v1/research/studies/:studyId/export/xlsx?type=metrics|surveys
```

## Authentication

All export endpoints require:
- Valid JWT token
- `SUPERVISOR` or `ADMINISTRATOR` role
- Access to the specified study

## CSV Export Formats

### Metrics Export (`type=metrics`)

**Headers:**
```
study_code,metric_name,metric_value,period,source,recorded_at
```

**Example:**
```csv
study_code,metric_name,metric_value,period,source,recorded_at
P-a1b2c3d4,handover_completeness,"{""score"": 85}",pre,system,2026-01-15T10:30:00.000Z
P-a1b2c3d4,handover_completeness,"{""score"": 92}",post,system,2026-02-15T10:30:00.000Z
P-e5f6g7h8,handover_duration,"{""minutes"": 15.2}",pre,system,2026-01-15T11:00:00.000Z
```

**Fields:**
| Field | Description |
|-------|-------------|
| study_code | De-identified participant code or `aggregate` for study-level metrics |
| metric_name | Metric identifier (see data-dictionary.md) |
| metric_value | JSON-encoded metric value |
| period | `pre` or `post` |
| source | Data source (system, manual, survey) |
| recorded_at | ISO 8601 timestamp |

### Survey Export (`type=surveys`)

**Headers:**
```
study_code,question,question_type,answer,recorded_at
```

**Example:**
```csv
study_code,question,question_type,answer,recorded_at
N001,"The handover was complete and thorough",likert,"{""value"": 4}",2026-01-20T14:00:00.000Z
N001,"Please describe any challenges",text,"{""value"": ""Time pressure during shift change""}",2026-01-20T14:05:00.000Z
S002,"The handover was complete and thorough",likert,"{""value"": 5}",2026-01-20T14:10:00.000Z
```

**Fields:**
| Field | Description |
|-------|-------------|
| study_code | De-identified participant code |
| question | Survey question text |
| question_type | `likert`, `multiple_choice`, `text`, `numeric` |
| answer | JSON-encoded response |
| recorded_at | ISO 8601 timestamp |

## XLSX Export

The XLSX export returns data in a JSON format compatible with spreadsheet applications:

```json
{
  "format": "xlsx-compatible-json",
  "data": [
    {
      "Study Code": "P-a1b2c3d4",
      "Metric Name": "handover_completeness",
      "Metric Value": "{\"score\": 85}",
      "Period": "pre",
      "Source": "system",
      "Recorded At": "2026-01-15T10:30:00.000Z"
    }
  ]
}
```

## De-identification Rules

1. **Study Codes**: Participants are identified by `study_code` (e.g., N001, S002)
2. **No Personal Identifiers**: Names, emails, and user IDs are excluded from exports
3. **Aggregate Metrics**: Metrics without a participant use `aggregate` as the study code
4. **Consistent Coding**: The same participant always uses the same study code within a study

## Data Preparation for Analysis

### Recommended Workflow

1. **Export**: Download CSV or XLSX data from the system
2. **Import**: Load into R, Python, SPSS, or Excel
3. **Clean**: Handle missing values, validate data types
4. **Analyze**: Apply appropriate statistical tests
5. **Report**: Document findings with confidence intervals and effect sizes

### R Example

```r
# Load metrics data
metrics <- read.csv("study-abc-metrics.csv")

# Reshape for pre/post comparison
library(tidyr)
pre <- metrics[metrics$period == "pre", ]
post <- metrics[metrics$period == "post", ]
merged <- merge(pre, post, by = "study_code", suffixes = c("_pre", "_post"))

# Paired t-test
t.test(merged$metric_value_pre, merged$metric_value_post, paired = TRUE)
```

### Python Example

```python
import pandas as pd
from scipy import stats

# Load data
df = pd.read_csv("study-abc-metrics.csv")

# Filter for specific metric
completeness = df[df['metric_name'] == 'handover_completeness']

# Pivot pre/post
pre = completeness[completeness['period'] == 'pre']['metric_value'].apply(pd.Series)['score']
post = completeness[completeness['period'] == 'post']['metric_value'].apply(pd.Series)['score']

# Paired t-test
stat, p_value = stats.ttest_rel(pre, post)
```

## Limitations

- This system provides **raw data only** — no statistical inference is performed
- Missing data must be handled by the analyst
- Sample sizes should be validated before analysis
- Effect sizes and confidence intervals should be computed by the researcher
