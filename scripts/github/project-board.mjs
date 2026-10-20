// Sets up the GitHub Projects board for seed-backlog.mjs: a project linked to
// the repository, with a Sprint iteration field (one week per module week), an
// Estimate number field and an Area field, and every epic and story on it.
// Needs a token with the `project` scope (gh auth refresh -s project).
import { SPRINTS } from './backlog.mjs';
import { api } from './gh.mjs';
import { sprintDates, sprintTitle } from './sprints.mjs';

const AREAS = [
  { label: 'area: 1 integration core', name: '1 Integration core', color: 'GREEN' },
  { label: 'area: 2 workflow automation', name: '2 Workflow automation', color: 'BLUE' },
  {
    label: 'area: 3 attendance and reporting',
    name: '3 Attendance and reporting',
    color: 'ORANGE',
  },
  {
    label: 'area: 4 governance and monitoring',
    name: '4 Governance and monitoring',
    color: 'PURPLE',
  },
  { label: 'area: team', name: 'Team', color: 'GRAY' },
];

function graphql(query, variables = {}) {
  const reply = api('graphql', { method: 'POST', body: { query, variables } });
  if (reply?.errors?.length) {
    throw new Error(reply.errors.map((error) => error.message).join('; '));
  }
  return reply.data;
}

function findOrCreateProject(repo, title) {
  const [owner, name] = repo.split('/');
  const { repository, viewer } = graphql(
    `
      query ($owner: String!, $name: String!) {
        viewer {
          id
          projectsV2(first: 50) {
            nodes {
              id
              number
              title
            }
          }
        }
        repository(owner: $owner, name: $name) {
          id
        }
      }
    `,
    { owner, name },
  );
  const existing = viewer.projectsV2.nodes.find((project) => project.title === title);
  if (existing) return existing;
  const { createProjectV2 } = graphql(
    `
      mutation ($ownerId: ID!, $title: String!, $repositoryId: ID!) {
        createProjectV2(input: { ownerId: $ownerId, title: $title, repositoryId: $repositoryId }) {
          projectV2 {
            id
            number
            title
          }
        }
      }
    `,
    { ownerId: viewer.id, title, repositoryId: repository.id },
  );
  console.log(`created project "${title}"`);
  return createProjectV2.projectV2;
}

function fieldsOf(projectId) {
  const { node } = graphql(
    `
      query ($id: ID!) {
        node(id: $id) {
          ... on ProjectV2 {
            fields(first: 50) {
              nodes {
                ... on ProjectV2FieldCommon {
                  id
                  name
                  dataType
                }
                ... on ProjectV2SingleSelectField {
                  options {
                    id
                    name
                  }
                }
                ... on ProjectV2IterationField {
                  configuration {
                    iterations {
                      id
                      title
                      startDate
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
    { id: projectId },
  );
  return new Map(node.fields.nodes.map((field) => [field.name, field]));
}

function createField(projectId, input) {
  graphql(
    `
      mutation ($input: CreateProjectV2FieldInput!) {
        createProjectV2Field(input: $input) {
          projectV2Field {
            ... on ProjectV2FieldCommon {
              id
            }
          }
        }
      }
    `,
    { input: { projectId, ...input } },
  );
  console.log(`created field "${input.name}"`);
}

function ensureFields(projectId) {
  let fields = fieldsOf(projectId);
  if (!fields.has('Sprint')) {
    createField(projectId, {
      dataType: 'ITERATION',
      name: 'Sprint',
      iterationConfiguration: {
        startDate: sprintDates(1).start,
        duration: 7,
        iterations: SPRINTS.map((sprint) => ({
          title: sprintTitle(sprint.number),
          startDate: sprintDates(sprint.number).start,
          duration: 7,
        })),
      },
    });
  }
  if (!fields.has('Estimate')) createField(projectId, { dataType: 'NUMBER', name: 'Estimate' });
  if (!fields.has('Area')) {
    createField(projectId, {
      dataType: 'SINGLE_SELECT',
      name: 'Area',
      singleSelectOptions: AREAS.map((area) => ({
        name: area.name,
        color: area.color,
        description: area.label,
      })),
    });
  }
  fields = fieldsOf(projectId);
  return fields;
}

function setField(projectId, itemId, fieldId, value) {
  graphql(
    `
      mutation ($input: UpdateProjectV2ItemFieldValueInput!) {
        updateProjectV2ItemFieldValue(input: $input) {
          projectV2Item {
            id
          }
        }
      }
    `,
    { input: { projectId, itemId, fieldId, value } },
  );
}

/** Puts every epic and story on the board and fills in its sprint, estimate, area and status. */
export function setUpProject({ repo, title, epics, stories }) {
  const project = findOrCreateProject(repo, title);
  const fields = ensureFields(project.id);
  const sprint = fields.get('Sprint');
  const estimate = fields.get('Estimate');
  const area = fields.get('Area');
  const status = fields.get('Status');
  const iterationFor = (number) =>
    sprint?.configuration?.iterations.find((iteration) => iteration.title === sprintTitle(number))
      ?.id;
  const optionFor = (field, name) => field?.options?.find((option) => option.name === name)?.id;

  const add = (issue) =>
    graphql(
      `
        mutation ($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
            item {
              id
            }
          }
        }
      `,
      { projectId: project.id, contentId: issue.node_id },
    ).addProjectV2ItemById.item.id;

  for (const [, epic] of epics) {
    if (epic) add(epic);
  }
  for (const { story, issue, epic } of stories) {
    const itemId = add(issue);
    const iterationId = iterationFor(story.sprint);
    if (sprint && iterationId) setField(project.id, itemId, sprint.id, { iterationId });
    if (estimate) setField(project.id, itemId, estimate.id, { number: story.points });
    const areaName = AREAS.find((entry) => entry.label === epic.area)?.name;
    const areaOption = areaName ? optionFor(area, areaName) : undefined;
    if (areaOption) setField(project.id, itemId, area.id, { singleSelectOptionId: areaOption });
    const statusOption = optionFor(status, issue.state === 'closed' ? 'Done' : 'Todo');
    if (statusOption)
      setField(project.id, itemId, status.id, { singleSelectOptionId: statusOption });
  }
  console.log(
    `project "${title}" has ${String(stories.length)} stories and ${String(epics.size)} epics`,
  );
}
