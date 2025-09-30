({
    saveRecord : function(component, event, helper) {
        var md=component.get("v.mode");
        component.set("v.mode",null); 
        component.set("v.spinner",true);
        let action = component.get("c.saveContactRecord");
        var position= component.get('v.clonePosition');
        
        var ph=component.get('v.cloneMobile');
        if(ph==null || ph==undefined){
            ph='';
        }
        
        action.setParams({
            
            fName:component.get('v.cloneContactFirstName'),
            lName:component.get('v.cloneContactLastName'),
            salutation:component.get('v.cloneSalutation'),
            email:component.get('v.cloneEmail'),
            phoneNo:ph,
            accId:component.get("v.selectedId"),
            position:component.get("v.clonePosition"),
            positionBCFY:true
        });
        action.setCallback( this, function( response ) {
            var state = response.getState();
            
            if (state === "SUCCESS") {
                var url = window.location.href;
                
                var index=url.indexOf('.com')+4;
                
                var urlString=url.substring(0,index);
                
                var rtnVal=response.getReturnValue();
                if(rtnVal.Id!=null){
                    var toastEvent = $A.get("e.force:showToast");
                    toastEvent.setParams({
                        title : 'Success',
                        message: 'Contact '+ rtnVal+' created successfully!',
                        messageTemplate: 'Contact {0} created! To view click {1}!',
                        messageTemplateData: [rtnVal.LastName, {
                            url: urlString+'/'+rtnVal.Id,
                            label: 'here',
                        }],
                        duration:' 5000',
                        key: 'alt',
                        type: 'success',   // success/Warning/Error
                        mode: 'dismissible'    // pester/sticky
                    });
                    toastEvent.fire();
                    component.set("v.mode",md);
                    var callInitMethod = component.get('c.doInit');
                    $A.enqueueAction(callInitMethod);
                    component.set("v.spinner",false);
                    
                }
                else{
                    component.set("v.mode",md);
                    component.set("v.spinner",false);
                    
                    var toastEvent = $A.get("e.force:showToast");
                    toastEvent.setParams({
                        "title": "Error!",
                        "message": "Error in Saving the record.Please check the input values",
                        'type' : 'error'
                    });
                    toastEvent.fire();
                }
            }
        });
        $A.enqueueAction(action); 
    }
})