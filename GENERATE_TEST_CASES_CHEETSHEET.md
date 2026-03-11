# Test Cases Repository

This directory contains test case documentation for all KAIRO modules.

## Directory Structure

```
TestCases/
├── WorkFlowLoan/          # Workflow Loan module test cases
├── MicroFinance/          # MicroFinance module test cases
├── AccountsMaintenance/   # Accounts Maintenance test cases
├── ClientManagement/      # Client Management test cases
└── [Other Modules]/       # Additional module test cases
```

## File Naming Convention

Test case files should follow this naming pattern:
```
Start>[Module]>[SubModule].csv
```

Example:
- `Start>WorkFlowLoan>Loan Application Syndicate.csv`
- `Start>MicroFinance>Group Maintenance.csv`

## Test Case Document Structure

Each test case CSV file should contain the following columns:
1. **Test Case ID** - Unique identifier (e.g., TC_WFL_LAS_001)
2. **Test Case Description** - Brief description of what is being tested
3. **Category** - Type of test (e.g., Functional, UI, Validation, Integration, Business)
4. **Priority** - P1 (Critical), P2 (High), P3 (Medium), P4 (Low)
5. **Preconditions** - Requirements before test execution
6. **Test Steps** - Numbered steps to execute the test
7. **Expected Result** - What should happen when test is successful
8. **Actual Result** - What actually happened (filled during test execution)
9. **Status** - Pass/Fail/Blocked/Not Executed
10. **Tested By** - Name of tester
11. **Test Date** - Date of test execution
12. **Remarks** - Additional notes or defect references

## How to Use

1. **For Developers**: Create a new CSV file in the appropriate module folder when implementing/migrating a module
2. **For Testers**: Open the CSV file in Excel, execute tests, and update Status/Actual Result columns
3. **For QA**: Review test coverage and execution results before module sign-off

## Guidelines

- Keep test cases atomic (one scenario per test case)
- Include both positive and negative test scenarios
- Document edge cases and boundary conditions
- Update test cases when module functionality changes
- Mark test cases as obsolete if functionality is removed
- **Business category** should cover business logic, rules, calculations, and workflow validations specific to banking operations

## Version Control

Test case files are tracked in Git. Please:
- Commit test case documents when creating/updating modules
- Include test case updates in your pull requests
- Reference test case IDs in bug reports and feature documentation
