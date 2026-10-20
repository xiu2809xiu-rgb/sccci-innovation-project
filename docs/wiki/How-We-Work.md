# How we work

One sprint is one module week, Monday to Sunday. The backlog, the board and the code reviews are all in GitHub.

## Each week

| When              | What                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| Start of the week | **Sprint planning:** pull ready stories into the sprint and assign them |
| Every working day | **Stand-up** in the team chat: yesterday, today, blockers               |
| Mid-week          | **Refinement:** split and estimate next sprint's stories                |
| End of the week   | **Review** of merged work, then a short **retrospective**               |

## From a story to main

1. Assign yourself a story from the sprint and move it to **In Progress** on the board.
2. Branch from an up-to-date `main`: one task per branch, named `feat/<area>-<description>`, `fix/…`, `docs/…`, `chore/…`, `ci/…` or `test/…`.
3. Commit in small [Conventional Commits](https://www.conventionalcommits.org/).
4. Open a pull request with the template: `Closes #<story>`, the acceptance criteria with their evidence, and screenshots for UI changes.
5. Wait for green checks (CI, CodeQL, dependency review, Trivy) and a review from the code owner.
6. Merge with a merge commit; the story closes itself. Everyone pulls `main` before their next branch.

## Where the details are

- [Working agreement](https://github.com/xiu2809xiu-rgb/sccci-innovation-project/blob/main/docs/agile/working-agreement.md): roles, ceremonies, the board and WIP limits.
- [Definition of Ready and Done](https://github.com/xiu2809xiu-rgb/sccci-innovation-project/blob/main/docs/agile/definition-of-ready-and-done.md).
- [Backlog](https://github.com/xiu2809xiu-rgb/sccci-innovation-project/blob/main/docs/agile/backlog.md) and the **HuiTong delivery** project board.
