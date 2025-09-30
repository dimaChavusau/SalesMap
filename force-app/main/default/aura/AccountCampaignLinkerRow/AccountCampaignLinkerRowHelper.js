/**
 * Created by z003d6ye on 14.03.2019.
 */
({

    fireRowAction : function(component, helper) {
        //alert(json.stringify(component.get("v.row")));
        //alert(JSON.stringify(component.get("v.row")));
        //alert(component.get("v.actionType"));
        var evt = component.getEvent("accountCampaignLinkerRowActionEvent");
        evt.setParam('row', component.get("v.row"));
        evt.setParam('actionType', component.get("v.actionType"));
        if(component.get("v.actionType") == 'openAccount'){
            
             var urlString = window.location.href;
 			var baseURL = urlString.substring(0, urlString.indexOf("m/"));
            baseURL = baseURL + "m/" + component.get("v.row").Id;
            window.open(baseURL);
 		
        }
        evt.fire();
    }
})