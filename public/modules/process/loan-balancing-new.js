// Sample loan balancing data
const loanBalancingData = {
    branches: [
        { id: '0101', name: 'Head Office' },
        { id: '0102', name: 'Downtown Branch' }
    ],
    centers: [
        { id: 'C001', name: 'Main Center' },
        { id: 'C002', name: 'Secondary Center' }
    ],
    schemes: [
        { id: 'S001', name: 'Group Loan Scheme' },
        { id: 'S002', name: 'Individual Loan Scheme' }
    ],
    members: [
        { id: 'M001', name: 'Member One' },
        { id: 'M002', name: 'Member Two' }
    ]
};

let balancingConfig = {
    type: '',
    branchId: '0101',
    branchName: 'Head Office',
    centerId: '',
    centerName: '',
    schemeId: '',
    schemeName: '',
    memberId: '',
    memberName: ''
};

function initializeLoanBalancing() {
    setupEventListeners();
}

function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toUpperCase() === 'P') {
            handleProcess();
        }
    });
}

function handleBalancingTypeChange() {
    const type = document.getElementById('balancingType').value;
    balancingConfig.type = type;
    
    if (type === '--Select--' || type === '') {
        document.getElementById('centerId').disabled = true;
        document.getElementById('memberId').disabled = true;
    } else if (type === 'Group') {
        document.getElementById('centerId').disabled = false;
        document.getElementById('memberId').disabled = true;
        document.getElementById('memberId').value = '';
        document.getElementById('memberName').value = '';
    } else if (type === 'Individual') {
        document.getElementById('centerId').disabled = false;
        document.getElementById('memberId').disabled = false;
    }
    
    showStatus(`Balancing type changed to '${type}'`, 'info');
}

function handleBranchSearch() {
    showStatus('Branch search is a UI stub in this prototype', 'info');
}

function handleCenterSearch() {
    showStatus('Center search is a UI stub in this prototype', 'info');
}

function handleSchemeSearch() {
    showStatus('Scheme search is a UI stub in this prototype', 'info');
}

function handleMemberSearch() {
    showStatus('Member search is a UI stub in this prototype', 'info');
}

function handleProcess() {
    const type = document.getElementById('balancingType').value;
    const branchId = document.getElementById('branchId').value.trim();
    
    if (type === '--Select--' || type === '') {
        showStatus('Please select a Balancing Type', 'error');
        document.getElementById('balancingType').focus();
        return;
    }
    
    if (!branchId) {
        showStatus('Please select a Branch', 'error');
        document.getElementById('branchId').focus();
        return;
    }
    
    if (type === 'Group') {
        const centerId = document.getElementById('centerId').value.trim();
        if (!centerId) {
            showStatus('Please select a Center for Group balancing', 'error');
            document.getElementById('centerId').focus();
            return;
        }
    } else if (type === 'Individual') {
        const centerId = document.getElementById('centerId').value.trim();
        const memberId = document.getElementById('memberId').value.trim();
        
        if (!centerId) {
            showStatus('Please select a Center', 'error');
            document.getElementById('centerId').focus();
            return;
        }
        
        if (!memberId) {
            showStatus('Please select a Member for Individual balancing', 'error');
            document.getElementById('memberId').focus();
            return;
        }
    }
    
    balancingConfig.type = type;
    balancingConfig.branchId = document.getElementById('branchId').value;
    balancingConfig.centerId = document.getElementById('centerId').value;
    balancingConfig.schemeId = document.getElementById('schemeId').value;
    balancingConfig.memberId = document.getElementById('memberId').value;
    
    showStatus(`Loan ${type} balancing process initiated for ${balancingConfig.branchName}`, 'success');
}

function handleCancel() {
    document.getElementById('balancingType').value = '--Select--';
    document.getElementById('branchId').value = '0101';
    document.getElementById('branchName').value = 'Head Office';
    document.getElementById('centerId').value = '';
    document.getElementById('centerName').value = '';
    document.getElementById('schemeId').value = '';
    document.getElementById('schemeName').value = '';
    document.getElementById('memberId').value = '';
    document.getElementById('memberName').value = '';
    
    balancingConfig = {
        type: '',
        branchId: '0101',
        branchName: 'Head Office',
        centerId: '',
        centerName: '',
        schemeId: '',
        schemeName: '',
        memberId: '',
        memberName: ''
    };
    
    document.getElementById('centerId').disabled = true;
    document.getElementById('memberId').disabled = true;
    
    showStatus('Loan balancing cancelled', 'info');
}

function showStatus(message, type = 'info') {
    const statusMsg = document.getElementById('statusMsg');
    statusMsg.textContent = message;
    statusMsg.className = `status-message show status-${type}`;
    
    setTimeout(() => {
        statusMsg.classList.remove('show');
    }, 4000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeLoanBalancing);

// Add the input-group-icon styling
const style = document.createElement('style');
style.textContent = `
    .input-group-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin-left: -35px;
        color: var(--text-gray);
        cursor: pointer;
        transition: color 0.3s;
    }
    
    .input-group-icon:hover {
        color: var(--primary);
    }
    
    .field-control {
        display: flex;
        align-items: center;
        position: relative;
    }
    
    .field-control input {
        width: 100%;
    }
`;
document.head.appendChild(style);
