({
	doInit : function(component, event, helper) {
//	    console.log("v.mapData", JSON.stringify(component.get("v.
//	    ")));
	    //Send LC Host as parameter to VF page so VF page can send message to LC; make it all dynamic
        component.set('v.lcHost', window.location.hostname);
        if(component.get("v.mapOptions").length < 0) {
            component.set("v.mapOptions", {
               zoom: 15
            });
        }

  		//Add message listener
        window.addEventListener("message", function(event) {
            //Can enable origin control for more security
            //if (event.origin != vfOrigin) {
                //console.log('Wrong Origin');
                // Not the expected origin: Reject the message!
                //return;
            //}

            // Handle the message
            if(event.data.state == 'LOADED'){
                //Set vfHost which will be used later to send message
                component.set('v.vfHost', event.data.vfHost);

                //Send data to VF page to draw map
                helper.sendToVF(component, helper);
            } else if(event.data.state == 'GEOLOCATIONUPDATE')
            {
                console.log("GEOLOCATIONUPDATE", JSON.parse(JSON.stringify(event.data)));

                var geoLocationUpdateEvent = component.getEvent("geoLocationUpdateEvent");
                try {
                    geoLocationUpdateEvent.setParams({
                        "lat": event.data.lat,
                        "lng": event.data.lng,
                        "accountId": event.data.accountId
                    });

                    geoLocationUpdateEvent.fire();
                } catch(ex) {
//                    console.error(ex);
                }
            } else if(event.data.state == 'MAIN_ACCOUNT_SWITCH') {
                  
                var mainAccountSwitchEvent = component.getEvent("mainAccountSwitchEvent");
                try {
                    mainAccountSwitchEvent.setParams({
                        "onlyMainAccounts": event.data.onlyMainAccounts
                    });
                    mainAccountSwitchEvent.fire();
                } catch(ex) {
//                    console.error(ex);
                }

            } else if(event.data.state == 'MARKER_TOGGLE_EVENT') {
                  
                var markerToggleEvent = component.getEvent("markerToggleEvent");
                try {
                    console.log("event.data.visibleAccounts", event.data.visibleAccounts);
                    markerToggleEvent.setParams({
                        "visibleAccounts": event.data.visibleAccounts
                    });
                    markerToggleEvent.fire();
                } catch(ex) {
//                    console.error(ex);
                }

            } else if(event.data.state == 'Account_Status'){
                var accountstatusevent = component.getEvent("accountstatusevent");
                 
                try {
                    accountstatusevent.setParams({
                        "accountStatusVal": event.data.accountStatusValue
                    });
                    accountstatusevent.fire();
                } catch(ex) {
             //       alert(ex);
                }
             }else if(event.data.state == 'CREATE_EVENT')
               {
                  var createEventForAccount = component.getEvent("createEventForAccount");
                  try {
                      createEventForAccount.setParams({
                          "accountId": event.data.accountId
                      });
                      createEventForAccount.fire();
                  } catch(ex) {
  //                    console.error(ex);
                  }
               }
        }, false);
	},

	handleSelectedViewOptionChange : function(component, event, helper) {
        var message = {
            'state': 'CHANGE_VIEW',
            type: event.getParam("value"),
        };
        helper.sendMessage(component, helper, message);
    },

    handleRowActionEvent : function(component, event, helper) {
        var row = JSON.parse(JSON.stringify(event.getParam("row")));
        var accountId = null;
        accountId = row.id.value;
        var message = {
            'state': 'MARKER_BOUNCE',
            accountId: accountId
        };
        helper.sendMessage(component, helper, message);
        window.scrollTo(0,0);
    },

    handleMapDataChange : function(component, event, helper) {
//        var rowData = JSON.parse(JSON.stringify(event.getParam("rowData")));
         if(component.get("v.vfHost") != null && component.get("v.vfHost")  !== '') {
               helper.sendToVF(component, helper, "UPDATE");
         }

    },

})