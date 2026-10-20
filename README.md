# SCCCI Integration Platform (POC)

A proof-of-concept integration and workflow-automation layer for connecting
existing HR and administration systems. The goal is to keep source systems in
place and add subsidiaries through independent connectors and configuration,
not changes to the core.

The canonical data model and initial database migration are documented in
[`docs/schema.md`](./docs/schema.md). Connector implementations, HR workflows,
and access-control enforcement are not included yet.

## Run with Docker Compose

Requirements: Docker Desktop (or Docker Engine) with the Compose plugin.

From the repository root:

```sh
docker compose up --build
```

The API is available at <http://localhost:8000>; its health endpoint is
<http://localhost:8000/health>. PostgreSQL is available on port `5432` for local
development. The Compose database credentials are for local POC use only and
must not be reused in a deployed environment.

Apply the initial database migration:

```sh
docker compose exec api alembic upgrade head
```

Load either mock employee source, then retrieve the consolidated employee list:

```sh
curl -X POST http://localhost:8000/sync/singapore_hr
curl -X POST http://localhost:8000/sync/hq
curl http://localhost:8000/employees
```

Run the test from another terminal:

```sh
docker compose exec api pytest
```

Stop the services with `Ctrl+C`, or run `docker compose down`. To also remove
the local database volume and its data, run `docker compose down --volumes`.

## Run the API and test locally

Requirements: Python 3.11 or newer, and a running PostgreSQL instance if you
need the database. The health endpoint does not yet query the database.

From the repository root:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload
```

In another terminal, activate the same virtual environment and run:

```sh
pytest backend/tests
```

## Project structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/           # HTTP routes and API wiring
│   │   ├── connectors/   # Connector interface and mock-system adapters
│   │   ├── core/         # Shared database setup and sensitivity labels
│   │   ├── models/       # SQLAlchemy canonical entities
│   │   ├── schemas/      # Pydantic entity schemas
│   │   ├── services/     # Employee synchronization service
│   │   └── main.py       # FastAPI application and health endpoint
│   ├── tests/            # API and application tests
│   ├── alembic/          # Versioned database migrations
│   ├── alembic.ini       # Alembic configuration
│   ├── Dockerfile        # API container image
│   ├── pytest.ini        # Test discovery and backend import path
│   └── requirements.txt  # Python runtime and test dependencies
├── config/
│   └── mappings/         # YAML source-to-canonical employee mappings
├── mock-platforms/       # Synthetic OA, Singapore HR, and HQ source fixtures
├── docs/
│   └── schema.md         # Canonical entity and relationship reference
├── docker-compose.yml    # Local API and PostgreSQL services
└── README.md             # Setup and project documentation
```

The connector and mapping directories are extension points only; they do not
contain implementations or sample business mappings yet. A frontend can be
added as a separate monorepo package when that work begins.
