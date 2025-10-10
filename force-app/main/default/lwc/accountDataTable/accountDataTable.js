import { LightningElement, api, track } from 'lwc';

export default class AccountDataTable extends LightningElement {
    @api columns = [];
    @api title = 'Accounts';
    @api showDownloadButton = false;
    @api recordsPerPage = 20;
    
    @track searchKey = '';
    @track currentPage = 1;
    @track filteredData = [];
    
    _accounts = [];
    
    @api 
    get accounts() {
        return this._accounts;
    }
    set accounts(value) {
        this._accounts = value || [];
        this.updateFilteredData();
    }
    
    updateFilteredData() {
        if (this.searchKey) {
            this.filteredData = this._accounts.filter(acc => {
                return this.columns.some(col => {
                    const value = this.getFieldValue(acc, col.fieldName);
                    return value && String(value).toLowerCase().includes(this.searchKey);
                });
            });
        } else {
            this.filteredData = [...this._accounts];
        }
        this.currentPage = 1;
    }
    
    @api
    refresh() {
        this.updateFilteredData();
    }
    
    get displayRows() {
        const start = (this.currentPage - 1) * this.recordsPerPage;
        const end = start + this.recordsPerPage;
        const pageData = this.filteredData.slice(start, end);
        
        return pageData.map(row => {
            const cells = this.columns.map(col => {
                let value = this.getFieldValue(row, col.fieldName);
                
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
    
    get totalRecords() {
        return this.filteredData.length;
    }
    
    handleSearch(event) {
        this.searchKey = event.target.value.toLowerCase();
        this.updateFilteredData();
        this.dispatchEvent(new CustomEvent('search', {
            detail: { searchKey: this.searchKey }
        }));
    }
    
    handlePageChange(event) {
        this.currentPage = event.detail.currentPage;
    }
    
    handleRowAction(event) {
        const accountId = event.currentTarget.dataset.id;
        this.dispatchEvent(new CustomEvent('rowaction', {
            detail: {
                action: 'openAccount',
                row: this._accounts.find(acc => acc.Id === accountId)
            }
        }));
    }
    
    handleExport(event) {
        console.log('Export button clicked');
        console.log('Filtered data count:', this.filteredData.length);
        
        event.preventDefault();
        event.stopPropagation();
        
        try {
            const csv = this.convertToCSV();
            console.log('CSV generated, length:', csv.length);
            this.downloadCSV(csv);
        } catch (error) {
            console.error('Export error:', error);
        }
    }
    
    convertToCSV() {
        const columnDelimiter = ';';
        const lineDelimiter = '\n';
        
        // Match exact field list from legacy implementation
        const keys = [
            'Id',
            'Name',
            'Address',
            'Phone',
            'Account_Status_only_Status__c',
            'BillingLatitude',
            'BillingLongitude',
            'Distribution_Channel_Color__c',
            'Last_Sales_Visit_Icon__c',
            'Last_Sales_Visit_URL__c',
            'Last_Training_Event_Icon__c',
            'Last_Training_Event_URL__c',
            'Next_Planned_Training_Event_URL__c',
            'Planned_Next_Sales_Visit_URL__c',
            'Sales_Map_CG_Segment_Icon__c',
            'Sales_Map_Owner_Segment_Icon__c',
            'Sales_Map_POS_Segment_Icon__c',
            'Segment_Text_CG__c',
            'Segment_Text_Owner__c',
            'Segment_Text_POS1__c',
            'Share_of_Wallet_Category_Icon__c',
            'Share_of_Wallet_Category__c',
            'is_Main_Account__c'
        ];
        
        let csv = '';
        
        // Add column headers
        csv += keys.join(columnDelimiter);
        csv += lineDelimiter;
        
        console.log('Processing', this.filteredData.length, 'records for CSV');
        
        // Add data rows - use filteredData to match table display
        this.filteredData.forEach((item, index) => {
            const row = keys.map(key => {
                let val = '';
                
                // Get value based on key
                if (key === 'Address') {
                    // Build address from BillingAddress object
                    if (item.BillingAddress) {
                        const addr = item.BillingAddress;
                        val = `${addr.street || ''}, ${addr.postalCode || ''} ${addr.city || ''}, ${addr.country || ''}`.trim();
                    } else if (item.FormattedAddress) {
                        val = item.FormattedAddress;
                    }
                } else {
                    val = item[key] || '';
                }
                
                // Special handling for Phone field
                if (key === 'Phone' && val) {
                    val = 'P: ' + val;
                }
                
                // Extract text from HTML anchor tags for URL fields
                if (key === 'Last_Sales_Visit_URL__c' || 
                    key === 'Last_Training_Event_URL__c' || 
                    key === 'Next_Planned_Training_Event_URL__c' || 
                    key === 'Planned_Next_Sales_Visit_URL__c') {
                    
                    if (val && typeof val === 'string' && val.indexOf('<a href=') > -1) {
                        const startIndex = val.indexOf('>') + 1;
                        const endIndex = val.indexOf('</a>');
                        if (startIndex > 0 && endIndex > -1) {
                            val = val.substring(startIndex, endIndex);
                        }
                    }
                }
                
                // Convert to string and clean up
                val = String(val);
                
                // Remove newlines
                val = val.replace(/\r\n/g, ' ').replace(/\n/g, ' ');
                
                // Escape double quotes
                val = val.replace(/"/g, '""');
                
                // Wrap in quotes if contains delimiter or quotes
                if (val.indexOf(columnDelimiter) > -1 || val.indexOf('"') > -1) {
                    val = '"' + val + '"';
                }
                
                return val;
            }).join(columnDelimiter);
            
            csv += row + lineDelimiter;
        });
        
        // Add UTF-8 BOM at the beginning
        csv = '\uFEFF' + csv;
        
        return csv;
    }
    
    downloadCSV(csv) {
        console.log('Starting download...');
        
        const filename = 'accounts.csv';
        
        try {
            // Method 1: Try using Blob (preferred method)
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            
            if (navigator.msSaveBlob) {
                // IE 10+
                console.log('Using IE download method');
                navigator.msSaveBlob(blob, filename);
            } else {
                // Modern browsers
                console.log('Using modern browser download method');
                const link = document.createElement('a');
                
                if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', filename);
                    link.style.visibility = 'hidden';
                    link.style.position = 'absolute';
                    link.style.left = '-9999px';
                    
                    document.body.appendChild(link);
                    
                    console.log('Triggering download...');
                    link.click();
                    
                    // Cleanup
                    setTimeout(() => {
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        console.log('Download cleanup complete');
                    }, 100);
                } else {
                    // Fallback for older browsers
                    console.log('Using fallback data URI method');
                    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                    window.open(dataUri, '_blank');
                }
            }
        } catch (error) {
            console.error('Download error:', error);
            // Final fallback
            console.log('Attempting final fallback method');
            const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}