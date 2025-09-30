import { LightningElement, api, track, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const FIELDS = [
    'Account.Name',
    'Account.Bill_to_Ship_to_text__c',
    'Account.Contacts'
];

export default class AccountQuickEventLwc extends NavigationMixin(LightningElement) {
    @api recordId;
    @api mode = 'card'; // 'card' or 'modal'
    @api showCloseButton = false;
    @api showBackdrop = false;
    
    @track contactOptions = [];
    @track selectedContacts = [];
    @track showAddContact = false;
    
    accountName = '';
    accountData;
    
    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredAccount({ error, data }) {
        if (data) {
            this.accountData = data;
            this.accountName = data.fields.Name.value;
            // Note: Getting related contacts requires a custom Apex method
            this.loadContacts();
        } else if (error) {
            console.error('Error loading account:', error);
        }
    }
    
    get showModal() {
        return this.mode === 'modal';
    }
    
    get hasContacts() {
        return this.contactOptions.length > 0;
    }
    
    async loadContacts() {
        // In real implementation, call Apex to get contacts
        // For now, using placeholder
        this.contactOptions = [
            { label: 'John Doe (Owner)', value: 'contact1' },
            { label: 'Jane Smith (Manager)', value: 'contact2' }
        ];
    }
    
    handleContactChange(event) {
        this.selectedContacts = event.detail.value;
    }
    
    handleCreateEvent() {
        if (this.selectedContacts.length === 0) {
            this.showToast('Warning', 'Please select at least one contact', 'warning');
            return;
        }
        
        // Navigate to create Event
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'Event',
                actionName: 'new'
            },
            state: {
                defaultFieldValues: {
                    WhatId: this.recordId,
                    Subject: this.accountName
                }
            }
        });
        
        this.dispatchEvent(new CustomEvent('created'));
    }
    
    handleAddContact() {
        this.showAddContact = true;
    }
    
    handleContactSuccess(event) {
        this.showAddContact = false;
        this.showToast('Success', 'Contact created successfully', 'success');
        this.loadContacts();
    }
    
    handleCancelAddContact() {
        this.showAddContact = false;
    }
    
    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }
    
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}