# Client sample exports

This folder is where the client's sample exports go, to be tried locally and then deleted. We asked the client for structure only: headers, code lists, blank templates and a few dummy rows. A file that holds real personal data is not tried at all: delete it and tell the team lead, who tells the client the same day.

Git ignores everything in this folder except this README, and Docker builds leave it out. The pre-commit hook refuses a commit that would add a file here, the pre-push hook refuses a push whose commits hold one, and CI fails a pull request in which any commit holds one.

- **Where they come from:** the team's data folder, never email or chat.
- **How to try one:** follow [trying a client's sample export](../docs/data-formats.md#trying-a-clients-sample-export). The AI provider stays on the mock, the file goes through a throwaway stack that only your machine can reach, and the file and that stack are deleted afterwards. The formats to expect are on the same page.
- **What never happens:** a value from the file copied into an issue, a pull request, a document, a screenshot or an AI prompt, or the file opened by an AI coding agent.

The synthetic files the app ships, such as the Malaysia sample, live in [`apps/web/public/samples/`](../apps/web/public/samples/), not here.
