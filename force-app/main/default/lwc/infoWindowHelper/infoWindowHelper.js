/**
 * Builds HTML description for account marker
 * Matches legacy VF implementation exactly
 * @param {Object} account - Account record with all fields
 * @returns {string} HTML string for marker description
 */
export function buildMarkerDescription(account) {
    return buildPanelDescription(account);
}

/**
 * Formats account address
 * @param {Object} account 
 * @returns {string}
 */
function formatAddress(account) {
    if (!account?.BillingAddress) return 'N/A';
    
    const addr = account.BillingAddress;
    const parts = [];
    
    if (addr.street) parts.push(addr.street);
    if (addr.postalCode || addr.city) {
        parts.push(`${addr.postalCode || ''} ${addr.city || ''}`.trim());
    }
    if (addr.country) parts.push(addr.country);
    
    return parts.join(', ') || 'N/A';
}

/**
 * Gets legal hierarchy with sum of POS
 * @param {Object} account 
 * @returns {string}
 */
function getLegalHierarchy(account) {
    if (!account?.Customer_Hierarchy_2_Description__r) return 'n/a';
    
    const hierarchy = account.Customer_Hierarchy_2_Description__r;
    let result = hierarchy.Name;
    
    if (hierarchy.Sum_of_POS__c !== undefined && hierarchy.Sum_of_POS__c !== null) {
        result += ` (${hierarchy.Sum_of_POS__c})`;
    } else {
        result += ' (n/a)';
    }
    
    return result;
}

/**
 * Gets business hierarchy with sum of POS
 * @param {Object} account 
 * @returns {string}
 */
function getBusinessHierarchy(account) {
    if (!account?.Pricing_Terms_Descripton__r) return 'n/a';
    
    const hierarchy = account.Pricing_Terms_Descripton__r;
    let result = hierarchy.Name;
    
    if (hierarchy.Sum_of_POS__c !== undefined && hierarchy.Sum_of_POS__c !== null) {
        result += ` (${hierarchy.Sum_of_POS__c})`;
    } else {
        result += ' (n/a)';
    }
    
    return result;
}

/**
 * Formats date for display
 * @param {string} dateValue 
 * @returns {string}
 */
export function formatDate(dateValue) {
    if (!dateValue) return 'n/a';
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'n/a';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Creates simplified description for mobile or small screens
 * @param {Object} account 
 * @returns {string}
 */
export function buildSimpleDescription(account) {
    if (!account) return '';
    
    const parts = [];
    
    parts.push(`<strong>${account.Name}</strong>`);
    parts.push(`Customer #: ${account.Bill_to_Number__c || 'N/A'}`);
    parts.push(`Address: ${formatAddress(account)}`);
    parts.push(`Territory: ${account.Territory__r?.Name || 'N/A'}`);
    parts.push(`Phone: ${account.Phone || 'N/A'}`);
    
    if (account.Last_Sales_Visit__c) {
        parts.push(`Last Sales Visit: ${formatDate(account.Last_Sales_Visit__c)}`);
    }
    if (account.Planned_next_Sales_Visit__c) {
        parts.push(`Next Sales Visit: ${formatDate(account.Planned_next_Sales_Visit__c)}`);
    }
    
    return parts.join('<br>');
}

/**
 * Builds cluster description for multiple accounts
 * @param {Array} accounts 
 * @returns {string}
 */
export function buildClusterDescription(accounts) {
    if (!accounts || accounts.length === 0) return '';
    
    const html = [];
    
    html.push(`<strong>${accounts.length} Accounts in this area:</strong><br><br>`);
    
    // Show first 5 accounts
    accounts.slice(0, 5).forEach(account => {
        html.push(`• ${account.Name}<br>`);
    });
    
    if (accounts.length > 5) {
        html.push(`<br>...and ${accounts.length - 5} more`);
    }
    
    return html.join('');
}

/**
 * Attaches event listeners to action buttons in info window
 * Must be called after info window is rendered in DOM
 * @param {HTMLElement} container 
 * @param {Function} onCreateEvent - Callback for create event action
 */
export function attachInfoWindowListeners(container, onCreateEvent) {
    if (!container) return;
    
    // Find all event buttons
    const eventButtons = container.querySelectorAll('.action-btn.event');
    
    eventButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const accountId = button.dataset.accountId;
            if (accountId && onCreateEvent) {
                onCreateEvent(accountId);
            }
        });
    });
    
    // Add hover effects to tooltips
    const actionButtons = container.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            const tooltip = button.querySelector('.tooltip');
            if (tooltip) {
                tooltip.style.display = 'block';
                tooltip.style.position = 'absolute';
                tooltip.style.bottom = '100%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translateX(-50%)';
                tooltip.style.marginBottom = '8px';
                tooltip.style.padding = '6px 10px';
                tooltip.style.background = 'rgba(0,0,0,0.85)';
                tooltip.style.color = 'white';
                tooltip.style.fontSize = '11px';
                tooltip.style.whiteSpace = 'nowrap';
                tooltip.style.borderRadius = '4px';
                tooltip.style.zIndex = '1000';
            }
        });
        
        button.addEventListener('mouseleave', () => {
            const tooltip = button.querySelector('.tooltip');
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        });
    });
}

/**
 * Extracts styles for info window to inject into shadow DOM or iframe
 * @returns {string} CSS styles as string
 */
export function getInfoWindowStyles() {
    return `
        .info-window-custom {
            font-family: 'Salesforce Sans', Arial, sans-serif;
            font-size: 12px;
            max-width: 600px;
            min-width: 450px;
            padding: 10px;
        }
        
        .action-btn {
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
        }
        
        .action-btn:hover {
            background: #e8f4ff !important;
            border-color: #0176d3 !important;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 600px) {
            .info-window-custom {
                min-width: 280px;
                max-width: 320px;
            }
        }
    `;
}

export function buildPanelDescription(account) {
    if (!account) return '';
    
    const html = [];
    
    // Header with account name and brand logo
    html.push('<div style="font-family: \'Salesforce Sans\', Arial, sans-serif;">');
    
    // Brand logo if available
    if (account.Brand_Logo__c) {
        html.push(`<div style="margin-bottom: 10px;">${account.Brand_Logo__c}</div>`);
    }
    
    // Sales Visit and Training Event Information
    html.push('<div style="margin-bottom: 15px;">');
    html.push('<table style="width:100%;border-collapse:collapse;"><tr>');
    
    // Sales Visit Column
    html.push('<td style="vertical-align:top;padding:5px 10px 5px 0;">');
    html.push('<h3 style="font-size:13px;font-weight:600;margin:0 0 8px 0;">📅 Sales Visit</h3>');
    html.push('<table style="width:100%;font-size:11px;">');
    html.push(`<tr><td style="font-weight:600;padding-right:8px;min-width:80px;">next:</td><td>${account.Planned_Next_Sales_Visit_URL__c || 'n/a'}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">last:</td><td>${account.Last_Sales_Visit_URL__c || 'n/a'}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">Target:</td><td>${account.Planned_Visits__c || 'n/a'}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">Actual:</td><td>${account.Actual_Visits_Total__c || 'n/a'}</td></tr>`);
    html.push('</table></td>');
    
    // Training Event Column
    html.push('<td style="vertical-align:top;padding:5px 10px 5px 0;">');
    html.push('<h3 style="font-size:13px;font-weight:600;margin:0 0 8px 0;">📅 Training Event</h3>');
    html.push('<table style="width:100%;font-size:11px;">');
    html.push(`<tr><td style="font-weight:600;padding-right:8px;min-width:80px;">next:</td><td>${account.Next_Planned_Training_Event_URL__c || 'n/a'}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">last:</td><td>${account.Last_Training_Event_URL__c || 'n/a'}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">Target:</td><td>${account.Planned_Trainings__c || 'n/a'}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">Actual:</td><td>${account.Actual_Trainings_Total__c || 'n/a'}</td></tr>`);
    html.push('</table></td>');
    
    html.push('</tr></table></div>');
    
    // Contact Information
    const address = formatAddress(account);
    const phone = account.Phone || 'n/a';
    
    html.push('<div style="margin-bottom: 15px;">');
    html.push('<h3 style="font-size:13px;font-weight:600;margin:0 0 8px 0;">📞 Contact Info</h3>');
    html.push('<table style="width:100%;font-size:11px;">');
    html.push(`<tr><td style="font-weight:600;padding-right:8px;min-width:80px;">Address:</td><td>${address}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">Phone:</td><td>${phone}</td></tr>`);
    html.push('</table></div>');
    
    // Business Information
    const territory = account.Territory__r?.Name || 'n/a';
    const legalHierarchy = getLegalHierarchy(account);
    const businessHierarchy = getBusinessHierarchy(account);
    
    html.push('<div style="margin-bottom: 15px;">');
    html.push('<h3 style="font-size:13px;font-weight:600;margin:0 0 8px 0;">🏢 Business Info</h3>');
    html.push('<table style="width:100%;font-size:11px;">');
    html.push(`<tr><td style="font-weight:600;padding-right:8px;min-width:140px;">Legal Hierarchy:</td><td>${legalHierarchy}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">Business Hierarchy:</td><td>${businessHierarchy}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">Territory:</td><td>${territory}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">Brand:</td><td>${account.Own_Brand_formula__c || 'n/a'}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">Segmentation (POS):</td><td>${account.Segment_Text_POS1__c || 'n/a'}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">Segmentation (CG):</td><td>${account.Segment_Text_CG__c || 'n/a'}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">Segmentation (Owner):</td><td>${account.Segment_Text_Owner__c || 'n/a'}</td></tr>`);
    html.push(`<tr><td style="font-weight:600;padding-right:8px;">Distribution Channel:</td><td>${account.Distribution_Channel__c || 'n/a'}</td></tr>`);
    html.push('</table></div>');
    
    html.push('</div>');
    
    return html.join('');
}