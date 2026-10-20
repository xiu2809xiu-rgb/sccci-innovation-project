-- The Employees page filters by department and sorts by name, department or hire date.
-- DropIndex
DROP INDEX "employees_familyName_givenName_idx";

-- CreateIndex
CREATE INDEX "employees_departmentCode_fullNameLatin_idx" ON "employees"("departmentCode", "fullNameLatin");

-- CreateIndex
CREATE INDEX "employees_fullNameLatin_idx" ON "employees"("fullNameLatin");

-- CreateIndex
CREATE INDEX "employees_hireDate_idx" ON "employees"("hireDate");
