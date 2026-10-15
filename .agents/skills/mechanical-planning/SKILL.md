---
name: mechanical-planning
description: >-
  Standard for generating deterministic, token-efficient Mechanical Execution Plans (MEP).
  Use when the user requests /plan, prepares a plan for /goal, delegates execution to
  lower-tier models or subagents, or asks for mechanical, cost-effective step-by-step instructions.
---

# Mechanical Execution Planning (MEP)

Transform architectural and aesthetic intent into deterministic, pre-decided execution recipes. Downstream execution agents (including lower-tier models or long-running `/goal` tasks) must not be forced to make creative, subjective, or architectural choices during execution.

## Core Rules for Token Economy

1. **Pre-Decide Everything Upfront**: Never write instructions like "add appropriate styles" or "refactor where needed". Make every decision in the planning phase so execution uses zero reasoning tokens.
2. **Apply the 300-Line Tool Strategy**:
   - Files < 300 lines: Plan as `write_to_file` (with `Overwrite: true`). Takes 1 tool step and prevents multi-step line-drift inspection loops.
   - Files > 300 lines: Plan as `replace_file_content` or `multi_replace_file_content` with verified target strings and line numbers.
3. **Strict Numerical Ordering**: Order operations by dependency (config -> utilities -> components -> layout -> styles).
4. **Explicit Tool Payloads**: Provide the exact tool parameters in JSON blocks so a runner model can invoke tools mechanically without guessing.

## Plan Structure Schema

Every mechanical plan must follow this template:

### 1. File Manifest Table
| Op # | Target File | Tool | Action Summary |
|:---|:---|:---|:---|
| **1** | `vite.config.js` | `replace_file_content` | Add vendor chunk splitting |
| **2** | `src/components/Lightbox.jsx` | `write_to_file` | Rewrite with docked notes panel (overwrite) |

### 2. Operational Specification Blocks
```markdown
### OPERATION N: <filename> — <short description>
**Tool**: `replace_file_content` | `multi_replace_file_content` | `write_to_file`
**File**: `/absolute/path/to/file`

```json
{
  "TargetFile": "/absolute/path/to/file",
  "Instruction": "Exact instruction",
  "Description": "Non-obvious design rationale",
  "AllowMultiple": false,
  "StartLine": 45,
  "EndLine": 55,
  "TargetContent": "exact lines to match",
  "ReplacementContent": "exact replacement lines"
}
```
```

### 3. Verification Checklist & Gate
Specify exact automated test and verification commands:
- Build check: `npm run build`
- Functional checklist: Specific assertions the agent must confirm before reporting completion.
