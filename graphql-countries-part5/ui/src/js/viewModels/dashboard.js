/**
 * @license
 * Copyright (c) 2014, 2019, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
/*
 * Your dashboard ViewModel code goes here
 */
define(['ojs/ojcore', 'knockout', 'jquery', 'text!data/world_countries.json',
  'ojs/ojarraydataprovider', 'ojs/ojknockout', 'ojs/ojbutton', 'ojs/ojdialog', 'ojs/ojdialog',
  'ojs/ojthematicmap', 'ojs/ojlistview', 'ojs/ojinputtext', 'ojs/ojlabel'],
 function(oj, ko, $, world, ArrayDataProvider) {
  
    function DashboardViewModel() {
      var self = this;

      this.map = ko.observable('world');
      this.areaData = ko.observableArray();
      this.mapProvider = ko.observable();
      this.countrySelection = ko.observable();
      this.displayItems = ko.observableArray();
      this.chosenProtocol = ko.observableArray();
      this.protocol = ko.observable();
      this.allCountries = ko.observableArray([]);
      this.dataProvider = new ArrayDataProvider(self.allCountries, {'keyAttributes': 'code'});
      this.calls = ko.observable(0);
      this.dialogTitle = ko.pureComputed(function() {
        return "Protocol: " + self.protocol() + " - Calls Made: " + self.calls();
      });

      self.invokePopup = function() {
        if (self.chosenProtocol().length > 0 && self.displayItems().length > 0) {
          self.protocol(self.chosenProtocol()[0]);
          self.calls(0);
          self.allCountries.removeAll();
          document.getElementById('countryDialog').open();
        } else {
          self.chosenProtocol.removeAll();
        }
      };

      self.updateSelection = function() {
        var items = '';
        var selection = self.countrySelection();
        self.displayItems.removeAll();
        self.allCountries.removeAll();
        if (selection) {
          for (var i = 0; i < selection.length; i++) {
            // Find matching area from data model and grab info
            for (var j = 0; j < self.areaData().length; j++) {
              var area = self.areaData()[j];
              
              if (area['id'] === selection[i]) {
                self.displayItems.push({'name': area['name'] + ' - ' + area['location'], 'code': area['location']});
              }
            }
          }
        }
      };

      function addCountry(number, code) {
        return 'country' + number + ': getCountriesByCode(code:"' + code + '") { ...fields } ';
      }

      function addFragment() {
        return 'fragment fields on Country {name code population}';
      }

      function getCountriesQuery() {
        var queryString = 'query{';
        for (var i = 0; i < self.displayItems().length; i++) {
          queryString = queryString + addCountry(i, self.displayItems()[i].code);
        }
        return queryString + '} ' + addFragment();
      }

      self.onDialogClose = function() {
        self.chosenProtocol.removeAll();
      };

      self.onDialogOpen = function() {
        if (self.chosenProtocol()[0] === "REST") {
          for (var i = 0; i < self.displayItems().length; i++) {
            $.getJSON("https://restcountries.eu/rest/v2/alpha/" + self.displayItems()[i].code)
            .done(function (value) {
              // Do something with the response
              self.calls(self.calls() + 1);
              self.allCountries.push({
                'name': value.name,
                'code': value.alpha3Code,
                'population': value.population});
            })
            .fail(function (error) {
              alert("Error");
              oj.Logger.error(error);
            });
          }
        } else {

          $.ajax({
            type: 'POST',
            url: 'http://localhost:3000/graphql',
            headers: {
              "Content-Type": "application/json"
            },
            data: JSON.stringify({
              query: getCountriesQuery()
            }),
            dataType: 'json',
            success: function( response, textStatus, jQxhr ) {
              self.calls(self.calls() + 1);
              var countriesArray = Object.values(response.data);
              for (var i = 0; i < countriesArray.length; i++) {
                self.allCountries.push(countriesArray[i]);
              }
            },
            error: function( jqXhr, textStatus, errorThrown ) {
              oj.Logger.error(jqXhr);
            }
          });
        }
        
      };
      
      // Below are a set of the ViewModel methods invoked by the oj-module component.
      // Please reference the oj-module jsDoc for additional information.

      /**
       * Optional ViewModel method invoked after the View is inserted into the
       * document DOM.  The application can put logic that requires the DOM being
       * attached here. 
       * This method might be called multiple times - after the View is created 
       * and inserted into the DOM and after the View is reconnected 
       * after being disconnected.
      */

      self.connected = function() {
        var geo = JSON.parse(world);
        self.mapProvider({
          geo: geo,
          propertiesKeys: {
            id: 'iso_a3',
            shortLabel: 'iso_a3',
            longLabel: 'name_long'
          }
        });
        self.areaData.removeAll();
        var handler = new oj.ColorAttributeGroupHandler();
        var data = geo["features"]
        // For demo purposes, use the color attribute group handler to give
        // areas different colors based on a non important data dimension.
        // In a real application, the color attribute group handler should be
        // passed a meaningful data dimension.
        // var handler = new oj.ColorAttributeGroupHandler();
        for (var i = 0; i < data.length; i++) {
          var id = data[i]["properties"]["iso_a3"];
          var longName = data[i]["properties"]["name_long"];
          self.areaData.push({id: i.toString(),
            color: handler.getValue(id),
            location: id,
            name: longName});
        }

      };

      /**
       * Optional ViewModel method invoked after the View is disconnected from the DOM.
       */
      self.disconnected = function() {
        // Implement if needed
      };

      /**
       * Optional ViewModel method invoked after transition to the new View is complete.
       * That includes any possible animation between the old and the new View.
       */
      self.transitionCompleted = function() {
        // Implement if needed
      };
    }

    /*
     * Returns a constructor for the ViewModel so that the ViewModel is constructed
     * each time the view is displayed.  Return an instance of the ViewModel if
     * only one instance of the ViewModel is needed.
     */
    return new DashboardViewModel();
  }
);
