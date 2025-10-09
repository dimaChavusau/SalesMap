// accountInfoContent.js
import { LightningElement, api } from 'lwc';

export default class AccountInfoContent extends LightningElement {
    @api account;
    
    renderedCallback() {
        if (this.account) {
            this.insertHtmlContent();
        }
    }
    
    insertHtmlContent() {
        // Insert last sales visit with HTML link
        const lastSalesVisit = this.template.querySelector('[data-field="lastSalesVisit"]');
        if (lastSalesVisit && this.account.Last_Sales_Visit_URL__c) {
            lastSalesVisit.innerHTML = this.account.Last_Sales_Visit_URL__c;
        }
        
        // Insert next sales visit with HTML link
        const nextSalesVisit = this.template.querySelector('[data-field="nextSalesVisit"]');
        if (nextSalesVisit && this.account.Planned_Next_Sales_Visit_URL__c) {
            nextSalesVisit.innerHTML = this.account.Planned_Next_Sales_Visit_URL__c;
        }
        
        // Insert last training event with HTML link
        const lastTrainingEvent = this.template.querySelector('[data-field="lastTrainingEvent"]');
        if (lastTrainingEvent && this.account.Last_Training_Event_URL__c) {
            lastTrainingEvent.innerHTML = this.account.Last_Training_Event_URL__c;
        }
        
        // Insert next training event with HTML link
        const nextTrainingEvent = this.template.querySelector('[data-field="nextTrainingEvent"]');
        if (nextTrainingEvent && this.account.Next_Planned_Training_Event_URL__c) {
            nextTrainingEvent.innerHTML = this.account.Next_Planned_Training_Event_URL__c;
        }
    }
    
    get formattedAddress() {
        if (!this.account?.BillingAddress) return 'n/a';
        const addr = this.account.BillingAddress;
        return `${addr.street || ''}, ${addr.postalCode || ''} ${addr.city || ''}, ${addr.country || ''}`.replace(/^,\s*/, '');
    }
    
    get phone() {
        return this.account?.Phone || 'n/a';
    }
    
    get legalHierarchy() {
        if (!this.account?.Customer_Hierarchy_2_Description__r) return 'n/a';
        const name = this.account.Customer_Hierarchy_2_Description__r.Name;
        const sumOfPos = this.account.Customer_Hierarchy_2_Description__r.Sum_of_POS__c || 'n/a';
        return `${name} (${sumOfPos})`;
    }
    
    get businessHierarchy() {
        if (!this.account?.Pricing_Terms_Descripton__r) return 'n/a';
        const name = this.account.Pricing_Terms_Descripton__r.Name;
        const sumOfPos = this.account.Pricing_Terms_Descripton__r.Sum_of_POS__c || 'n/a';
        return `${name} (${sumOfPos})`;
    }
    
    get territory() {
        return this.account?.Territory__r?.Name || 'n/a';
    }
    
    get brand() {
        return this.account?.Own_Brand_formula__c || 'n/a';
    }
    
    get segmentationPOS() {
        return this.account?.Segment_Text_POS1__c || 'n/a';
    }
    
    get segmentationCG() {
        return this.account?.Segment_Text_CG__c || 'n/a';
    }
    
    get segmentationOwner() {
        return this.account?.Segment_Text_Owner__c || 'n/a';
    }
    
    get distributionChannel() {
        return this.account?.Distribution_Channel__c || 'n/a';
    }
    
    get plannedVisits() {
        return this.account?.Planned_Visits__c || 'n/a';
    }
    
    get actualVisits() {
        return this.account?.Actual_Visits_Total__c || 'n/a';
    }
    
    get plannedTrainings() {
        return this.account?.Planned_Trainings__c || 'n/a';
    }
    
    get actualTrainings() {
        return this.account?.Actual_Trainings_Total__c || 'n/a';
    }
}