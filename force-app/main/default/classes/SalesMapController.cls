/**
 * Created by z003d6ye on 04.05.2018.
 */

public with sharing class SalesMapController {


    @AuraEnabled
    public static User getUser() {

        return [
                select Id, Name, Profile.Id, Profile.Name, Affiliate_Code__c, Affiliate_Code_from_Affiliate__c, Profile.PermissionsModifyAllData, Sivantos_Department_del__c, UserRoleId, WSA_Affiliates__c
                from User
                where id = :System.UserInfo.getUserId()
        ];
    }

    @AuraEnabled
    public static Map<String, Object> init() {

        Map<String, Object> dataMap = new Map<String, Object>();
        List<AccountCampaign__c> listAccountCampaign = new List<AccountCampaign__c>();
        List<Territory__c> territories = new List<Territory__c>();
        List<User> trainers = new List<User>();
        List<Customer_Groups__c> legalHierarchies = new List<Customer_Groups__c>();
        List<Customer_Groups__c> businessHierarchies = new List<Customer_Groups__c>();
        String prodtrainer = 'Audiology Trainer';
        

        User u = SalesMapController.getUser();
        Id userId = u.Id;
        String userFunction = u.Sivantos_Department_del__c;
        Boolean isAdmin = u.Profile.PermissionsModifyAllData;
        List<String> userAff = u.Affiliate_Code__c.split(',');
        Set<Id> userIds = new Set<Id>();
        String territoryQuery = 'select Id, Name, User__r.Name, User__c from Territory__c';
        if (!isAdmin) {
            if (userFunction == 'Sales Manager') {
                userIds = RoleHierarchyHelper.getSubRoleUserIdsByRoleId(new Set<Id>{
                        u.UserRoleId
                });
                territoryQuery += ' where User__c in :userIds';
            } else if (userFunction == 'Sales Rep') {
                territoryQuery += ' where User__c = :userId';
            } else if (userFunction == 'Inside Sales') {
                territoryQuery += ' where Inside_Sales_Rep__c = :userId';
            } else if (userFunction == 'Audiology Trainer') {
                territoryQuery += ' where Trainer__c = :userId';
            } else {
                territoryQuery += ' where User__r.Affiliate_Code__c in :userAff';
            }
        }

        territoryQuery += ' limit 100';

        territories = Database.query(territoryQuery);
        dataMap.put('territories', territories);
        
        String userAffCode = u.Affiliate_Code_from_Affiliate__c;
        String currUserId = System.UserInfo.getUserId();
        String userQuery = 'select Id, Name, Sivantos_Department_del__c from User';
        if (!isAdmin) {
            userQuery += ' where Affiliate_Code_from_Affiliate__c = :userAffCode and Sivantos_Department_del__c = :prodtrainer and Id = :currUserId';
        }

        userQuery += ' limit 20';

        trainers = Database.query(userQuery);
        dataMap.put('trainers', trainers); 

        Set<Id> territoryIds = new Set<Id>();
        for (Territory__c t : territories) {
            territoryIds.add(t.Id);
        }
        List<Campaign> listCampaign;
        if (!isAdmin) {
            listCampaign = [select Id, Name from Campaign where CreatedById = :u.Id];
        } else {
            listCampaign = [select Id, Name from Campaign limit 20];
        }
        dataMap.put('campaigns', listCampaign);
        legalHierarchies = SalesMapController.getCustomerGroups('', 'Strategic Group');
        dataMap.put('legalHierarchies', legalHierarchies);
        businessHierarchies = SalesMapController.getCustomerGroups('', 'Pricing Terms');
        dataMap.put('businessHierarchies', businessHierarchies);

        //Distribution Channel Values
        Map<String, String> disChannelOptions = new Map<String, String>();
        Schema.DescribeFieldResult fieldResult = Account.Distribution_Channel__c.getDescribe();
        List<Schema.PicklistEntry> ple = fieldResult.getPicklistValues();
        for (Schema.PicklistEntry pickListVal : ple) {
            disChannelOptions.put(pickListVal.getValue(), pickListVal.getLabel());
        }
        dataMap.put('disChannelOptions', disChannelOptions);

        return dataMap;
    }

    @AuraEnabled
    public static List<Affiliate__c> getAllAffiliates() {
        return [select Id, Name, Affiliate_Code__c from Affiliate__c where isActive__c = true order by name];
    }

    @AuraEnabled
    public static String getLocation(String searchTerm) {

        Set<String> locations = new Set<String>();

        List<Account> accounts = getAccountsByAddress(searchTerm);
        for (Integer i = 0; i < accounts.size(); i++) {
            locations.add(accounts[i].BillingPostalCode + ', ' + accounts[i].BillingCity + ', ' + accounts[i].BillingCountry);
        }

        return JSON.serialize(locations);

    }

    @AuraEnabled
    public static List<Account> getAccountsByAddress(String searchTerm) {

        List<String> listSearchTerms = new List<String>();


        Id userId = System.UserInfo.getUserId();
        User currentUser = SalesMapController.getUser();
        Boolean isAdmin = currentUser.Profile.PermissionsModifyAllData;
        String userFunction = currentUser.Sivantos_Department_del__c;
        String userAffiliateCode = currentUser.Affiliate_Code__c;
        List<String> listUserAffiliateCode = userAffiliateCode.split(',');

        if (searchTerm.indexOf(',') != -1) {
            listSearchTerms = searchTerm.split(',');
        } else {

            if (searchTerm.indexOf(' ') != -1) {
                listSearchTerms = searchTerm.split(' ');
            } else {
                if (searchTerm <> null) {
                    searchTerm = '%' + searchTerm + '%';
                } else {
                    searchTerm = '%%';
                }
            }

        }


        String query = ' select BillingAddress, BillingPostalCode, BillingCity, BillingStreet, BillingCountry' +
                ' from Account';

        if (listSearchTerms.isEmpty()) {
            query += ' where (BillingPostalCode like :searchTerm' +
                    ' or BillingStreet like :searchTerm' +
                    ' or BillingCity like :searchTerm' +
                    ' or BillingCountry like :searchTerm' +
                    ' or Name like :searchTerm) and BillingPostalCode != null and BillingCity != null and BillingCountry != null';
        } else {
            for (Integer i = 0; i < listSearchTerms.size(); i++) {
                String st = '%' + listSearchTerms[i].trim() + '%';

                if (i == 0) {
                    query += ' where';
                }
                if (i > 0 && i < listSearchTerms.size()) {
                    query += ' and';
                }

                if (st.isNumeric()) {
                    query += '(BillingPostalCode = \'' + st + '\')';

                } else {
                    query += '(BillingPostalCode like \'' + st + '\'' +
                            ' or BillingStreet like \'' + st + '\'' +
                            ' or BillingCity like \'' + st + '\'' +
                            ' or BillingCountry like \'' + st + '\'' +
                            ' or Name like \'' + st + '\')';
                }

            }

            query += ' and BillingPostalCode != null and BillingCity != null and BillingCountry != null';
        }

        query += ' limit 10';
        System.debug('query ' + query);
        return Database.query(query);
    }

    @AuraEnabled
    public static List<Account> getAccountsByAffiliate(String affiliates, String territories, Integer lmt) {

        List<String> affiliateList = affiliates.split(',');
        List<String> userAffiliateCode = [select Affiliate_Code__c from User where Id = :System.UserInfo.getUserId()].Affiliate_Code__c.split(',');
        String query = ' select id, name, BillingAddress, BillingLatitude, BillingLongitude, Bill_to_Ship_to_text__c,' +
                ' Territory__r.Name, Last_Sales_Visit__c, Planned_next_Sales_Visit__c, Segment_Text_CG__c, Segment_Text_POS1__c, Segment_Text_Owner__c' +
                ' from Account' +
                ' where Affiliate__r.Affiliate_Code__c like :affiliateList and Affiliate_Code__c in :userAffiliateCode';

        if (territories != '' && territories != null) {
            List<String> territoriesList = territories.split(',');
            query += ' and Territory__r.Name like :territoriesList';
        }

        query += ' and (Status_Code__c = \'2\' or Status_Code__c = \'A\')';

        if (lmt > 0) {
            query += ' limit :limit';
        }
        return DataBase.query(query);
    }

    @AuraEnabled
    public static List<Territory__c> getTerritoriesByAffiliate(String affiliate) {
        affiliate = '%' + affiliate + '%';
        List<Territory__c> territories = [
                Select Id, Name, User__r.Name
                from Territory__c
                where User__r.Affiliate_Code__c like :affiliate
                and User__r.Profile.PermissionsModifyAllData = false
                and User__r.Name <> 'Technician Admin'
                order by Name
        ];
        return territories;
    }

    @AuraEnabled
    public static List<Customer_Groups__c> getCustomerGroups(String searchTerm, String groupType) {
        String query = '';

        List<String> listSearchTerms = new List<String>();
        if (searchTerm <> null) {
            if (searchTerm.indexOf(',') != -1) {
                listSearchTerms = searchTerm.split(',');
            } else {
                searchTerm = '%' + searchTerm + '%';
            }
        } else {
            searchTerm = '%%';
        }

        System.debug('listSearchTerms ' + listSearchTerms);
        System.debug('searchTerm ' + searchTerm);
        if (!listSearchTerms.isEmpty()) {
            for (Integer i = 0; i < listSearchTerms.size(); i++) {
                listSearchTerms[i] = '%' + listSearchTerms[i].trim() + '%';
            }
            System.debug('listSearchTerms formatted' + listSearchTerms);
            query = 'select Id, Name from Customer_Groups__c where Name like :listSearchTerms';
        } else {
            query = 'select Id, Name from Customer_Groups__c where Name like :searchTerm';
        }

        if (groupType != null) {
            query += ' and Account_Group_Typ__c = :groupType';
        }
        query += ' limit 30';
        System.debug('customer group query: ' + query);
        return Database.query(query);

    } 
 
    /*
    Searches for accounts via SOQL based on given parameters
    @param String searchTerm - value of free text search
    @param Decimal Radius
    @param String Unit - Miles (mi) or Kilometers (km)
    @param List<Campaign> selectedCampaigns
    @param List<Territory__c> selectedTerritories
    @param List<Customer_Groups__c> selectedLegalHierarchies
    @param List<Customer_Groups__c> selectedBusinessHierarchies
    @param Decimal lat
    @param Decimal lng
    @param Boolean onlyMainAccounts - either select all or only accounts where isMainAccount__c == true
    @param Boolean excludeDoNotVisit - either select all or only accounts where Do_not_visit__c == false
    @param String accountId - can bet set via get parameter
    @param String territoryId - can bet set via get parameter
    @param Integer salesTargetFilterCode
    @param String selectedDisChannelFilter
    @return list of accounts
     */
    @AuraEnabled
    public static List<Account> searchAccounts(
            String searchTerm,
            Decimal radius,
            String unit,
            List<Campaign> selectedCampaigns,
            List<Territory__c> selectedTerritories,
        	List<User> selectedTrainers,
            List<Customer_Groups__c> selectedLegalHierarchies,
            List<Customer_Groups__c> selectedBusinessHierarchies,
            Decimal lat,
            Decimal lng,
            Boolean onlyMainAccounts,
            Boolean excludeDoNotVisit,
            String accountId,
            String territoryId,
            Integer salesTargetFilterCode,
            String selectedDisChannelFilter,
            String accStatusVal,
            String merchantStatusVal,
            String brands
    ) {

        List<Account> resultAccounts = new List<Account>();
        Set<Id> accountIdsByCampaignMember = new Set<Id>();

        if (!selectedCampaigns.isEmpty()) {
            Set<Id> ids = createSetFromList(selectedCampaigns);
            for (CampaignMember cm : [select AccountId__c from CampaignMember where CampaignId in :ids limit 50000]) {
                accountIdsByCampaignMember.add(cm.AccountId__c);
            }
        }
        

        String query = ' select id, name, BillingAddress, Distribution_Channel__c,Distribution_Channel_Color__c, BillingLatitude, BillingLongitude, GeoLocation__latitude__s, GeoLocation__longitude__s, Bill_to_Ship_to_text__c,' +
                ' Territory__r.Name, Last_Sales_Visit__c, Planned_next_Sales_Visit__c,Last_Training_Event__c, Next_Planned_Training_Event__c, Bill_to_Number__c, ' +
                ' Planned_Visits__c,Extra_Sales_Visits__c, Actual_Visits_Total__c, Actual_Trainings_Total__c, Extra_Training_Events__c, Planned_Trainings__c, ' +
                ' Segment_Text_CG__c, Segment_Text_POS1__c, Segment_Text_Owner__c, Sales_Map_POS_Segment_Icon__c, Sales_Map_Owner_Segment_Icon__c, Sales_Map_CG_Segment_Icon__c, Pricing_Terms_Descripton__r.Name, Pricing_Terms_Descripton__r.Customer_Node_Code__c, Customer_Hierarchy_2_Description__r.Name, Customer_Hierarchy_2_Description__r.Customer_Node_Code__c,  Share_of_Wallet_Category__c, Phone,' +
                ' Last_Training_Event_Icon__c, Last_Sales_Visit_Icon__c, Share_of_Wallet_Category_Icon__c, Last_Sales_Visit_URL__c, Last_Training_Event_URL__c, ' +
                ' Next_Planned_Training_Event_URL__c, Account_Status_only_Status__c,Planned_Next_Sales_Visit_URL__c, is_Main_Account__c, H_nderstatus__c,Affiliate_Code__c,' +
                ' Brands__c, Brand_Logo__c, Own_Brand_formula__c, Account_Status__c, Segment_Icon_POS__c, Segment_Icon_Owner__c' +
                ' from Account' +
                ' where Return_for_Credit_Only__c = FALSE ';


        if (!accountIdsByCampaignMember.isEmpty()) {
            query += ' and Id in :accountIdsByCampaignMember';
        }

        if (lat != null && lng != null) {
            radius = radius == null ? 50 : radius;
            unit = unit == null ? 'km' : unit;
            query += ' and DISTANCE(BillingAddress, GEOLOCATION(:lat,:lng), \'' + unit + '\') < :radius';
        }


        Id userId = System.UserInfo.getUserId();
        User currentUser = SalesMapController.getUser();
        String userFunction = currentUser.Sivantos_Department_del__c;
        Set<Id> bussinessHierids = new Set<Id>();
        Set<Id> legalHierids = new Set<Id>();
        Set<Id> trainerIds = new Set<Id>();

        if (brands!=null && brands != '') {
            List<String> brandValues = brands.split(';');
            System.debug('brandValues: '+brandValues);
            query += ' and (Brands__c in :brandValues OR Own_Brand_formula__c in :brandValues)';
        }
        
        if (selectedTrainers!=null && !selectedTrainers.isEmpty()) {
            trainerIds = createSetFromList(selectedTrainers);
            query += ' and Trainer__c in :trainerIds';
        }

        if (!selectedBusinessHierarchies.isEmpty()) {
            bussinessHierids = createSetFromList(selectedBusinessHierarchies);
            query += ' and Pricing_Terms_Descripton__c in :bussinessHierids';
        }

        if (!selectedLegalHierarchies.isEmpty()) {
            legalHierids = createSetFromList(selectedLegalHierarchies);
            query += ' and Customer_Hierarchy_2_Description__c in :legalHierids';
        }

        if (searchTerm != null && searchTerm != '') {
            searchTerm = '%' + searchTerm + '%';
            query += ' and (Name like :searchTerm or BillingCity like :searchTerm or BillingCountry like :searchTerm or BillingPostalCode like :searchTerm or Bill_to_Ship_to_text__c like :searchTerm)';
        }

        if (selectedTerritories!=null && !selectedTerritories.isEmpty()) {
            Set<Id> ids = createSetFromList(selectedTerritories);
            query += ' and Territory__c in :ids';
        }

        if (onlyMainAccounts) {
            query += ' and  is_Main_Account__c = true';
        }

        if (excludeDoNotVisit) {
            query += ' and  Do_not_visit__c = false';
        }
        
        /*
        if(userFunction == 'Inside Sales') {
            query += ' and Territory__r.Inside_Sales_Rep__c = :userId';
        } else if(userFunction == 'Sales Rep') {
            query += ' and Territory__r.User__c = :userId';
        } else if(userFunction == 'Product Trainer') {
            query += ' and Territory__r.Trainer__c = :userId';
        } else if (userFunction == 'Sales Manager') {
            Set<Id> userIds = RoleHierarchyHelper.getSubRoleUserIdsByRoleId(new Set<Id>{
                    currentUser.UserRoleId
            });
            query += ' and User__c in :userIds';
        }*/


        if (salesTargetFilterCode != null) {
            if (salesTargetFilterCode == 1) {
                query += ' and Sales_Visit_Target_reached__c = true';
            } else if (salesTargetFilterCode == 2) {
                query += ' and Sales_Visit_Target_reached__c = false AND Planned_Visits__c > 0';
            } else if (salesTargetFilterCode == 3) {
                query += ' and Training_Visit_Target_reached__c = true';
            } else if (salesTargetFilterCode == 4) {
                query += ' and Training_Visit_Target_reached__c = false AND Planned_Trainings__c > 0';
            }

        }

        if (accountId != null && accountId != '') {
            query += ' and Id = :accountId';
        }

        if (territoryId != null && territoryId != '') {
            query += ' and Territory__c = :territoryId';
        }

        if (selectedDisChannelFilter != null && selectedDisChannelFilter != '' && selectedDisChannelFilter != 'All') {
            List<String> dcValues = selectedDisChannelFilter.split(';');
            query += ' and Distribution_Channel__c in :dcValues';
        }
        List<String> statusValues = accStatusVal.split(';');
		if(accStatusVal != null && accStatusVal != '' && !(statusValues.contains('All'))){
            
             query += ' and Account_Status_only_Status__c in :statusValues ';
            system.debug('***********************');
        } 

        System.debug('merchantStatusVal '+ merchantStatusVal);
        if(merchantStatusVal != null) {
            List<String> merchStatusValues = merchantStatusVal.split(';');
            if(merchantStatusVal != null && merchantStatusVal != '' && !(merchStatusValues.contains('All'))){
                
                 query += ' and H_nderstatus__c in :merchStatusValues ';
                system.debug('***********************');
            } 
        }
       

        query += ' order by Name';
        query += ' limit 2000';

        System.debug('Query: ' + query);

        resultAccounts = Database.query(query);
        System.debug(' Result Accounts: ' + resultAccounts);

        if(resultAccounts.isEmpty()) {
            throw new AuraException('No accounts found');
        }

        return resultAccounts;
    }

    /*
    Reduces list of multiple records to a set of ids
    @param List<SObject> lis - Readable address
    @return set of ids
     */
    public static Set<Id> createSetFromList(List<SObject> lis) {
        Set<Id> ids = new Set<Id>();
        for (SObject s : lis) {
            ids.add(s.Id);
        }
        System.debug('ids: ' + ids);
        return ids;
    }

    /*
    Does callout to google maps api endpoint to convert address to lat/lng pair
    @param commonAddress - Readable address
    @return HttpRequest responseBody which contains lat/lng
     */
    @AuraEnabled
    public static String getCoordinates(String commonAddress) {

        commonAddress = commonAddress.replaceAll(' ', '%20');
        String[] Coordinates;
        String url = 'https://maps.googleapis.com/maps/api/geocode/json?';
        url += 'address=' + commonAddress;
        url += '&sensor=false';
        url += '&key=AIzaSyDG63zPtAxOOxs93mfYuWiQx7k-adtH5Ks';

        system.debug(Logginglevel.ERROR, 'GeoUtilitiesCoordinates url: ' + url);

        Http h = new Http();
        HttpRequest req = new HttpRequest();

        req.setMethod('GET');
        req.setEndpoint(url);
        String responseBody;
        HttpResponse res;
        if (!Test.isRunningTest()) {
            // Methods defined as TestMethod do not support Web service callouts
            res = h.send(req);
            system.debug('res // ' + res);

            responseBody = res.getBody();
            Object jsonResponse = (String) System.JSON.deserialize(responseBody, String.class);
            System.debug('jsonResponse ' + jsonResponse);
//            responseBody = jsonResponse.results[0].geometry.location.lat+';'+jsonResponse.results[0].geometry.location.lng
        } else {
            // dummy data
            responseBody = '\"location\" : { \"lat\" : 32.0719776,\"lng\" : 34.7914048}';
        }
        if (res != null) {
            if (res.getStatusCode() == 400) {
                return String.valueOf(res.getStatusCode());
            }
        }

        /*
           body parsing should be here
        */
		system.debug('responseBody'+responseBody);
        return responseBody;
    }

    @AuraEnabled
    public static Map<String, String> updateAccountGeoLocation(String accountId, Decimal lat, Decimal lng) {
        Account acc = [select Id, GeoLocation__latitude__s, GeoLocation__longitude__s from Account where id = :accountId];
        acc.GeoLocation__latitude__s = lat;
        acc.GeoLocation__longitude__s = lng;
        Map<String, String> resultMap = new Map<String, String>();
        try {
            update acc;
            resultMap.put('state', 'true');
            resultMap.put('message', 'Account Position has been updated.');
        } catch (Exception e) {
            resultMap.put('state', 'false');
            resultMap.put('message', e.getMessage());
        }
        return resultMap;
    }

    @AuraEnabled
    public static String getUIThemeDescription() {
        String theme = UserInfo.getUiThemeDisplayed();
        return theme;
    }

}