/**
 * Created by z003d6ye on 17.05.2018.
 */
({
    setLocation : function(component, helper, location) {
        component.set("v.radius", component.get("v.radius") == null || component.get("v.radius") == 0 || component.get("v.radius") == "" ? 50 : component.get("v.radius"));
        helper.toggleDomElementVisibility('locationSuggestions', false);
        component.set("v.locationSearchTerm", location);
    },

    search: function(component, helper) {
        //alert('called 3')
        console.log('userAffiliateCode1>>',component.get("v.userAffiliateCode"));
        var event = null;
        var selectedLocation = component.get("v.locationSearchTerm");
        var selectedTerritories = component.get("v.selectedTerritories");
        var selectedTrainers = component.get("v.selectedTrainers");
        var selectedCampaigns = component.get("v.selectedCampaigns");
        var selectedLegalHierarchies = component.get("v.selectedLegalHierarchies");
        //alert('fine1')
        var selectedBusinessHierarchies = component.get("v.selectedBusinessHierarchies");
        var generalSearchTerm = component.get("v.generalSearchTerm").trim();
        var onlyMainAccounts = component.get("v.onlyMainAccounts");
        var excludeDoNotVisit = component.get("v.excludeDoNotVisit");
        var salesTargetFilterCode = component.get("v.salesTargetFilterCode");
        var selectedDisChannelFilter = component.get("v.selectedDisChannelFilter");
        //alert('fine2')
        var accountId = component.get("v.GETAccountId");
        var territoryId = component.get("v.GETTerritoryId");
		var accstats = component.get("v.accountStatus");
        var merchstats = component.get("v.selectedMerchantStatusFilter");

        let brands = component.get("v.selectedBrands");
       //alert('fine3')
     //   helper.showSpinner(component, null, "myModalSpinner");
		//alert('fine4')
        if(selectedLocation != null && selectedLocation !== "") {
//alert('okay')
            var params = {
                radius: component.get("v.radius") == null || component.get("v.radius") == 0 || component.get("v.radius") == "" ? 50 : component.get("v.radius"),
                unit: component.find("selectRadiusUnit").get("v.value"),
                selectedTerritories,
                selectedCampaigns,
                selectedLegalHierarchies,
                selectedBusinessHierarchies,
                searchTerm: generalSearchTerm,
                onlyMainAccounts: onlyMainAccounts,
                excludeDoNotVisit: excludeDoNotVisit,
                salesTargetFilterCode: salesTargetFilterCode,
                selectedDisChannelFilter,
                accStatusVal: accstats,
                merchantStatusVal: merchstats,
                brands
            };

            if(accountId !== '') {
                params.accountId = accountId;
            } else if(territoryId !== '') {
                params.territoryId = territoryId;
            }

//alert('why'+selectedLocation)
            helper.exec(
                component,
                helper,
                "c.getCoordinates",
                function(response) {
                    var state = response.getState();
					//alert('1'+state)
                    if(state === "SUCCESS") {
                        var ret = JSON.parse(response.getReturnValue());


                        if(ret.status === "INVALID_REQUEST") {

                            helper.showErrorToast(helper, ret.error_message);
                            helper.hideSpinner(component, null, "myModalSpinner");
                        } else {

                            params.lat = ret.results[0].geometry.location.lat;
                            params.lng = ret.results[0].geometry.location.lng;

                            helper.exec(
                                component,
                                helper,
                                "c.searchAccounts",
                                function(response) {

                                    var state = response.getState();
                                   //alert('2'+state)
                                    if(state === "SUCCESS") {

                                        var ret = response.getReturnValue();
                                        
                                            component.set("v.acc", ret);
                                            component.set("v.accDisplayed", ret);
                                            if(ret.length > 0) {
                                                var mapOptionsCenter = null;
                                                var mapData = Array();
                                                //cmp.set("v.opportunities", response.getReturnValue());
                                                mapOptionsCenter = {
                                                    "lat":params.lat,
                                                    "lng":params.lng
                                                };
                                                mapData.push({
                                                    "lat":params.lat,
                                                    "lng":params.lng,
                                                    "markerText": "This is the center",
                                                    "isViewedAccount":false,
                                                    "isCenter": true,
                                                    "icon": "",
                                                });
                                                //helper.createMapData(component, helper, ret);
                                                helper.createMapData(component, helper, ret, null, Array());
                                                helper.hideFilter();
                                            }
                                       
                                    } else {
                                        helper.showError(helper, response.getError());
                                        helper.hideSpinner(component, null, "myModalSpinner");
                                    }
                                },
                                params

                            );

                        }
                    } else {
                        helper.showError(helper, response.getError());
                        helper.hideSpinner(component, null, "myModalSpinner");
                        helper.hideFilter();
                    }
                },
                {commonAddress: selectedLocation}
            );

        } 
        else {
            //('here')

            var params = {
                searchTerm: generalSearchTerm,
                selectedTerritories,
                selectedTrainers,
                selectedCampaigns,
                selectedLegalHierarchies,
                selectedBusinessHierarchies,
                onlyMainAccounts: onlyMainAccounts,
                excludeDoNotVisit: excludeDoNotVisit,
                salesTargetFilterCode: salesTargetFilterCode,
                selectedDisChannelFilter,
                accStatusVal: accstats,
                merchantStatusVal: merchstats,
                brands 
            };


            if(accountId !== '') {
                params.accountId = accountId;
            } else if(territoryId !== '') {
                params.territoryId = territoryId;
            }


            if(generalSearchTerm === "" && selectedTerritories.value === "" && selectedTrainers.value === "" && selectedCampaigns.value === ""
            && selectedLegalHierarchies.value === "" && selectedBusinessHierarchies.value === "" && accountId === "" && territoryId ==="")
            {
                
                helper.showWarningToast(helper, "Please enter address and/or select select a territory, campaign, legal hierarchy and/or business hierarchy");
                helper.hideSpinner(component, null, "myModalSpinner");
                helper.unsetAll(component, helper);
            } else {
                helper.exec(
                    component,
                    helper,
                    "c.searchAccounts",
                    function(response) {
						//('i am here'+state)
                        var state = response.getState();
                        if(state === "SUCCESS") {

                            var ret = response.getReturnValue();
                            
                                component.set("v.acc", ret);
                                component.set("v.accDisplayed", ret);
                                //alert('i am changed')
                                if(ret.length > 0) {
                                    helper.createMapData(component, helper, ret, null, Array());
                                    helper.hideFilter();
                                } 
                                
                                else {
                                    helper.showWarningToast(helper, 'No accounts were found. Please redefine your criteria.');
                                    helper.hideSpinner(component, null, "myModalSpinner");
                                    helper.showFilter(component.get("v.theme"));
                                }
                            }

                         else {
                            helper.showError(helper, response.getError());
                        }
                    },
                    params

                );
            }
        }
    },

    createMapDataObject : function(component, helper, ret, mapOptionsCenter, mapData) {
        ret.map(account => {

            if(account.BillingLatitude && account.BillingLongitude) {
                if(mapOptionsCenter == null || mapOptionsCenter.lat == null || mapOptionsCenter.lng == null) {
                    component.set("v.mapBoundToMarkers", true);
                    mapOptionsCenter = {"lat":parseFloat(account.BillingLatitude), "lng":parseFloat(account.BillingLongitude)};
                }
            }

            try {
                var street = "", country = "",cityAndPostalCode = "";
                if(account.BillingAddress) {
                    var markerText = "<b><a target='_blank' href='/"+account.Id+"'>"+account.Name+"</a></b><br/>";
                    cityAndPostalCode = account.BillingAddress.postalCode+" "+account.BillingAddress.city+"</br>";
                    street = account.BillingAddress.street+"<br/>";
                    country = account.BillingAddress.country;
                }
                markerText += street + cityAndPostalCode + country;
                account.Address = account.BillingAddress.street+', '+account.BillingAddress.postalCode+', '+account.BillingAddress.city+', '+account.BillingAddress.country;
                var lat = account.GeoLocation__Latitude__s  != null ? account.GeoLocation__Latitude__s : account.BillingLatitude;
                var lng = account.GeoLocation__Longitude__s  != null ? account.GeoLocation__Longitude__s : account.BillingLongitude;

                var comboIconMap = new Map();

                var mapDataParams = {
                    "lat":lat,
                    "lng":lng,
                    "markerText":markerText,
                    "isViewedAccount":false,
                    "account":account,
                    "icon": "business",
                    "draggable": true,
                    "isMainAccount": account.isMainAccount__c,
                    
                };

                if(account.isMainAccount__c) {
                    mapDataParams.icon = "gold";
                }

                mapData.push(mapDataParams);
            } catch(ex) {
                console.error(ex);
            }
        })

        return {ret, mapData, mapOptionsCenter}

    },

    createMapData : function(component, helper, ret, mapOptionsCenter, mapData) {

        let mapDataObject = helper.createMapDataObject(component, helper, ret, mapOptionsCenter, mapData);
        //helper.logAsJSON('mapDataObject>>',mapDataObject);
        if(mapDataObject.mapOptionsCenter == null) {
            helper.hideSpinner(component, null, "myModalSpinner");
            helper.showErrorToast(helper, "No account has geolocation information. Please contact your Salesforce Administrator.");
        } else {
//            component.set('v.acc', []);
            component.set('v.accDisplayed', []);
            component.set('v.mapOptionsCenter', mapDataObject.mapOptionsCenter);
            //helper.logAsJSON('mapdata>>',mapDataObject.mapOptionsCenter);
            component.set('v.mapData', mapDataObject.mapData);
            component.set('v.mapBoundToMarkers', true);
//            component.set('v.acc', ret);
            component.set('v.accDisplayed',mapDataObject. ret);
            //helper.logAsJSON('accDisplayed>>',mapDataObject. ret);

            helper.hideFilter();
            helper.hideSpinner(component, null, "myModalSpinner");
            component.set("v.displayAffiliateMapContent", "inline-block");
        }


    },

    unsetAll : function(component, helper) {
        component.set('v.acc', []);
        component.set('v.accDisplayed', []);
        component.set('v.rowData', []);
        component.set('v.columnData', []);
    },

   resetFilter : function(component, helper) {
        component.set('v.selectedCampaigns', []);
        component.set('v.selectedLegalHierarchies', []);
        component.set('v.selectedBusinessHierarchies', []);
        component.set('v.selectedTerritories', []);
         
        component.set('v.generalSearchTerm', '');
        component.set('v.locationSearchTerm', '');
        component.set('v.selectedDisChannelFilter', '');
        component.set('v.onlyMainAccounts', false);
        component.set('v.excludeDoNotVisit', false);
        component.set('v.selectedBrands', '');

	    component.set('v.accountStatus', 'All');
    },          
                
                
    hideFilter : function() {
        try {
            document.getElementById("btnToggle").classList.remove("is-active");
//            document.getElementById('filter-container').style.width = '0px';
            document.getElementById('filter-container').classList.add('hide')
        } catch(ex) {
            console.log(ex);
        }
    },

    showFilter : function(theme) {
        try {
            document.getElementById('filter-container').classList.remove('hide');
            document.getElementById("btnToggle").classList.add("is-active");
//            if(theme === "Theme4t") {
//                document.getElementById('filter-container').style.width = '100%';
//            } else {
//                document.getElementById('filter-container').style.width = '300px';
//            }
        } catch(ex) {

        }
    },


})