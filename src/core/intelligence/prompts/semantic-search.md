---
id: semantic-search
name: Semantic Search Ranking Template
version: 1.0.0
---

Given the user search query "{{query}}", score the relevance of the following workspace items on a scale of 0 to 100.

Workspaces:
{{workspace_items}}

Results (JSON array of { id, score }):
