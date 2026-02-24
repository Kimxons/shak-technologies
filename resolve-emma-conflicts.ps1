# Resolve Emma merge conflicts systematically

# 1. Accept Emma's version for group-loan-pending-application files (newer implementation)
git checkout --theirs public/modules/group-loan-pending-application/group-loan-pending-application.css
git checkout --theirs public/modules/group-loan-pending-application/group-loan-pending-application.html
git checkout --theirs public/modules/group-loan-pending-application/group-loan-pending-application.js

Write-Host "Resolved group-loan-pending-application files (using Emma's version)" -ForegroundColor Green

# 2. Fix app.js conflicts - keep both Loan Approvals modal AND Credit Score, use Emma's icon for Group Loan Pending
$appJsPath = "public/assets/js/app.js"
$appJs = Get-Content $appJsPath -Raw

# First conflict: add Loan Approvals with modalId, keep Credit Score
$appJs = $appJs -replace '(?s)<<<<<<< HEAD\s+\{ label: "Loan Approvals", icon: "fas fa-thumbs-up" \},\s+\{ label: "Credit Score", icon: "fas fa-chart-line" \},\s+=======\s+\{ label: "Loan Approvals", icon: "fas fa-clipboard-check", modalId: "loanApprovalsModal" \},\s+>>>>>>> origin/Emma',
      '{ label: "Loan Approvals", icon: "fas fa-clipboard-check", modalId: "loanApprovalsModal" },
      { label: "Credit Score", icon: "fas fa-chart-line" },'

# Second conflict: use Emma's icon for Group Loan Pending Application
$appJs = $appJs -replace '(?s)<<<<<<< HEAD\s+\{ label: "Group Loan Pending Application", icon: "fas fa-hourglass-half", modalId: "groupLoanPendingApplicationModal" \},\s+=======\s+\{ label: "Group Loan Pending Application", icon: "fas fa-clipboard-list", modalId: "groupLoanPendingApplicationModal" \},\s+>>>>>>> origin/Emma',
      '{ label: "Group Loan Pending Application", icon: "fas fa-clipboard-list", modalId: "groupLoanPendingApplicationModal" },'

Set-Content $appJsPath -Value $appJs -NoNewline
Write-Host "Resolved app.js conflicts" -ForegroundColor Green

Write-Host "`nAll conflicts resolved. Now manually fix dashboard.html..." -ForegroundColor Yellow
