/**
 * Created by Z003D6YE on 08.01.2019.
 */
({
    doInit : function(component, event, helper) {
        component.set("v.createEventClicked", false);


        helper.exec(
            component,
            helper,
            "c.getAccount",
            function(response){
                if(response.getState() === "SUCCESS") {
                    var acc = response.getReturnValue();
                    console.log("acc", acc);
                    component.set("v.acc", acc);
                    if(acc.hasOwnProperty('Contacts')) {
                       if(acc.Contacts.length > 0) {

                            var options = [];
                            for(var i in acc.Contacts) {

                                var contact = acc.Contacts[i];
                                var contactPosition = contact.hasOwnProperty('Contact_Role__c') ? contact.Contact_Role__c : 'n/a';

                                var option = {
                                    label: contact.Name + ' ('+contactPosition+')' ,
                                    value: contact.Id
                                }
                                options.push(option);
                            }
                            component.set("v.options", options);
                            component.set("v.hasContacts", true);
                            const contactSelected = component.get("v.contactSelected");
    						
                            if(contactSelected) {
                                component.find("contactCheckboxGroup").set("v.value", contactSelected.Id);
                                component.set("v.contactIds", [contactSelected.Id]);
                            }
                        }


                    } else {
                        helper.showWarningToast(helper, "This account has no related contacts!");
                    }

                } else {
                    helper.showError(helper, response.getError());
                }
            },
            {
                accountId : component.get("v.recordId")
            }
        )
    },
	
    handleSelectAllContact: function(component, event, helper) {
       var selectedVal=component.get("v.isSelectAll");
       //contactIds to be set with all the ids
       var optns=component.get("v.options");
       var acc=component.get("v.acc");
      
        if(selectedVal){
             var lst=[];
               for(var i in acc.Contacts) 
               {	
                   
                   var contact = acc.Contacts[i];
                 
                   lst.push(contact.Id);
                }
            
            component.set("v.contactSelected", acc.Contacts[0]);
            component.find("contactCheckboxGroup").set("v.value",lst);
            lst.shift();
            component.set("v.contactIds", lst);
          
            
        }
        else{
             component.set("v.contactSelected", null);
             component.find("contactCheckboxGroup").set("v.value",'');
             component.set("v.contactIds", null);
        }
    },
    handleContactChange : function(component, event, helper) {
        component.set("v.isSelectAll",false);
        var contactIds = [...event.getParam("value")];
        var mainContactId = contactIds[0];
       
        var currentSelectedContact = component.set("v.contactSelected");
        
        if(currentSelectedContact == null) {
           var contact = null;
           var acc = component.get("v.acc");
           for(var i in acc.Contacts) {
               contact = acc.Contacts[i];
               if(contact.Id === mainContactId) {
                   component.set("v.contactSelected", contact);
                   break;
               }
           }
        }
	
        if(contactIds.length > 1) {
            contactIds.shift();
          
            component.set("v.contactIds", contactIds);
           
        }
    },

     createEvent : function(component, event, helper) {
        
        var contactLen=component.get("v.contactIds").length;
        var hiddenCon="";
        console.log('contactLen'+contactLen)
        if(contactLen==1){
            var contactIds=component.get("v.contactIds");
             hiddenCon=contactIds[0];
             if(component.get("v.contactSelected").Id==hiddenCon){
                hiddenCon="";
            }
         }
         else if(contactLen<1){
             hiddenCon="";
         }
        var cont = component.get("v.contactSelected");
        console.log("contact", cont);
        if(cont != null) {
            component.set("v.createEventClicked", true);
            var acc = component.get("v.acc");
            var firstName = '';
            if(cont.hasOwnProperty('FirstName')) {
                firstName = cont.FirstName;
            }
            var lastName=cont.LastName;
            var accStr = acc.Name.substring(0, 40);
            var x= {
                'entityApiName': 'Event',
                'defaultFieldValues': {
                    'WhoId' : cont.Id,
                    'RecordType' : '012240000002mOq',
                    'WhatId' : acc.Id,
                    'Subject' : accStr + '/' + firstName +" "+lastName,
                    'Event_Status__c' : 'Not Completed',
                    'Account_Unit_Potential__c' : acc.Unit_Potential__c,
                    'Account_Number__c' : acc.Bill_to_Ship_to_text__c,
                    'Address_Information__c' : cont.Address_Information__c,
                    'Hidden_ContactIds__c' : component.get("v.contactIds").length > 1 ? component.get("v.contactIds").join(",") : hiddenCon
                }
            };
            console.log('Params:' + x);
            var createRecordEvent = $A.get('e.force:createRecord');
            createRecordEvent.setParams(x);
            createRecordEvent.fire();

        } else {
            helper.showWarningToast(helper, "Please select a contact");
        }

     },

     handleModalClose : function(component, event, helper) {
        component.set("v.showModal", false);
     },

     addNewContact : function(component, event, helper) {
     /**    var acc = component.get("v.acc");
         var createRecordEvent = $A.get('e.force:createRecord');
         createRecordEvent.setParams({
             'entityApiName': 'Contact',
             'RecordTypeId' : '01224000000scX6AAI',
             'defaultFieldValues': {
                 'AccountId' : acc.Id,
                 'Email' : acc.Email__c,
                 'Phone' : acc.Phone,
                 'Fax' : acc.Fax,
                 'MailingStreet' : acc.BillingStreet,
                 'MailingPostalCode' : acc.BillingPostalCode,
                 'MailingState' : acc.BillingState,
                 'MailingCity' : acc.BillingCity,
                 'MailingCountry' : acc.BillingCountry,
                    
             },
             "navigationLocation" : "LOOKUP",
             'panelOnDestroyCallback': function(event) {
            	var callInitMethod = component.get('c.doInit');
            	$A.enqueueAction(callInitMethod);
             }
         });
         createRecordEvent.fire(); **/
         
         component.set('v.addContact',true);
      
     },
    handleSaveClones:function(component, event, helper){
        var lName= component.get('v.cloneContactLastName');
        var position= component.get('v.clonePosition');
        var phoneVal=component.get('v.cloneMobile');
        
         var patrn="^\\+([0-9 -.]){6,20}";
        if(lName==null || position==null){
             var toastEvent = $A.get("e.force:showToast");
                    toastEvent.setParams({
                        "title": "Error!",
                        "message": "Please fill the required fields!",
                        'type' : 'error'
                    });
                    toastEvent.fire();
        }
        else{
            if(phoneVal!=null && phoneVal!='' && phoneVal!=undefined  ){
                if(!phoneVal.toString().match(patrn)){
           			var toastEvent = $A.get("e.force:showToast");
                    toastEvent.setParams({
                        "title": "Error!",
                        "message": "Please use the international phone number format for the Phone field (eg: +49...) Use only Numbers, space, point and the negative sign.",
                        'type' : 'error'
                    });
                    toastEvent.fire();
        	}
            else{
                
                  helper.saveRecord(component, event, helper);
                 component.set('v.addContact',false);
              
            } 
            }
            else{
                
                helper.saveRecord(component, event, helper);
                 component.set('v.addContact',false);
            }
        }
            
    },
	handleCancel: function(component, event, helper) {
          component.set('v.addContact',false);
    },
     goBack : function(component, event, helper) {
         window.history.back();
     }
})