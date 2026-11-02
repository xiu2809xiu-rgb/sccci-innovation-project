# Area 2 prompt 002: rejecting a workflow step (OP-WF-04)

Azri, area 2's owner, asked the AI to pull the latest `main`, create a branch and start on an Area 2 task, following the team lead's practices. No #11 story for area 2 existed yet, so the AI proposed the smallest piece of the sales MVP that needs no other area, and Azri approved it.

## Agreed plan

- **Task:** let an approver reject a step and send the work back for correction. This is OP-WF-04 and test A2-T08 in Azri's area 2 plan. Until now the state machine could only move forward.
- **Issue:** part of #30, the open state machine story, until the #11 backlog has an area 2 story for it.
- **Design:**
  - A step that can be rejected names the earlier step a rejection returns to, `onReject: { returnTo }`; a step without it can only be completed.
  - `reject` needs a reason. It closes the task as `DONE` with the outcome `REJECTED`, and starts the return step again with a new task and SLA clock; the work then runs forward again.
  - Each task keeps its outcome (`COMPLETED` or `REJECTED`) beside its status, so the database's task statuses are unchanged.
  - A definition whose rejection returns to the step itself, a later step or no step is refused when it is loaded.
- **Tests first:**
  - a rejection and its return;
  - a full second round to a new approval;
  - refusals: no return rule, no reason, not the current step, not running, a blocked task;
  - bad return rules refused when the definition loads;
  - no change to the input state.
- **Paths:** only area 2's. The shared definition schema gets one optional field (an additive change). No shared files and no database change.

## Review

After the tests passed, three AI reviewers read the change independently, one lens each: correctness, fit with the spec and the rest of the code, and test quality. Their findings were fixed, and a second review checked the fixes, as the team lead does before a pull request. The findings and what changed are in the AI usage log row.
