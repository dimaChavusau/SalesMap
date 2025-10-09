// accountInfoPanel.js
import { LightningElement, api } from 'lwc';

export default class AccountInfoPanel extends LightningElement {
    @api account;
    @api isOpen = false;
    
    renderedCallback() {
        if (this.isOpen && this.account) {
            this.insertBrandLogo();
        }
    }
    
    insertBrandLogo() {
        if (this.account.Brand_Logo__c) {
            const logoContainer = this.template.querySelector('[data-field="brandLogo"]');
            if (logoContainer) {
                logoContainer.innerHTML = this.account.Brand_Logo__c;
            }
        }
    }
    
    get accountUrl() {
        return `/${this.account?.Id}`;
    }
    
    get navigationUrl() {
        const addr = this.account?.BillingAddress;
        if (!addr) return '#';
        const address = `${addr.street || ''}, ${addr.postalCode || ''} ${addr.city || ''}, ${addr.country || ''}`;
        return `http://maps.google.com/maps?daddr=${encodeURIComponent(address)}`;
    }
    
    get editUrl() {
        return `/${this.account?.Id}/e?retURL=${this.account?.Id}`;
    }
    
    handleClose() {
        this.isOpen = false;
        this.dispatchEvent(new CustomEvent('close'));
    }
    
    handleNavigate() {
        window.open(this.navigationUrl, '_blank');
    }
    
    handleEdit() {
        window.open(this.editUrl, '_blank');
    }
    
    handleCreateEvent() {
        this.dispatchEvent(new CustomEvent('createevent', {
            detail: { accountId: this.account.Id }
        }));
    }
}