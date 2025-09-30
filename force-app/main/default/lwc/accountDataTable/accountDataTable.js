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
    
    connectedCallback() {
        this.filteredData = [...this.accounts];
    }
    
    @api
    refresh() {
        this.filteredData = [...this.accounts];
        this.currentPage = 1;
    }
    
    get displayRows() {
        const start = (this.currentPage - 1) * this.recordsPerPage;
        const end = start + this.recordsPerPage;
        const pageData = this.filteredData.slice(start, end);
        
        // Transform data to avoid computed property access
        return pageData.map(row => {
            const cells = this.columns.map(col => {
                let value = this.getFieldValue(row, col.fieldName);
                
                // Check if it's HTML content (like Brand_Logo__c)
                const isHtml = col.fieldName === 'Brand_Logo__c' || 
                              col.fieldName === 'Segment_Icon_POS__c' ||
                              col.fieldName === 'Segment_Icon_Owner__c' ||
                              (typeof value === 'string' && value.includes('<'));
                
                return {
                    key: col.fieldName + '_' + row.Id,
                    value: value || '',
                    isHtml: isHtml
                };
            });
            
            return {
                id: row.Id,
                cells: cells
            };
        });
    }
    
    getFieldValue(row, fieldName) {
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
    }
    
    get paginatedData() {
        const start = (this.currentPage - 1) * this.recordsPerPage;
        const end = start + this.recordsPerPage;
        return this.filteredData.slice(start, end);
    }
    
    get totalRecords() {
        return this.filteredData.length;
    }
    
    handleSearch(event) {
        this.searchKey = event.target.value.toLowerCase();
        this.filterData();
        this.dispatchEvent(new CustomEvent('search', {
            detail: { searchKey: this.searchKey }
        }));
    }
    
    filterData() {
        if (this.searchKey) {
            this.filteredData = this.accounts.filter(acc => {
                // Search through all field values
                return this.columns.some(col => {
                    const value = this.getFieldValue(acc, col.fieldName);
                    return value && String(value).toLowerCase().includes(this.searchKey);
                });
            });
        } else {
            this.filteredData = [...this.accounts];
        }
        this.currentPage = 1;
    }
    
    handlePageChange(event) {
        this.currentPage = event.detail.currentPage;
    }
    
    handleRowAction(event) {
        const accountId = event.currentTarget.dataset.id;
        this.dispatchEvent(new CustomEvent('rowaction', {
            detail: {
                action: 'openAccount',
                row: this.accounts.find(acc => acc.Id === accountId)
            }
        }));
    }
    
    handleExport() {
        const csv = this.convertToCSV();
        this.downloadCSV(csv);
    }
    
    convertToCSV() {
        const headers = this.columns.map(col => col.label);
        const rows = this.filteredData.map(row => 
            this.columns.map(col => {
                const value = this.getFieldValue(row, col.fieldName);
                // Remove HTML tags if present
                if (typeof value === 'string' && value.includes('<')) {
                    return value.replace(/<[^>]*>/g, '');
                }
                return value || '';
            })
        );
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        return csvContent;
    }
    
    downloadCSV(csv) {
        const hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        hiddenElement.target = '_blank';
        hiddenElement.download = 'accounts.csv';
        hiddenElement.click();
    }
}