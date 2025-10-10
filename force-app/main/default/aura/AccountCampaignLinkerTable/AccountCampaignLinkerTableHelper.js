/**
 * Created by z003d6ye on 23.01.2019.
 */
({
    convertArrayOfObjectsToCSV: function(component, helper, data) {
        var columnDelimiter = ';';
        var lineDelimiter = '\n';
        
        var keys = [
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
        ];
        
        var csv = '';
        
        // Adding column headers
        csv += keys.join(columnDelimiter);
        csv += lineDelimiter;
        
        // Adding values
        data.forEach(function(item) {
            var row = keys.map(function(key) {
                var val = item[key] || '';
                
                if (key === "Phone") {
                    val = "P: " + val;
                }
                if (key === "Last_Sales_Visit_URL__c" || 
                    key === "Last_Training_Event_URL__c" || 
                    key === "Next_Planned_Training_Event_URL__c" || 
                    key === "Planned_Next_Sales_Visit_URL__c") {
                    
                    // Check if value contains anchor tag
                    if (val && val.indexOf('<a href=') > -1) {
                        var startIndex = val.indexOf('>') + 1;
                        var endIndex = val.indexOf('</a>');
                        if (startIndex > 0 && endIndex > -1) {
                            val = val.substring(startIndex, endIndex);
                        }
                    }
                }
                
                // Convert to string and clean up newlines
                val = String(val);
                val = val.split('\r\n').join(' ');
                val = val.split('\n').join(' ');
                
                // Escape double quotes
                val = val.split('"').join('""');
                
                // Wrap in quotes if necessary
                if (val.indexOf(columnDelimiter) > -1 || val.indexOf('"') > -1) {
                    val = '"' + val + '"';
                }
                
                return val;
            }).join(columnDelimiter);
            
            csv += row + lineDelimiter;
        });
        
        // Add UTF-8 BOM at the beginning
        csv = String.fromCharCode(65279) + csv;
        
        return csv;
    },

    downloadCSV: function(component, helper, csv) {
        var filename = 'accounts.csv';
        
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
                    var fileId = response.getReturnValue();
                    console.log("File Id: " + fileId);

                    if ($A.get("$Browser.formFactor") === "PHONE") {
                        var urlEvent = $A.get("e.force:navigateToURL");
                        urlEvent.setParams({
                            "url": "/" + fileId
                        });
                        urlEvent.fire();
                    } else {
                        window.open('/sfc/servlet.shepherd/document/download/' + fileId + '?operationContext=S1', '_blank');
                    }
                } else {
                    console.error("Error: " + state);
                    var errors = response.getError();
                    if (errors && errors[0] && errors[0].message) {
                        console.error("Error message: " + errors[0].message);
                    }
                }
            });

            $A.enqueueAction(action);
        } catch (ex) {
            console.error(ex);
        }
    }
})