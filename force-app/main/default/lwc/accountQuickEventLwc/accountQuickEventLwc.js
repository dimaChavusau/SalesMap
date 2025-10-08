import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAccount from '@salesforce/apex/AccountQuickEventController.getAccount';
import saveContactRecord from '@salesforce/apex/AccountQuickEventController.saveContactRecord';

const POSITION_OPTIONS = [
    { label: 'Owner', value: 'Owner' },
    { label: 'Audiologist', value: 'Audiologist' },
    { label: 'Dispenser', value: 'Dispenser' },
    { label: 'Receptionist', value: 'Receptionist' },
    { label: 'Accounting', value: 'Accounting' },
    { label: 'Pediatric Audiologist', value: 'Pediatric Audiologist' },
    { label: 'Technician', value: 'Technician' },
    { label: 'General Manager', value: 'General Manager' },
    { label: 'BCFY', value: 'BCFY' },
    { label: 'Apprentice', value: 'Apprentice' },
    { label: 'Patient Care Coordinator', value: 'Patient Care Coordinator' },
    { label: 'Physician', value: 'Physician' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Other', value: 'Other' }
];

const SALUTATION_OPTIONS = [
    { label: 'Mr.', value: 'Mr.' },
    { label: 'Ms.', value: 'Ms.' }
];

export default class AccountQuickEventLwc extends NavigationMixin(LightningElement) {
    @api recordId;
    @api mode = 'card';
    @api showCloseButton = false;
    @api showBackdrop = false;
    
    @track contactOptions = [];
    @track selectedContactId = '';
    @track additionalContactIds = [];
    @track showAddContact = false;
    @track isLoading = false;
    @track isSelectAll = false;
    
    // Add contact form fields
    @track newContactFirstName = '';
    @track newContactLastName = '';
    @track newContactEmail = '';
    @track newContactPhone = '';
    @track newContactSalutation = 'Mr.';
    @track newContactPosition = 'Owner';
    
    accountData;
    allContacts = [];
    
    salutationOptions = SALUTATION_OPTIONS;
    positionOptions = POSITION_OPTIONS;
    
    connectedCallback() {
        if (this.recordId) {
            this.loadAccountData();
        }
    }
    
    async loadAccountData() {
        this.isLoading = true;
        try {
            const account = await getAccount({ accountId: this.recordId });
            this.accountData = account;
            this.allContacts = account.Contacts || [];
            
            if (this.allContacts.length > 0) {
                this.contactOptions = this.allContacts.map(contact => {
                    const position = contact.Contact_Role__c || 'n/a';
                    return {
                        label: `${contact.Name} (${position})`,
                        value: contact.Id
                    };
                });
                
                // Set first contact as default
                this.selectedContactId = this.allContacts[0].Id;
            }
        } catch (error) {
            console.error('Error loading account:', error);
            this.showToast('Error', 'Failed to load account data: ' + error.body?.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }
    
    get showModal() {
        return this.mode === 'modal';
    }
    
    get hasContacts() {
        return this.contactOptions.length > 0;
    }
    
    get accountName() {
        if (!this.accountData) return '';
        const billToShipTo = this.accountData.Bill_to_Ship_to_text__c || '';
        return `${this.accountData.Name} ${billToShipTo ? '(' + billToShipTo + ')' : ''}`;
    }
    
    get accountNameOnly() {
        return this.accountData?.Name || '';
    }
    
    handleSelectAllChange(event) {
        this.isSelectAll = event.detail.checked;
        
        if (this.isSelectAll && this.allContacts.length > 0) {
            // Select all contacts
            this.selectedContactId = this.allContacts[0].Id;
            this.additionalContactIds = this.allContacts.slice(1).map(c => c.Id);
        } else {
            // Keep only first contact
            if (this.allContacts.length > 0) {
                this.selectedContactId = this.allContacts[0].Id;
            }
            this.additionalContactIds = [];
        }
    }
    
    handleContactChange(event) {
        this.isSelectAll = false;
        this.selectedContactId = event.detail.value;
        this.additionalContactIds = [];
    }
    
    handleCreateEvent() {
        if (!this.selectedContactId) {
            this.showToast('Warning', 'Please select a contact', 'warning');
            return;
        }
        
        // Find selected contact
        const selectedContact = this.allContacts.find(c => c.Id === this.selectedContactId);
        if (!selectedContact) return;
        
        const firstName = selectedContact.FirstName || '';
        const lastName = selectedContact.LastName || '';
        const accountName = this.accountData.Name.substring(0, 40);
        
        // Prepare hidden contact IDs (excluding the main contact)
        let hiddenContactIds = '';
        if (this.additionalContactIds.length > 0) {
            hiddenContactIds = this.additionalContactIds.join(',');
        }
        
        // Build default field values - only include fields that have values and are accessible
        const defaultFields = {
            WhoId: selectedContact.Id,
            WhatId: this.accountData.Id,
            Subject: `${accountName}/${firstName} ${lastName}`,
            Event_Status__c: 'Not Completed'
        };
        
        // Add optional fields only if they have values
        if (this.accountData.Unit_Potential__c) {
            defaultFields.Account_Unit_Potential__c = this.accountData.Unit_Potential__c;
        }
        
        if (this.accountData.Bill_to_Ship_to_text__c) {
            defaultFields.Account_Number__c = this.accountData.Bill_to_Ship_to_text__c;
        }
        
        if (hiddenContactIds) {
            defaultFields.Hidden_ContactIds__c = hiddenContactIds;
        }
        
        // Only add RecordTypeId if you have a valid one for your org
        // Remove or update this ID to match your org's Event RecordType
        // defaultFields.RecordTypeId = '012240000002mOq';
        
        // Navigate to create Event with pre-filled fields
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'Event',
                actionName: 'new'
            },
            state: {
                defaultFieldValues: this.encodeDefaultFieldValues(defaultFields),
                nooverride: '1'
            }
        });
        
        this.dispatchEvent(new CustomEvent('created'));
        this.handleClose();
    }
    
    encodeDefaultFieldValues(fields) {
        return Object.keys(fields)
            .filter(key => fields[key] !== null && fields[key] !== undefined && fields[key] !== '')
            .map(key => `${key}=${encodeURIComponent(fields[key])}`)
            .join(',');
    }
    
    handleAddContact() {
        this.showAddContact = true;
    }
    
    handleCancelAddContact() {
        this.showAddContact = false;
        this.resetContactForm();
    }
    
    async handleSaveContact() {
        // Validate required fields
        if (!this.newContactLastName || !this.newContactPosition) {
            this.showToast('Error', 'Please fill the required fields!', 'error');
            return;
        }
        
        // Validate phone format if provided
        if (this.newContactPhone) {
            const phonePattern = /^\+([0-9 \-.]){6,20}$/;
            if (!phonePattern.test(this.newContactPhone)) {
                this.showToast(
                    'Error', 
                    'Please use the international phone number format for the Phone field (eg: +49...) Use only Numbers, space, point and the negative sign.',
                    'error'
                );
                return;
            }
        }
        
        this.isLoading = true;
        try {
            const newContact = await saveContactRecord({
                fName: this.newContactFirstName,
                lName: this.newContactLastName,
                salutation: this.newContactSalutation,
                email: this.newContactEmail,
                phoneNo: this.newContactPhone || '',
                accId: this.recordId,
                position: this.newContactPosition,
                positionBCFY: true
            });
            
            this.showToast(
                'Success',
                `Contact ${newContact.LastName} created successfully!`,
                'success'
            );
            
            this.showAddContact = false;
            this.resetContactForm();
            await this.loadAccountData();
            
        } catch (error) {
            console.error('Error saving contact:', error);
            this.showToast(
                'Error',
                'Error in Saving the record. Please check the input values: ' + error.body?.message,
                'error'
            );
        } finally {
            this.isLoading = false;
        }
    }
    
    resetContactForm() {
        this.newContactFirstName = '';
        this.newContactLastName = '';
        this.newContactEmail = '';
        this.newContactPhone = '';
        this.newContactSalutation = 'Mr.';
        this.newContactPosition = 'Owner';
    }
    
    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }
    
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
    
    // Form field change handlers
    handleFirstNameChange(event) {
        this.newContactFirstName = event.detail.value;
    }
    
    handleLastNameChange(event) {
        this.newContactLastName = event.detail.value;
    }
    
    handleEmailChange(event) {
        this.newContactEmail = event.detail.value;
    }
    
    handlePhoneChange(event) {
        this.newContactPhone = event.detail.value;
    }
    
    handleSalutationChange(event) {
        this.newContactSalutation = event.detail.value;
    }
    
    handlePositionChange(event) {
        this.newContactPosition = event.detail.value;
    }
}