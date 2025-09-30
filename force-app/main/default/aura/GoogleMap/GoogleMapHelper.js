({
    sendToVF : function(component, helper, state) {
        if(!state) {
            state = "INIT";
        }
        //Prepare message in the format required in VF page
        var message = {
                'state': state,
                "loadGoogleMap" : true,
                "mapData": component.get('v.mapData'),
                "mapOptions": component.get('v.mapOptions'),
                'mapOptionsCenter': component.get('v.mapOptionsCenter'),
                'mapBoundToMarkers': component.get('v.mapBoundToMarkers'),
                'onlyMainAccounts': component.get('v.onlyMainAccounts'),
            	'accountStatus':component.get('v.accountStatus'),
                "unit": component.get("v.unit"),
                "colorByLegalHierarchy": component.get("v.colorByLegalHierarchy"),
                "colorByTerritory": component.get("v.colorByTerritory"),
                "selectedViewOption": component.get("v.selectedViewOption")

        } ;

        //Send message to VF
        helper.sendMessage(component, helper, message);
    },
    sendMessage: function(component, helper, message){
        //Send message to VF
        message.origin = window.location.hostname;
        try {
           var vfWindow = component.find("vfFrame").getElement().contentWindow;
           vfWindow.postMessage(JSON.parse(JSON.stringify(message)), component.get("v.vfHost"));
        } catch(ex) {

        }

    }
})