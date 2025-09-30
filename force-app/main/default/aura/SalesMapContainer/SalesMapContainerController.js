/**
 * Created by z003d6ye on 04.05.2018.
 */
({
    /*
        init function to set columns for account table, default value for location search
        checking user access and setting selected view option based on user function and creating code map for
        sales target filter options
    */
    doInit: function(component, event, helper) {
        
        component.set("v.brandOptions", [
            { label: "Signia", value: "Signia"}, 
            { label: "Signia US", value: "Signia US"}, 
            { label: "Widex", value: "Widex" },
            { label: "Rexton US", value: "Rexton US"}
        ]);

        component.set("v.searchTags", []);
        component.set("v.columnData", [
              {
                  label: "Customer Number",
                  fieldName: "Bill_to_Number__c"
              },
              {
                  label: "Name",
                  fieldName: "Name"
              },
              {
                label: "Brand",
                fieldName: "Brand_Logo__c"
                },
              {
                  label: "Address",
                  fieldName: "Address"
              },
              {
                  label: "Territory",
                  fieldName: "Territory__r.Name"
              },
              {
                  label: "Segment (POS)",
                  fieldName: "Segment_Icon_POS__c"
              },
              {
                  label: "Segment (Owner)",
                  fieldName: "Segment_Icon_Owner__c"
              },
              {
                  label: "Legal Hierarchy",
                  fieldName: "Customer_Hierarchy_2_Description__r.Name"
              },
              {
                  label: "Business Hierarchy",
                  fieldName: "Pricing_Terms_Descripton__r.Name"
              },
              {
                  label: "Distribution Channel",
                  fieldName: "Distribution_Channel__c"
              },
            {
                  label: "Account Status",
                  fieldName: "Account_Status__c"
              },
        ]);
            
        component.set("v.columnDataFR", [
              {
                  label: "Customer Number",
                  fieldName: "Bill_to_Ship_to_text__c"
              },
              {
                  label: "Name",
                  fieldName: "Name"
              },
              {
                  label: "Address",
                  fieldName: "Address"
              },
              {
                  label: "Territory",
                  fieldName: "Territory__r.Name"
              },
              {
                  label: "Segment (POS)",
                  fieldName: "Segment_Text_POS1__c"
              },
              {
                  label: "Segment (CG)",
                  fieldName: "Segment_Text_CG__c"
              },
              {
                  label: "Legal Hierarchy",
                  fieldName: "Customer_Hierarchy_2_Description__r.Name"
              },
              {
                  label: "Business Hierarchy",
                  fieldName: "Pricing_Terms_Descripton__r.Name"
              },
              {
                  label: "Distribution Channel",
                  fieldName: "Distribution_Channel__c"
              },
             {
                  label: "Account Status",
                  fieldName: "Account_Status_only_Status__c"
              },
              {
                label: "Brands",
                fieldName: "Brands__c"
            },
        ]);

        console.log("columnData", component.get("v.columnData"))
		//console.log("columnDataFR>>",columnDataFR);
        //        helper.checkUser(component, helper);
        helper.showSpinner(component, event, "myAppSpinner");
        var mapOptions = {
            disableDefaultUI: true,
            zoom: 15,
            gestureHandling: 'cooperative'
        };
        component.set("v.mapOptions", mapOptions);
        helper.exec(
            component,
            helper,
            "c.getUIThemeDescription",
            function(response) {
                var state = response.getState();
                
                if(state === "SUCCESS") {
                    var theme = response.getReturnValue();
                    component.set("v.theme", theme);
                    var mapHeight = 600;
                    var gridClass = "slds-grid";
                    
                    if(theme === "Theme4t" && window.innerWidth < 1024) {
                        gridClass += "_vertical";
                        mapHeight = 400;
                    }
                    component.set("v.gridClass", gridClass);
                    component.set("v.mapHeight", mapHeight);
                }
            }
        );
        helper.exec( 
            component,
            helper,
            "c.getUser",
            response => {
                var state = response.getState();
                if(state === "SUCCESS") {
                    var user = response.getReturnValue();
                    var userAffiliate = user.Affiliate_Code_from_Affiliate__c;
                	console.log("user", user);
                	console.log("user.WSA_Affiliates__c", user.WSA_Affiliates__c);
                    if(user.WSA_Affiliates__c !== undefined) {
                        var userWSAAffiliatesList = user.WSA_Affiliates__c.split(";");
                        if(userWSAAffiliatesList.length > 0) {
                            var tempList = Array();
                            for(let i = 0; i < userWSAAffiliatesList.length; i++)  {
                                tempList.push('\''+userWSAAffiliatesList[i]+'\'');
                            }
                            component.set("v.userWSAAffiliates", "("+tempList.join(',')+")");
                        }
    					console.log("userWSAAffiliates", component.get("v.userWSAAffiliates"));
                    }
                
                	
                	
            		component.set("v.userAffiliateCode",userAffiliate);
                	//console.log('userAffiliateCode>>',component.get("v.userAffiliateCode"));
                    component.set("v.user", user);
                    var userFunction = user.Sivantos_Department_del__c;
                    component.set("v.userFunction", userFunction);

                    var validCodes = ['AS-DE', 'S-DE-AD', 'S-DE-AVL', 'S-DE-CEWS', 'W-DE'];
                    component.set("v.showMerchantStatusFilter", validCodes.includes(userAffiliate));

                    helper.exec(
                        component,
                        helper,
                        "c.init",
                        function(response) {
                            var state = response.getState();
                            if(state === "SUCCESS") {
                                var dataMap = JSON.parse(JSON.stringify(response.getReturnValue()));
                                let disChannelOptions = [{
                                    value: "All",
                                    label: "All",
                                    selected:true
                                }];

                                for(var value in dataMap["disChannelOptions"]) {
                                    disChannelOptions.push({
                                        value,
                                        label : dataMap["disChannelOptions"][value]
                                    })
                                }

                                component.set("v.disChannelOptions", disChannelOptions);


                                var viewOpts = [];
                                ["Last Sales Visit", "Last Training Event", "Segmentation (POS)", "Territory", "Distribution Channel"].map(item=> {
                                    viewOpts.push({
                                        class: "optionClass",
                                        label: item,
                                        value: item
                                    })
                                })
    							if((!userAffiliate.startsWith('S-FR') && !userAffiliate.startsWith('W-FR')) || user.Profile.PermissionsModifyAllData) {
                                    viewOpts.push({
                                        class: "optionClass",
                                        label: "Segmentation (Owner)",
                                        value: "Segmentation (Owner)",
                                    });
                                }
    							if(userAffiliate.startsWith('S-FR') || userAffiliate.startsWith('W-FR') || user.Profile.PermissionsModifyAllData) {
                                    viewOpts.push({
                                        class: "optionClass",
                                        label: "Segmentation (CG)",
                                        value: "Segmentation (CG)",
                                    });
                                }
                                
                                if(userAffiliate.startsWith('S-DE') || userAffiliate.startsWith('AS-DE') || user.Profile.PermissionsModifyAllData) {
                                    viewOpts.push({
                                        class: "optionClass",
                                        label: "Händlerstatus",
                                        value: "Händlerstatus",
                                    });
                                }
                                component.set("v.viewOptions", viewOpts);

                                if(!user.Profile.PermissionsModifyAllData) {
                                    if(userFunction === "Inside Sales" || userFunction === "Sales Rep" || userFunction == "Audiology Trainer") {
                                        let territories = dataMap["territories"];
                                        
                                        if(userFunction != "Audiology Trainer"){
                                            component.set("v.selectedTerritories",territories);
                                        }
                                        
                                        let trainers = dataMap["trainers"];
                                        component.set("v.selectedTrainers",trainers);
                                        
                                        if(userFunction != "Audiology Trainer" && territories.length == 0) {
                                            helper.showWarningToast(helper, "No assigned territories for you were found." );
                                        }else {


                                            var viewOption = "--None--";
                                            var territorySearchTagCloseable = true;

                                            if(userFunction === "Sales Rep") {
                                                viewOption = "Last Sales Visit";
                                                component.find("selectViewOptions").set("v.value", viewOption);
                                                component.set("v.selectedViewOption", viewOption);
                                                territorySearchTagCloseable = false;
                                            } else if(userFunction === "Audiology Trainer") {
                                                viewOption = "Last Training Event";
                                                component.find("selectViewOptions").set("v.value", viewOption);
                                                component.set("v.selectedViewOption", viewOption);
                                            }  else if(territories.length > 0) {
                                                viewOption = "Territory";
                                                component.set("v.colorByTerritory", true);
                                                component.set("v.selectedViewOption", "Territory");
                                                component.find("selectViewOptions").set("v.value", "Territory");
                                            }

                                            helper.search(component, helper);
                                        }
                                        
                                    }
                                }
                                
                                helper.hideSpinner(component, event, "myAppSpinner");
                            } else {
                                helper.showError(helper, response.getError());
                                helper.hideSpinner(component, event, "myAppSpinner");
                            }
                        }
                    )
                } else {
                    helper.showError(helper, response.getError());
                    helper.hideSpinner(component, event, "myAppSpinner");
                }
            }
        );


        component.set("v.salesTargetOptions", [
            {
                label : "All accounts",
                value : null
            },
            {
                label : "Visit Target reached",
                value : 1
            },
            {
                label : "Visit Target not reached",
                value : 2
            },
            {
                label : "Training Target reached",
                value : 3
            },
            {
                label : "Training Target not reached",
                value : 4
            }
        ]);

        component.set("v.salesTargetFilterCode", null);

        component.set("v.selectedLocation" ,{
            value:"",
            label:""
        } );

	//fetch account status
    },



    /*
        action when user clicks Enter on keyboard in search input
    */
    handleLoadAccountsKeyPress : function(component, event, helper) {
        if(event.getParam('keyCode') == 13) {
            helper.search(component, helper);
        }
    },

    /*
        action when user clicks on search buttons
    */
    handleSearchButtonClick : function(component, event, helper) {
        helper.search(component, helper);
    },
	
        
       /*
        action when user clicks on reset buttons
    */   
      handleResetButtonClick : function(component, event, helper) {
        helper.resetFilter(component, helper);
    },
    /*
        action to toggle onlyMainAccounts based on checkbox checked value
    */
    handleMainAccountChange : function(component, event, helper) {
        component.set("v.onlyMainAccounts",  event.currentTarget.checked);
    },
    handleExcludeDoNotVisitChange : function(component, event, helper) {
        component.set("v.excludeDoNotVisit",  event.currentTarget.checked);
    },
    handleaccountstatusevent: function(component, event, helper) {
        // alert(event.getParam("accountStatusVal"))
        component.set("v.accountStatus",component.find("selectedstatusChannel").get("v.value") );
       // component.set("v.accountStatus",  event.getParam("accountStatusVal"));
       // alert('called 2');
       // helper.search(component, helper)
    },

    /*
        action to toggle visibility of the filter container
    */
    toggleFilterContainerVisibility : function(component, event, helper) {
        var filterContainer = document.getElementById("filter-container");
        var theme = component.get("v.theme");

        if(filterContainer.classList.contains("hide")) {
            helper.showFilter(theme);
        } else {
            helper.hideFilter();
        }
    },

    /*
        action to hide location suggestion window
    */
    closeLocationSuggestionsWindow : function(component, event, helper) {
      document.getElementById("locationSuggestions").style.display = 'none';
    },

    /*
        action to show location suggestion window
    */
    showLocationSuggestionsWindow : function(component, event, helper) {
      document.getElementById("locationSuggestions").style.display = 'block';
    },

    /*
         action when user clicks on location suggestion
    */
    handleLocationSuggestionItemClick : function(component, event, helper) {
        var location = event.currentTarget.innerHTML;
        helper.setLocation(component, helper, location);
    },

    /*
         action when user types in location input field
         uses a timer to delay callout to apex controller
    */
    handleInputSearchLocationChange: function(component, event, helper) {
        var keyCode = event.getParam('keyCode');
        var searchTerm = component.get("v.locationSearchTerm");
        if(keyCode == 27 || searchTerm.trim() === '' || searchTerm.length < 3) {
            document.getElementById("locationSuggestions").style.display = 'none';
        } else if(keyCode == 13) {
            var locations = component.get("v.lastLocationSuggestions");
            var address = "";
            if(locations.length > 0) {
                address = locations[0];
            }
            helper.setLocation(component, helper, address);
            
        } else {
            var timer = component.get('v.timer');
            clearTimeout(timer);
            var timer = setTimeout(function(){
                helper.showSpinner(component, event, "myLocationSpinner");
                helper.exec(
                    component,
                    helper,
                    "c.getLocation", 
                    function(response) { 
                        var state = response.getState();
                        if(state === "SUCCESS") {

                            var res = JSON.parse(response.getReturnValue());
                            component.set("v.lastLocationSuggestions", res);
                             document.getElementById("locationSuggestions").style.display = 'block';
                            helper.hideSpinner(component, event, "myLocationSpinner");
                        } else {
                            helper.showError(helper, response.getError());
                            
                        }
                    },
                    {searchTerm: searchTerm}
                );
                clearTimeout(timer);
                component.set('v.timer', null);
            }, 150);
            component.set('v.timer', timer);
        }
    },

    /*
        callback for event when user toggles main accounts
        the Event gets fired in GoogleMapController.js of GoogleMap.cmp
    */
    handleGeoLocationUpdateEvent: function(component, event, helper) {
        var accountId = event.getParam("accountId");
        var lat = event.getParam("lat");
        var lng = event.getParam("lng");
        
        helper.exec(
            component,
            helper,
            "c.updateAccountGeoLocation",
            function(response) {
                if(response.getState() === "SUCCESS") {
                    var updateResponse = response.getReturnValue();
                    if(updateResponse.state === 'true') {
                        helper.showSuccessToast(helper, updateResponse.message);
                    } else {
                        helper.showErrorToast(helper, updateResponse.message);
                    }
                    
                } else {
                    helper.showError(helper, response.getError());
                }
            },
            {
                accountId: accountId,
                lat: lat,
                lng: lng
            }
        )
    },

    /*
        callback for event when user toggles main accounts
        the Event gets fired in GoogleMapController.js of GoogleMap.cmp
    */
    handleMainAccountSwitchEvent : function(component, event, helper) {
        
        var onlyMainAccounts = event.getParam("onlyMainAccounts");
        document.getElementById('cbOnlyMainAccounts').checked = onlyMainAccounts;
        component.set("v.onlyMainAccounts", onlyMainAccounts);
        helper.search(component, helper);
    },

    handleMarkerToggleEvent : function(component, event, helper) {
        
        component.set("v.markerFilter", true);

        var visibleAccounts = event.getParam("visibleAccounts");
        console.log("visibleAccounts in SalesMapContainerController", visibleAccounts);
        // helper.search(component, helper);

        let allAccounts = component.get("v.acc");

        let accountsDisplayed = [];

        for(let i = 0; i < allAccounts.length; i++) {
            if(visibleAccounts.includes(allAccounts[i].Id)) {
                accountsDisplayed.push(allAccounts[i])
            }
        }
        component.set("v.accDisplayed", accountsDisplayed)
    },

    /*
        Schedule Event button was clicked on marker

    */
    handleCreateEventForAccount : function(component, event, helper) {

        var accountId = event.getParam("accountId");
        component.set("v.createEventAccountId", accountId);
        component.set("v.showCreateEventModal", true) ;
    },

    /*
        Callback function to handle event creation
    */
    handleCreateEventClicked : function(component, event, helper) {
        var createEventClicked = component.get("v.createEventClicked");
        if(createEventClicked) {
            component.set("v.showCreateEventModal", false);
            component.set("v.createEventAccountId", null);
        }
    },

    /*
        Selected View Option has changed
    */
    handleViewChange : function(component, event, helper) {
        var option = component.find("selectViewOptions").get("v.value");
       // helper.changeView(helper, option);
       component.set("v.selectedViewOption", option);
       component.set("v.accDisplayed", component.get("v.acc"));
    },
      
    handleAccountCampaignLinkerRowActionEvent : function(component, event, helper) {
    	var action = component.get("v.actionType");
       // alert(JSON.stringify(component.get("v.row")));
        
    },
    /*
        selected Sales Target has changed
    */
    onSalesTargetSelectChange : function(component, event, helper) {
        var selectedSalesTargetFilter = component.find("selectSalesTarget").get("v.value");
        var salesTargetOptions = component.get("v.salesTargetOptions");
        for(var i in salesTargetOptions) {
            if(salesTargetOptions[i].label === selectedSalesTargetFilter) {
                component.set("v.salesTargetFilterCode", salesTargetOptions[i].value);
                break;
            }
        }

    },
    
    /*
        selected Brands has changed
    */
    onBrandsChange : function(component, event, helper) {
        component.set("v.selectedBrands", component.find("selectBrands").get("v.value") );
    },
    
    /*
        selected Distribution Channel has changed
    */
    onDisChannelChange : function(component, event, helper) {
        component.set("v.selectedDisChannelFilter",component.find("selectedDisChannel").get("v.value") );
    },
        
	onHandleMerchantStatusChange : function(component, event, helper) {
        component.set("v.selectedMerchantStatusFilter",component.find("selectedMerchantStatusChannel").get("v.value") );
    },

     /*
        list of displayed account has changed due to search AccountCampaignLinkerTable
    */
    handleTableSearchChange : function(component, event, helper) {
        var timer = component.get('v.timer');
        clearTimeout(timer);
        var timer = setTimeout(() => {
            let accDisplayed = helper.filterRowData(component, helper, component.get("v.acc"), component.get("v.columnData"), component.get("v.tableSearchTerm"));
            if(accDisplayed.length > 0) {
                let mapData = helper.createMapDataObject(component, helper, accDisplayed, null, Array()).mapData;
                component.set("v.mapData", mapData);
                component.set("v.accDisplayed", accDisplayed);
            } else {
                helper.showWarningToast(helper, "For your search no accounts were found in the list of accounts");
       
            }

            clearTimeout(timer);
            component.set('v.timer', null);
        }, 350);
        component.set('v.timer', timer);
    },



})