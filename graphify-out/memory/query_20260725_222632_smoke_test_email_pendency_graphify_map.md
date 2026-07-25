---
type: "query"
date: "2026-07-25T22:26:32.231397+00:00"
question: "Smoke test email pendency Graphify map"
contributor: "graphify"
outcome: "useful"
source_nodes: ["CreatePendencyDialog", "inferPendencyFileType", "ensureBuildingCodeInSubject", "parse-pendency-pdf/index.ts", "pendencyText.ts"]
---

# Q: Smoke test email pendency Graphify map

## Answer

Graphify query surfaced EmailPendencies, CreatePendencyDialog, PendencyDetail, PendencyKanban, pendencyText helpers, pendencyFiles MIME inference, and parse-pendency-pdf helpers. Direct path confirms CreatePendencyDialog calls inferPendencyFileType and ensureBuildingCodeInSubject; explain confirms parse-pendency-pdf contains inferMimeType, decodeBase64Text and compactEmailText.

## Outcome

- Signal: useful

## Source Nodes

- CreatePendencyDialog
- inferPendencyFileType
- ensureBuildingCodeInSubject
- parse-pendency-pdf/index.ts
- pendencyText.ts