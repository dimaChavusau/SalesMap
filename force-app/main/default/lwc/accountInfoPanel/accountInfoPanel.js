import { LightningElement, api, track } from 'lwc';

export default class AccountInfoPanel extends LightningElement {
    @api
    get account() {
        return this._account;
    }
    set account(value) {
        this._account = value;
        if (value) {
            this.processAccountData();
        }
    }
    
    @api isOpen = false;
    @api position = { top: '50%', left: '50%' };
    
    @track _account;
    
    get panelStyle() {
        return `top: ${this.position.top}; left: ${this.position.left};`;
    }
    
    get panelClass() {
        // Add 'centered' class only when using percentage positioning
        const isCentered = this.position.left === '50%' || this.position.top === '50%';
        return `account-info-panel ${isCentered ? 'centered' : ''}`;
    }
    
    get accountUrl() {
        return `/${this._account?.Id}`;
    }
    
    get editUrl() {
        return `/${this._account?.Id}/e?retURL=${this._account?.Id}`;
    }
    
    get navigationUrl() {
        return `http://maps.google.com/maps?daddr=${this.formattedAddress}`;
    }
    
    get formattedAddress() {
        if (!this._account?.BillingAddress) return 'n/a';
        const addr = this._account.BillingAddress;
        return `${addr.street || ''}, ${addr.postalCode || ''} ${addr.city || ''}, ${addr.country || ''}`.replace(/^,\s*/, '');
    }
    
    get phone() {
        return this._account?.Phone || 'n/a';
    }
    
    get legalHierarchy() {
        if (!this._account?.Customer_Hierarchy_2_Description__r) return 'n/a';
        let name = this._account.Customer_Hierarchy_2_Description__r.Name;
        let sumOfPos = this._account.Customer_Hierarchy_2_Description__r.Sum_of_POS__c || 'n/a';
        return `${name} (${sumOfPos})`;
    }
    
    get businessHierarchy() {
        if (!this._account?.Pricing_Terms_Descripton__r) return 'n/a';
        let name = this._account.Pricing_Terms_Descripton__r.Name;
        let sumOfPos = this._account.Pricing_Terms_Descripton__r.Sum_of_POS__c || 'n/a';
        return `${name} (${sumOfPos})`;
    }
    
    get territory() {
        return this._account?.Territory__r?.Name || 'n/a';
    }
    
    get brand() {
        return this._account?.Own_Brand_formula__c || 'n/a';
    }
    
    get segmentationPOS() {
        return this._account?.Segment_Text_POS1__c || 'n/a';
    }
    
    get segmentationCG() {
        return this._account?.Segment_Text_CG__c || 'n/a';
    }
    
    get segmentationOwner() {
        return this._account?.Segment_Text_Owner__c || 'n/a';
    }
    
    get distributionChannel() {
        return this._account?.Distribution_Channel__c || 'n/a';
    }
    
    get plannedVisits() {
        return this._account?.Planned_Visits__c || 'n/a';
    }
    
    get actualVisits() {
        return this._account?.Actual_Visits_Total__c || 'n/a';
    }
    
    get plannedTrainings() {
        return this._account?.Planned_Trainings__c || 'n/a';
    }
    
    get actualTrainings() {
        return this._account?.Actual_Trainings_Total__c || 'n/a';
    }
    
    get brandLogo() {
        return this._account?.Brand_Logo__c;
    }
    
    renderedCallback() {
        if (this.isOpen && this._account) {
            this.insertHtmlContent();
        }
    }

    get computedStyle() {
        return `top: ${this.position.top}; left: ${this.position.left}; right: auto; bottom: auto;`;
    }
    
    processAccountData() {
        // Any data processing needed
    }
    
    insertHtmlContent() {
        // Insert brand logo
        if (this.brandLogo) {
            const logoContainer = this.template.querySelector('.brand-logo');
            if (logoContainer) {
                logoContainer.innerHTML = this.brandLogo;
            }
        }
        
        // Insert last sales visit with HTML link
        const lastSalesVisit = this.template.querySelector('.last-sales-visit');
        if (lastSalesVisit && this._account?.Last_Sales_Visit_URL__c) {
            lastSalesVisit.innerHTML = this._account.Last_Sales_Visit_URL__c;
        }
        
        // Insert next sales visit with HTML link
        const nextSalesVisit = this.template.querySelector('.next-sales-visit');
        if (nextSalesVisit && this._account?.Planned_Next_Sales_Visit_URL__c) {
            nextSalesVisit.innerHTML = this._account.Planned_Next_Sales_Visit_URL__c;
        }
        
        // Insert last training event with HTML link
        const lastTrainingEvent = this.template.querySelector('.last-training-event');
        if (lastTrainingEvent && this._account?.Last_Training_Event_URL__c) {
            lastTrainingEvent.innerHTML = this._account.Last_Training_Event_URL__c;
        }
        
        // Insert next training event with HTML link
        const nextTrainingEvent = this.template.querySelector('.next-training-event');
        if (nextTrainingEvent && this._account?.Next_Planned_Training_Event_URL__c) {
            nextTrainingEvent.innerHTML = this._account.Next_Planned_Training_Event_URL__c;
        }
    }
    
    handleClose() {
        this.isOpen = false;
        this.dispatchEvent(new CustomEvent('close'));
    }
    
    handleCreateEvent() {
        this.dispatchEvent(new CustomEvent('createevent', {
            detail: { accountId: this._account.Id }
        }));
    }
}