/**
 * Created by z003d6ye on 23.01.2019.
 */
({
    convertArrayOfObjectsToCSV : function(component, helper, data) {
        console.log("convertArrayOfObjectsToCSV called");
        const columnDelimiter = ';';
        const lineDelimiter = '\n';
        
        const keys = Array(
            "Id",
            "Name",
            "Address",
            "Phone",
        	"Account_Status_only_Status__c",
            "BillingLatitude",
            "BillingLongitude",
            "Distribution_Channel_Color__c",
            "Last_Sales_Visit_Icon__c",
            "Last_Sales_Visit_URL__c",
            "Last_Training_Event_Icon__c",
            "Last_Training_Event_URL__c",
            "Next_Planned_Training_Event_URL__c",
            "Planned_Next_Sales_Visit_URL__c",
            "Sales_Map_CG_Segment_Icon__c",
            "Sales_Map_Owner_Segment_Icon__c",
            "Sales_Map_POS_Segment_Icon__c",
            "Segment_Text_CG__c",
            "Segment_Text_Owner__c",
            "Segment_Text_POS1__c",
            "Share_of_Wallet_Category_Icon__c",
            "Share_of_Wallet_Category__c",
            "is_Main_Account__c"
        );
        let csv = '';
        
        // Adding column headers
        csv += keys.join(columnDelimiter);
        csv += lineDelimiter;
        
        // Adding values
        data.forEach(item => {
            csv += keys.map(key => {
            	let val = item[key];
            	if(key === "Phone") {
            		val = "P: "+val
                }
            	return val;
        	}).join(columnDelimiter).replaceAll("\r\n", " ").replaceAll("\n", " ");
            csv += lineDelimiter;
        });
        return csv;
    }, 

    downloadCSV : function(component, helper, csv) {
        const filename = 'accounts.csv';
        
        try {
            var action = component.get("c.uploadCSVFile");
            action.setParams({
                "csvContent": csv,
                "fileName": filename
            });
    
            action.setCallback(this, function(response) {
                var state = response.getState();
                console.log("response", response);
                if (state === "SUCCESS") {
                    // Handle success, e.g., display the Id of the created file
                    var fileId = response.getReturnValue();
                    console.log("File Id: " + fileId);

                    if($A.get("$Browser.formFactor") === "PHONE") {
                        var urlEvent = $A.get("e.force:navigateToURL");
                        urlEvent.setParams({
                            "url": "/"+fileId
                        });
                        urlEvent.fire();
                    } else {
                        window.open('/sfc/servlet.shepherd/document/download/'+fileId+'?operationContext=S1', '_blank');
                    }
                } else {
                    // Handle errors
                    console.error("Error: " + state);
                }
            });
    
            $A.enqueueAction(action);
        } catch(ex) {
            console.error(ex)
        }

        
    }
})