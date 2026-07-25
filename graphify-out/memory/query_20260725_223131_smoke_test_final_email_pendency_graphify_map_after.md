---
type: "path_query"
date: "2026-07-25T22:31:31.669559+00:00"
question: "Smoke test final email pendency Graphify map after install"
contributor: "graphify"
outcome: "useful"
source_nodes: ["CreatePendencyDialog", "ensureBuildingCodeInSubject", "inferPendencyFileType", "pendencyText.ts", "CreatePendencyDialog.tsx"]
---

# Q: Smoke test final email pendency Graphify map after install

## Answer

Graphify final map has 2555 nodes and 6344 edges. CreatePendencyDialog resolves at src/components/pendencies/CreatePendencyDialog.tsx:L37 and directly calls ensureBuildingCodeInSubject at L198 and inferPendencyFileType at L169; this is the key navigation path for email pendency subject/building/file-type debugging.

## Outcome

- Signal: useful

## Source Nodes

- CreatePendencyDialog
- ensureBuildingCodeInSubject
- inferPendencyFileType
- pendencyText.ts
- CreatePendencyDialog.tsx