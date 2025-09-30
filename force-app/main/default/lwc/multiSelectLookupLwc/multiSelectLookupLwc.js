import { LightningElement, api, track } from 'lwc';

export default class MultiSelectLookupLwc extends LightningElement {
    @api objectApiName;
    @api iconName = 'standard:account';
    @api fields = '';
    @api conditions = '';
    @api selectedRecords = [];
    
    handleSelection(event) {
        const selectedId = event.detail.value[0];
        if (selectedId && !this.selectedRecords.find(r => r.Id === selectedId)) {
            // In real implementation, you'd fetch the record details
            // For now, adding placeholder
            this.selectedRecords = [...this.selectedRecords, {
                Id: selectedId,
                Name: 'Selected Record'
            }];
            
            this.fireChangeEvent();
        }
    }
    
    handleRemove(event) {
        const recordId = event.detail.name;
        this.selectedRecords = this.selectedRecords.filter(r => r.Id !== recordId);
        this.fireChangeEvent();
    }
    
    fireChangeEvent() {
        this.dispatchEvent(new CustomEvent('selectchange', {
            detail: { selectedRecords: this.selectedRecords }
        }));
    }
}