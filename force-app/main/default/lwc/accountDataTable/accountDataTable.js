// force-app/main/default/lwc/accountDataTable/accountDataTable.js
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
    
    downloadCSV(csv) {
        const filename = 'accounts.csv';
        
        try {
            // Create a hidden anchor element
            const link = document.createElement('a');
            
            // Use data URI with proper encoding
            // UTF-8 BOM is already in the CSV string
            const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
            
            link.setAttribute('href', dataUri);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            link.style.position = 'absolute';
            link.style.left = '-9999px';
            
            // Append to body, click, and remove
            document.body.appendChild(link);
            
            console.log('Triggering download...');
            link.click();
            
            // Cleanup after a short delay
            setTimeout(() => {
                document.body.removeChild(link);
                console.log('Download cleanup complete');
            }, 100);
            
        } catch (error) {
            console.error('Download error:', error);
        }
    }
    
    convertToCSV() {
        const columnDelimiter = ',';
        const lineDelimiter = '\n';
        
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
        
        // Start with UTF-8 BOM
        let csv = '\uFEFF';
        
        // Add column headers
        csv += keys.join(columnDelimiter);
        csv += lineDelimiter;
        
        console.log('Processing', this.filteredData.length, 'records for CSV');
        
        // Add data rows
        this.filteredData.forEach((item) => {
            const row = keys.map(key => {
                let val = '';
                
                if (key === 'Address') {
                    if (item.BillingAddress) {
                        const addr = item.BillingAddress;
                        val = `${addr.street || ''}, ${addr.postalCode || ''} ${addr.city || ''}, ${addr.country || ''}`.trim();
                    } else if (item.FormattedAddress) {
                        val = item.FormattedAddress;
                    }
                } else {
                    val = item[key] || '';
                }
                
                if (key === 'Phone' && val) {
                    val = 'P: ' + val;
                }
                
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
                
                val = String(val);
                val = val.replace(/\r\n/g, ' ').replace(/\n/g, ' ');
                val = val.replace(/"/g, '""');
                
                if (val.indexOf(columnDelimiter) > -1 || val.indexOf('"') > -1 || val.indexOf('\n') > -1) {
                    val = '"' + val + '"';
                }
                
                return val;
            }).join(columnDelimiter);
            
            csv += row + lineDelimiter;
        });
        
        return csv;
    }
}