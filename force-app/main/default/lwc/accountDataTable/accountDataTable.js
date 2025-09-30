// accountDataTable.js - ENHANCED with error handling
import { LightningElement, api, track } from 'lwc';

export default class AccountDataTable extends LightningElement {
    @api accounts = [];
    @api columns = [];
    @api title = 'Accounts';
    @api showDownloadButton = false;
    @api recordsPerPage = 20;
    
    @track searchKey = '';
    @track currentPage = 1;
    @track filteredData = [];
    @track sortedBy = '';
    @track sortedDirection = 'asc';
    @track error;
    
    connectedCallback() {
        try {
            this.filteredData = [...this.accounts];
        } catch (error) {
            this.handleError(error);
        }
    }
    
    disconnectedCallback() {
        // Cleanup
        this.filteredData = [];
    }
    
    @api
    refresh() {
        try {
            this.filteredData = [...this.accounts];
            this.currentPage = 1;
            this.error = null;
        } catch (error) {
            this.handleError(error);
        }
    }
    
    get displayRows() {
        try {
            const start = (this.currentPage - 1) * this.recordsPerPage;
            const end = start + this.recordsPerPage;
            const pageData = this.filteredData.slice(start, end);
            
            return pageData.map(row => {
                const cells = this.columns.map(col => {
                    let value = this.getFieldValue(row, col.fieldName);
                    
                    // Check if it's HTML content
                    const isHtml = col.fieldName === 'Brand_Logo__c' || 
                                  col.fieldName === 'Segment_Icon_POS__c' ||
                                  col.fieldName === 'Segment_Icon_Owner__c' ||
                                  (typeof value === 'string' && value.includes('<'));
                    
                    return {
                        key: col.fieldName + '_' + row.Id,
                        value: value || '',
                        isHtml: isHtml,
                        fieldName: col.fieldName
                    };
                });
                
                return {
                    id: row.Id,
                    cells: cells
                };
            });
        } catch (error) {
            this.handleError(error);
            return [];
        }
    }
    
    getFieldValue(row, fieldName) {
        try {
            // Handle nested fields like Territory__r.Name
            if (fieldName.includes('.')) {
                const fields = fieldName.split('.');
                let value = row;
                for (let field of fields) {
                    value = value ? value[field] : null;
                }
                return value;
            }
            return row[fieldName];
        } catch (error) {
            console.error(`Error getting field value for ${fieldName}:`, error);
            return null;
        }
    }
    
    get totalRecords() {
        return this.filteredData.length;
    }
    
    get hasError() {
        return !!this.error;
    }
    
    handleSearch(event) {
        try {
            this.searchKey = event.target.value.toLowerCase();
            this.filterData();
            this.dispatchEvent(new CustomEvent('search', {
                detail: { searchKey: this.searchKey }
            }));
        } catch (error) {
            this.handleError(error);
        }
    }
    
    filterData() {
        try {
            if (this.searchKey) {
                this.filteredData = this.accounts.filter(acc => {
                    return this.columns.some(col => {
                        const value = this.getFieldValue(acc, col.fieldName);
                        return value && String(value).toLowerCase().includes(this.searchKey);
                    });
                });
            } else {
                this.filteredData = [...this.accounts];
            }
            this.currentPage = 1;
            this.error = null;
        } catch (error) {
            this.handleError(error);
        }
    }
    
    handleSort(event) {
        try {
            const fieldName = event.currentTarget.dataset.field;
            const sortDirection = this.sortedBy === fieldName && this.sortedDirection === 'asc' ? 'desc' : 'asc';
            
            this.sortedBy = fieldName;
            this.sortedDirection = sortDirection;
            
            this.filteredData = [...this.filteredData].sort((a, b) => {
                let aVal = this.getFieldValue(a, fieldName);
                let bVal = this.getFieldValue(b, fieldName);
                
                // Handle null values
                if (aVal == null) return 1;
                if (bVal == null) return -1;
                
                // Convert to string for comparison
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
                
                if (sortDirection === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
        } catch (error) {
            this.handleError(error);
        }
    }
    
    handlePageChange(event) {
        try {
            this.currentPage = event.detail.currentPage;
        } catch (error) {
            this.handleError(error);
        }
    }
    
    handleRowAction(event) {
        try {
            const accountId = event.currentTarget.dataset.id;
            this.dispatchEvent(new CustomEvent('rowaction', {
                detail: {
                    action: 'openAccount',
                    row: this.accounts.find(acc => acc.Id === accountId)
                }
            }));
        } catch (error) {
            this.handleError(error);
        }
    }
    
    handleExport() {
        try {
            const csv = this.convertToCSV();
            this.downloadCSV(csv);
        } catch (error) {
            this.handleError(error);
        }
    }
    
    convertToCSV() {
        const delimiter = ',';
        const headers = this.columns.map(col => `"${col.label}"`);
        const rows = this.filteredData.map(row => 
            this.columns.map(col => {
                const value = this.getFieldValue(row, col.fieldName);
                // Remove HTML tags if present
                if (typeof value === 'string' && value.includes('<')) {
                    return `"${value.replace(/<[^>]*>/g, '').replace(/"/g, '""')}"`;
                }
                return `"${String(value || '').replace(/"/g, '""')}"`;
            }).join(delimiter)
        );
        
        return [headers.join(delimiter), ...rows].join('\n');
    }
    
    downloadCSV(csv) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `accounts_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    handleError(error) {
        this.error = this.reduceErrors(error);
        console.error('AccountDataTable Error:', this.error);
        
        this.dispatchEvent(new CustomEvent('error', {
            detail: { error: this.error }
        }));
    }
    
    reduceErrors(error) {
        if (!error) return 'Unknown error';
        
        if (Array.isArray(error.body)) {
            return error.body.map(e => e.message).join(', ');
        } else if (error.body?.message) {
            return error.body.message;
        } else if (error.message) {
            return error.message;
        }
        
        return 'Unknown error occurred';
    }
    
    getSortIcon(fieldName) {
        if (this.sortedBy !== fieldName) return '';
        return this.sortedDirection === 'asc' ? '▲' : '▼';
    }
}