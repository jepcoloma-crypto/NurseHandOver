# Research Evaluation Framework

## Overview

This document describes the research evaluation framework for the NurseHandOver system. The framework is designed to support rigorous pre/post intervention studies evaluating the impact of structured handover systems on clinical outcomes.

## Research Design

### Study Types Supported

- **Pre/Post Intervention**: Compare metrics before and after system implementation
- **Longitudinal**: Track metrics over time within a study period
- **Cross-Sectional**: Capture snapshots at defined intervals

### Data Collection Methods

1. **Automated Metrics**: System-generated data (completeness scores, durations, task completion rates)
2. **Survey Instruments**: Participant-administered surveys for subjective measures
3. **Event Tracking**: System logs capturing handover events, clarifications, and task transitions

## Evaluation Metrics

### Clinical Metrics

| Metric | Description | Data Source | Measurement |
|--------|-------------|-------------|-------------|
| Handover Completeness | Percentage of SBAR sections completed | System | Numeric (0-100) |
| Handover Duration | Time from handover creation to acceptance | System | Minutes |
| Information Omission | Critical information missing from handover | System/Survey | Count/Scale |
| Clarification Frequency | Number of clarification requests per handover | System | Count |
| Task Completion | Percentage of assigned tasks completed | System | Numeric (0-100) |

### Usability Metrics

| Metric | Description | Data Source | Measurement |
|--------|-------------|-------------|-------------|
| User Satisfaction | Overall satisfaction with the system | Survey | Likert (1-5) |
| Usability | Ease of use and learnability | Survey | SUS / Likert |
| Perceived Usefulness | Perceived impact on handover quality | Survey | Likert (1-5) |

## Study Workflow

1. **Create Study**: Define title, description, and date range
2. **Enroll Participants**: Assign study codes to participants (de-identified)
3. **Configure Surveys**: Create pre/post intervention surveys
4. **Collect Metrics**: Record automated and manual metrics
5. **Export Data**: Generate de-identified datasets for analysis

## Privacy and Ethics

- All participants are identified by **study codes**, not personal identifiers
- Personal information (names, emails) is stored separately from research data
- Export datasets contain only de-identified data
- Researchers access data through authorized endpoints only
- Audit logs track all data access

## Statistical Analysis

This system provides **clean research datasets** only. Statistical inference should be performed using approved methodology in external tools (R, SPSS, Python/statsmodels).

### Recommended Analyses

- **Pre/Post Comparison**: Paired t-tests, Wilcoxon signed-rank tests
- **Trend Analysis**: Linear regression, time series analysis
- **Correlation**: Pearson/Spearman correlation between metrics
- **Group Comparison**: ANOVA, Mann-Whitney U tests
