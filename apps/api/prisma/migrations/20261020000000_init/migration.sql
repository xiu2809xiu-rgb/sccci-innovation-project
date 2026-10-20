-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SYSTEM_ADMIN', 'HR_SG', 'HR_HQ', 'HIRING_MANAGER', 'ADMIN_OPS', 'MANAGEMENT', 'AUDITOR');

-- CreateEnum
CREATE TYPE "DataClassificationLevel" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "MaskReason" AS ENUM ('ROLE_CLEARANCE', 'ENTITY_SCOPE', 'CROSS_BORDER_NOT_APPROVED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'PROBATION', 'ON_LEAVE', 'TERMINATED', 'PRE_HIRE');

-- CreateEnum
CREATE TYPE "ChangeSource" AS ENUM ('SYNC', 'CONFLICT_RESOLUTION', 'MANUAL', 'WORKFLOW');

-- CreateEnum
CREATE TYPE "ConflictStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ConflictResolution" AS ENUM ('SOURCE_SELECTED', 'MANUAL_VALUE');

-- CreateEnum
CREATE TYPE "ConnectorType" AS ENUM ('SG_HR_REST', 'CN_HQ_SAP', 'OA_WEBHOOK', 'FILE_IMPORT', 'NOTIFICATION', 'GENERIC_REST');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('ACTIVE', 'DEGRADED', 'ERROR', 'DISABLED', 'DEPRECATED', 'DRAFT');

-- CreateEnum
CREATE TYPE "MappingConfigStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MappingProposalStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SyncTrigger" AS ENUM ('MANUAL', 'SCHEDULED', 'WEBHOOK', 'BOOTSTRAP');

-- CreateEnum
CREATE TYPE "SyncRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncStage" AS ENUM ('EXTRACT', 'MAP', 'VALIDATE', 'LOAD', 'AUDIT');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkflowInstanceStatus" AS ENUM ('RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'TEAMS', 'DINGTALK', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'EARLY_LEAVE', 'ABSENT', 'ON_LEAVE', 'REMOTE', 'PUBLIC_HOLIDAY');

-- CreateEnum
CREATE TYPE "LeaveCategory" AS ENUM ('ANNUAL', 'SICK', 'HOSPITALISATION', 'CHILDCARE', 'MATERNITY', 'PATERNITY', 'COMPASSIONATE', 'MARRIAGE', 'TIME_OFF_IN_LIEU', 'UNPAID', 'HOME_LEAVE', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveRecordStatus" AS ENUM ('APPROVED', 'PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MappingRuleStatus" AS ENUM ('DRAFT', 'ACTIVE');

-- CreateEnum
CREATE TYPE "ConsolidationRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'NEEDS_REVIEW', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('ACTIVE', 'PENDING_REVIEW', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RetentionAction" AS ENUM ('DELETE', 'ANONYMISE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('MOCK', 'BEDROCK', 'OPENAI');

-- CreateEnum
CREATE TYPE "AiOutcome" AS ENUM ('SUCCESS', 'ERROR', 'INVALID_OUTPUT', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayNameZh" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "homeEntityCode" TEXT NOT NULL,
    "employeeNo" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "rotatedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role" "Role" NOT NULL,
    "permission" TEXT NOT NULL,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role","permission")
);

-- CreateTable
CREATE TABLE "clearance_rules" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "entityCode" TEXT,
    "maxLevel" "DataClassificationLevel" NOT NULL,
    "deniedReason" "MaskReason",
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "clearance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_entities" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_entities_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "departments" (
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employeeNo" TEXT NOT NULL,
    "entityCode" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "givenName" TEXT NOT NULL,
    "fullNameLatin" TEXT NOT NULL,
    "fullNameLocal" TEXT,
    "preferredName" TEXT,
    "workEmail" TEXT NOT NULL,
    "workPhone" TEXT,
    "departmentCode" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "jobTitleZh" TEXT,
    "jobGrade" TEXT,
    "managerEmployeeNo" TEXT,
    "employmentType" "EmploymentType" NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL,
    "hireDate" DATE NOT NULL,
    "terminationDate" DATE,
    "workLocation" TEXT NOT NULL,
    "costCenter" TEXT,
    "dateOfBirth" DATE,
    "baseSalaryAmount" DECIMAL(14,2),
    "baseSalaryCurrency" TEXT,
    "bankName" TEXT,
    "bankAccountLast4" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_records" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "employeeId" TEXT,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL,
    "syncRunId" TEXT,

    CONSTRAINT "source_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_provenance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "value" JSONB,
    "observedAt" TIMESTAMPTZ(3) NOT NULL,
    "isSourceOfTruth" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "field_provenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_changes" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "source" "ChangeSource" NOT NULL,
    "connectorId" TEXT,
    "syncRunId" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_source_policies" (
    "id" TEXT NOT NULL,
    "entityCode" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "connectorId" TEXT,

    CONSTRAINT "field_source_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conflicts" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "openKey" TEXT,
    "candidates" JSONB NOT NULL,
    "status" "ConflictStatus" NOT NULL DEFAULT 'OPEN',
    "detectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedSyncRunId" TEXT,
    "resolution" "ConflictResolution",
    "chosenConnectorId" TEXT,
    "resolvedValue" JSONB,
    "resolutionNote" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connectors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "type" "ConnectorType" NOT NULL,
    "region" TEXT NOT NULL,
    "entityCode" TEXT,
    "baseUrl" TEXT,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'ACTIVE',
    "capabilities" TEXT[],
    "config" JSONB NOT NULL DEFAULT '{}',
    "secretRef" TEXT,
    "lastSyncAt" TIMESTAMPTZ(3),
    "lastHealthCheckAt" TIMESTAMPTZ(3),
    "lastHealthStatus" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapping_configs" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "MappingConfigStatus" NOT NULL,
    "mappings" JSONB NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMPTZ(3),
    "proposalId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mapping_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapping_proposals" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT,
    "sourceSystemName" TEXT NOT NULL,
    "entityCode" TEXT,
    "fileName" TEXT NOT NULL,
    "headers" TEXT[],
    "sampleRowCount" INTEGER NOT NULL,
    "proposals" JSONB NOT NULL,
    "status" "MappingProposalStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "aiUsageRecordId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mapping_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "trigger" "SyncTrigger" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "SyncRunStatus" NOT NULL DEFAULT 'QUEUED',
    "stage" "SyncStage",
    "progress" INTEGER NOT NULL DEFAULT 0,
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "jobId" TEXT,
    "mappingConfigId" TEXT,
    "triggeredByUserId" TEXT,
    "queuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMPTZ(3),
    "finishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_errors" (
    "id" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "externalId" TEXT,
    "stage" "SyncStage" NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_webhook_events" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),
    "error" TEXT,

    CONSTRAINT "inbound_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "status" "WorkflowInstanceStatus" NOT NULL DEFAULT 'RUNNING',
    "currentStepKey" TEXT,
    "sourceSystem" TEXT,
    "sourceRequestId" TEXT,
    "sourceEventId" TEXT,
    "context" JSONB NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_tasks" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleZh" TEXT,
    "assigneeRole" "Role" NOT NULL,
    "assigneeUserId" TEXT,
    "status" "WorkflowTaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "completedByUserId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipientUserId" TEXT,
    "recipientRole" "Role",
    "title" TEXT NOT NULL,
    "titleZh" TEXT,
    "body" TEXT NOT NULL,
    "bodyZh" TEXT,
    "link" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "relatedType" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ(3),
    "readAt" TIMESTAMPTZ(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "employeeNo" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "sourceStatus" TEXT NOT NULL,
    "clockIn" TEXT,
    "clockOut" TEXT,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "importedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_records" (
    "id" TEXT NOT NULL,
    "employeeNo" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceCategory" TEXT NOT NULL,
    "canonicalCategory" "LeaveCategory",
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "days" DECIMAL(5,1) NOT NULL,
    "halfDay" TEXT,
    "status" "LeaveRecordStatus" NOT NULL,
    "importedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_category_mappings" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "sourceCategory" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "canonicalCategory" "LeaveCategory" NOT NULL,
    "templateColumn" TEXT,
    "status" "MappingRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leave_category_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidation_runs" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "entityCodes" TEXT[],
    "status" "ConsolidationRunStatus" NOT NULL DEFAULT 'QUEUED',
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "exceptionCount" INTEGER NOT NULL DEFAULT 0,
    "reportId" TEXT,
    "triggeredByUserId" TEXT,
    "startedAt" TIMESTAMPTZ(3),
    "finishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consolidation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidation_exceptions" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "employeeNo" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consolidation_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "sources" TEXT[],
    "content" JSONB,
    "generatedAt" TIMESTAMPTZ(3),
    "generatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" BIGSERIAL NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "traceId" TEXT,
    "prevHash" TEXT,
    "hash" TEXT NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_classifications" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "level" "DataClassificationLevel" NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionZh" TEXT,
    "isPersonalData" BOOLEAN NOT NULL DEFAULT true,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "data_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_border_transfers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameZh" TEXT,
    "fromEntityCode" TEXT NOT NULL,
    "toEntityCode" TEXT NOT NULL,
    "fromCountry" TEXT NOT NULL,
    "toCountry" TEXT NOT NULL,
    "dataCategories" TEXT[],
    "purpose" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "mechanism" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMPTZ(3),
    "reviewDueAt" TIMESTAMPTZ(3),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cross_border_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL,
    "dataCategory" TEXT NOT NULL,
    "entityCode" TEXT,
    "retentionMonths" INTEGER NOT NULL,
    "action" "RetentionAction" NOT NULL,
    "legalReference" TEXT,
    "lastAppliedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clickstream_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "role" "Role",
    "locale" TEXT,
    "theme" TEXT,
    "viewport" TEXT,
    "properties" JSONB,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clickstream_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_records" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "costEstimateUsd" DECIMAL(12,6) NOT NULL,
    "outcome" "AiOutcome" NOT NULL,
    "userId" TEXT,
    "requestId" TEXT,
    "errorCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeNo_key" ON "users"("employeeNo");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "clearance_rules_role_entityCode_key" ON "clearance_rules"("role", "entityCode");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeNo_key" ON "employees"("employeeNo");

-- CreateIndex
CREATE UNIQUE INDEX "employees_workEmail_key" ON "employees"("workEmail");

-- CreateIndex
CREATE INDEX "employees_entityCode_departmentCode_idx" ON "employees"("entityCode", "departmentCode");

-- CreateIndex
CREATE INDEX "employees_employmentStatus_idx" ON "employees"("employmentStatus");

-- CreateIndex
CREATE INDEX "employees_familyName_givenName_idx" ON "employees"("familyName", "givenName");

-- CreateIndex
CREATE INDEX "employees_managerEmployeeNo_idx" ON "employees"("managerEmployeeNo");

-- CreateIndex
CREATE INDEX "source_records_employeeId_idx" ON "source_records"("employeeId");

-- CreateIndex
CREATE INDEX "source_records_syncRunId_idx" ON "source_records"("syncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "source_records_connectorId_externalId_key" ON "source_records"("connectorId", "externalId");

-- CreateIndex
CREATE INDEX "field_provenance_connectorId_idx" ON "field_provenance"("connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "field_provenance_employeeId_field_connectorId_key" ON "field_provenance"("employeeId", "field", "connectorId");

-- CreateIndex
CREATE INDEX "employee_changes_employeeId_createdAt_idx" ON "employee_changes"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "employee_changes_syncRunId_idx" ON "employee_changes"("syncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "field_source_policies_entityCode_field_key" ON "field_source_policies"("entityCode", "field");

-- CreateIndex
CREATE UNIQUE INDEX "conflicts_openKey_key" ON "conflicts"("openKey");

-- CreateIndex
CREATE INDEX "conflicts_status_detectedAt_idx" ON "conflicts"("status", "detectedAt");

-- CreateIndex
CREATE INDEX "conflicts_employeeId_idx" ON "conflicts"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "mapping_configs_proposalId_key" ON "mapping_configs"("proposalId");

-- CreateIndex
CREATE INDEX "mapping_configs_connectorId_status_idx" ON "mapping_configs"("connectorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mapping_configs_connectorId_version_key" ON "mapping_configs"("connectorId", "version");

-- CreateIndex
CREATE INDEX "mapping_proposals_status_createdAt_idx" ON "mapping_proposals"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sync_runs_idempotencyKey_key" ON "sync_runs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "sync_runs_connectorId_queuedAt_idx" ON "sync_runs"("connectorId", "queuedAt");

-- CreateIndex
CREATE INDEX "sync_runs_status_idx" ON "sync_runs"("status");

-- CreateIndex
CREATE INDEX "sync_errors_syncRunId_idx" ON "sync_errors"("syncRunId");

-- CreateIndex
CREATE INDEX "inbound_webhook_events_status_receivedAt_idx" ON "inbound_webhook_events"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_webhook_events_source_eventId_key" ON "inbound_webhook_events"("source", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_key_version_key" ON "workflow_definitions"("key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_instances_sourceEventId_key" ON "workflow_instances"("sourceEventId");

-- CreateIndex
CREATE INDEX "workflow_instances_status_startedAt_idx" ON "workflow_instances"("status", "startedAt");

-- CreateIndex
CREATE INDEX "workflow_instances_sourceRequestId_idx" ON "workflow_instances"("sourceRequestId");

-- CreateIndex
CREATE INDEX "workflow_tasks_assigneeRole_status_idx" ON "workflow_tasks"("assigneeRole", "status");

-- CreateIndex
CREATE INDEX "workflow_tasks_instanceId_idx" ON "workflow_tasks"("instanceId");

-- CreateIndex
CREATE INDEX "workflow_tasks_status_dueAt_idx" ON "workflow_tasks"("status", "dueAt");

-- CreateIndex
CREATE INDEX "workflow_events_instanceId_createdAt_idx" ON "workflow_events"("instanceId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_recipientUserId_status_idx" ON "notifications"("recipientUserId", "status");

-- CreateIndex
CREATE INDEX "notifications_recipientRole_status_idx" ON "notifications"("recipientRole", "status");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "attendance_records_workDate_idx" ON "attendance_records"("workDate");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_employeeNo_workDate_connectorId_key" ON "attendance_records"("employeeNo", "workDate", "connectorId");

-- CreateIndex
CREATE INDEX "leave_records_employeeNo_startDate_idx" ON "leave_records"("employeeNo", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "leave_records_connectorId_externalId_key" ON "leave_records"("connectorId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "leave_category_mappings_connectorId_sourceCategory_version_key" ON "leave_category_mappings"("connectorId", "sourceCategory", "version");

-- CreateIndex
CREATE UNIQUE INDEX "consolidation_runs_reportId_key" ON "consolidation_runs"("reportId");

-- CreateIndex
CREATE INDEX "consolidation_runs_period_idx" ON "consolidation_runs"("period");

-- CreateIndex
CREATE INDEX "consolidation_exceptions_runId_idx" ON "consolidation_exceptions"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "report_templates_key_version_key" ON "report_templates"("key", "version");

-- CreateIndex
CREATE INDEX "reports_kind_period_idx" ON "reports"("kind", "period");

-- CreateIndex
CREATE UNIQUE INDEX "audit_events_hash_key" ON "audit_events"("hash");

-- CreateIndex
CREATE INDEX "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_events_actorUserId_occurredAt_idx" ON "audit_events"("actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_action_occurredAt_idx" ON "audit_events"("action", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_occurredAt_idx" ON "audit_events"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "data_classifications_entityType_field_key" ON "data_classifications"("entityType", "field");

-- CreateIndex
CREATE INDEX "cross_border_transfers_fromEntityCode_toEntityCode_status_idx" ON "cross_border_transfers"("fromEntityCode", "toEntityCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "retention_policies_dataCategory_entityCode_key" ON "retention_policies"("dataCategory", "entityCode");

-- CreateIndex
CREATE INDEX "clickstream_events_occurredAt_idx" ON "clickstream_events"("occurredAt");

-- CreateIndex
CREATE INDEX "clickstream_events_name_occurredAt_idx" ON "clickstream_events"("name", "occurredAt");

-- CreateIndex
CREATE INDEX "clickstream_events_sessionId_idx" ON "clickstream_events"("sessionId");

-- CreateIndex
CREATE INDEX "ai_usage_records_feature_createdAt_idx" ON "ai_usage_records"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_records_createdAt_idx" ON "ai_usage_records"("createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_homeEntityCode_fkey" FOREIGN KEY ("homeEntityCode") REFERENCES "legal_entities"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_entityCode_fkey" FOREIGN KEY ("entityCode") REFERENCES "legal_entities"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentCode_fkey" FOREIGN KEY ("departmentCode") REFERENCES "departments"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "sync_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_changes" ADD CONSTRAINT "employee_changes_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_source_policies" ADD CONSTRAINT "field_source_policies_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapping_configs" ADD CONSTRAINT "mapping_configs_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapping_configs" ADD CONSTRAINT "mapping_configs_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "mapping_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_errors" ADD CONSTRAINT "sync_errors_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "sync_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_runs" ADD CONSTRAINT "consolidation_runs_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_exceptions" ADD CONSTRAINT "consolidation_exceptions_runId_fkey" FOREIGN KEY ("runId") REFERENCES "consolidation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "report_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
