# Data formats of the client's systems

This page records the formats HuiTong expects from the client's documents and systems, each with the mock that emulates it, so that each one can be confirmed at the briefing call. The formats are written down with the mocks that emulate them; until then this page holds the way a client's sample is tried.

## Trying a client's sample

We ask the client for anonymised samples only: documents and exports with every real name, price and bank detail removed or replaced. When one arrives through the team's data folder, try it on a throwaway stack, so that nothing of it outlives the test:

1. **Check what it holds.** If the file still holds real personal, pricing or bank data, do not try it. Delete your copy and tell the team lead, who has it removed from the data folder and tells the client the same day ([handling confidential material](client/questions-for-client.md#handling-confidential-material)).
2. **Keep the AI on the mock.** Leave `LLM_PROVIDER` at `mock`, the default. A real model would receive parts of the file, and the client has not agreed to send its documents to an AI service. AI coding agents never open the file either.
3. **Start a throwaway stack.** Stop your usual stack with `docker compose stop`, which keeps its data. Then start another under its own project name, with the override that publishes only the web app, on this machine's loopback address, and leaves master data empty:

   ```sh
   docker compose -p huitong-samples -f docker-compose.yml -f infra/docker/compose.samples.yml up --build --detach
   ```

   It has its own database and Redis volumes, so nothing reaches your usual database, and no other machine can reach it. Open `http://localhost:8080` in a private browser window.

4. **Try the file.** Update your branch from `main` first, so that git ignores the file: `git check-ignore -v samples/<file>` names the `/samples/*` rule. Copy the file into [`samples/`](../samples/README.md), then use it where HuiTong reads that kind of file: an export or a spreadsheet through the mapping wizard and a file connector today. Whatever the stack reads stays in its database, the append-only audit log among them.
5. **Delete everything.** Close the private window, delete the file from `samples/`, and remove the throwaway stack with its volumes:

   ```sh
   docker compose -p huitong-samples -f docker-compose.yml -f infra/docker/compose.samples.yml down -v
   ```

   `docker compose start` brings your usual stack back. Take no screenshots on the throwaway stack, and never copy a value from the file into an issue, a pull request, a document or an AI prompt.

Git ignores everything in `samples/` except its README, and Docker builds leave the folder out. The pre-commit hook refuses a commit that would add a file there, the pre-push hook refuses a push whose commits hold one, and CI fails a pull request in which any commit holds one. A pushed branch is public, though. If a sample ever reaches GitHub, tell the team lead at once and follow the steps for a pushed sample under [R-03](grs/grs-by-design.md#data-breach-r-03): a new commit or a force-push alone does not take it off GitHub.
