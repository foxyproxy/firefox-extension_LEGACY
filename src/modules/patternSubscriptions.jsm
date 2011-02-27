/**
  FoxyProxy
  Copyright (C) 2006-#%#% Eric H. Jung and LeahScape, Inc.
  http://getfoxyproxy.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

"use strict";

var Ci = Components.interfaces, Cu = Components.utils, Cc = Components.classes;

var EXPORTED_SYMBOLS = ["patternSubscriptions"];

var patternSubscriptions = {
 
  subscriptionsList : [],

  defaultMetaValues :  {
    formatVersion : 1,
    checksum : "",
    algorithm : "",
    url : "",
    format : "FoxyProxy",
    obfuscation : "none",
    name : "",
    notes : "",
    enabled : true,
    refresh : 60,
    nextUpdate : 0,
    timer : null
  },

  subscriptionsTree : null,

  // TODO: Find a way to load the file efficiently using our XmlHTTPRequest
  // method below...
  loadSavedSubscriptions: function() {
    try {
      var line = {};
      var hasmore;
      var loadedSubscription;
      var savedPatternsFile = this.getSubscriptionsFile(true);
      if (!savedPatternsFile) {
        // We do not have saved Patterns yet, thus returning...
	return;
      }
      var istream = Cc["@mozilla.org/network/file-input-stream;1"].
                  createInstance(Ci.nsIFileInputStream);
      // -1 has the same effect as 0444.
      istream.init(savedPatternsFile, 0x01, -1, 0);
      var conStream = Cc["@mozilla.org/intl/converter-input-stream;1"].
                createInstance(Ci.nsIConverterInputStream);
      conStream.init(istream, "UTF-8", 0, 0);
      conStream.QueryInterface(Ci.nsIUnicharLineInputStream);
      do {
        hasmore = conStream.readLine(line);
        loadedSubscription = this.getObjectFromJSON(line.value); 
        this.subscriptionsList.push(loadedSubscription);
        if (loadedSubscription.metadata.refresh != 0) {
          delete loadedSubscription.metadata.timer;
          this.setSubscriptionTimer(loadedSubscription, false, true);
	}
      } while(hasmore);
      conStream.close(); 
    } catch (e) {
      dump("Error while loading the saved subscriptions: " + e + "\n");
    }
  },

  loadSubscription: function(aURLString, bBase64Checked) {
    try {
      var subscriptionText;
      var parsedSubscription;
      var subscriptionJSON = null;
      var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].
        createInstance(Ci.nsIXMLHttpRequest);
      /*req.onreadystatechange = function (aEvt) {

      };*/

      req.open("GET", aURLString, false);
      // We do need the following line of code. Otherwise we would get an error
      // that our JSON is not well formed if we load it from a local drive. See:
      // http://stackoverflow.com/questions/677902/not-well-formed-error-in-
      // firefox-when-loading-json-file-with-xmlhttprequest 
      req.overrideMimeType("application/json");
      req.send(null);
      subscriptionText = req.responseText;
      // TODO: Implement RegEx-Test for Base64, see:
      // http://www.perlmonks.org/index.pl?node_id=775820 
      // Until we have this test we assume first to have plain text and if this
      // is not working we assume a Base64 encoded response. If the last thing
      // is not working either the subscription parsing and import fails.
      subscriptionJSON = this.getObjectFromJSON(subscriptionText);
      if (!subscriptionJSON) {
        dump("The response contained invalid JSON while assuming a plain " +
              "text! We try Base64 decoding first...\n");
        // We need to replace newlines and other special characters here.
        // otherwise the decoding would fail.
	subscriptionText = atob(req.responseText.replace(/\s/g, ""));
        subscriptionJSON = this.getObjectFromJSON(subscriptionText); 
      }
      if (subscriptionJSON) {
        parsedSubscription = this.
	  parseSubscription(subscriptionJSON, aURLString);
	if (parsedSubscription) {
	  return parsedSubscription;
	}
      }
      return false;
    } catch (e) {
      dump("Error fetching the example JSON file: " + e + "\n");
      return false;
    }
  },

  getObjectFromJSON: function(aString) {
    var json;
    try {
      // Should never happen...
      if (!aString) {
	return;
      }
      // As FoxyProxy shall be usable with FF < 3.5 we use nsIJSON. But
      // Thunderbird does not support nsIJSON. Thus, we check for the proper
      // method to use here.
      if (typeof Components.interfaces.nsIJSON === "undefined") {
	return JSON.parse(aString);
      } else {
        json = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);
        return json.decode(aString); 
      }
    } catch (e) {
      dump("Error while parsing the JSON: " + e + "\n");
    }
  },

   getJSONFromObject: function(aObject) {
    var json;
    try {
      // As FoxyProxy shall be usable with FF < 3.5 we use nsIJSON. But
      // Thunderbird does not support nsIJSON. Thus, we check for the proper
      // method to use here.
      if (typeof Components.interfaces.nsIJSON === "undefined") {
	return JSON.stringify(aObject);
      } else {
        json = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);
        return json.encode(aObject); 
      }
    } catch (e) {
      dump("Error while parsing the JSON: " + e + "\n");
    }
  },
 
  parseSubscription: function(aSubscription, aURLString) {
    try {
      var subProperty;
      // Maybe someone cluttered the subscription in other ways...
      for (subProperty in aSubscription) {
        if (subProperty !== "metadata" && subProperty !== "subscription") {
          delete aSubscription[subProperty];
        }	  
      }
      // And maybe someone cluttered the metadata or mistyped a property...
      for (subProperty in aSubscription.metadata) {
        if (!this.defaultMetaValues[subProperty]) {
	  delete aSubscription.metadata[subProperty];
        }
      }
      // Or did that concerning the subscription part.
      for (subProperty in aSubscription.subscription) {
	if (subProperty !== "patterns") {
	  dump("We found: " + subProperty + " here!\n");
	  delete aSubscription.subscription[subProperty];
	}
      }
      return aSubscription; 
    } catch(e) {
      dump("There occurred an error while parsing the loaded subscription: " +
	 e + "\n"); 
      return null;
    }
  },

  addSubscription: function(aSubscription, userValues) {
    var userValue, d, subLength;
    var fp = Cc["@leahscape.org/foxyproxy/service;1"].
	         getService().wrappedJSObject; 
    // We need this do respect the user's wishes concerning the name and other
    // metadata properties. If we would not do this the default values that
    // may be delivered with the subscription itself (i.e. its metadate) would
    // overwrite the users' choices.
    for (userValue in userValues) {
      aSubscription.metadata[userValue] = userValues[userValue];
    } 
    // If the name is empty take the URL.
    if (aSubscription.metadata.name === "") {
      aSubscription.metadata.name = aSubscription.metadata.url;
    }
    aSubscription.metadata.lastUpdate = fp.logg.format(Date.now()); 
    aSubscription.metadata.lastStatus = fp.getMessage("okay");
    if (aSubscription.metadata.refresh > 0) { 
      this.setSubscriptionTimer(aSubscription, false, false);
    }
    this.subscriptionsList.push(aSubscription); 
    this.writeSubscription();
  }, 

  editSubscription: function(aSubscription, userValues, index) {
    var userValue;
    var oldRefresh = aSubscription.metadata.refresh;
    for (userValue in userValues) {
      aSubscription.metadata[userValue] = userValues[userValue];
    } 
    // If the name is empty take the URL.
    if (aSubscription.metadata.name === "") {
      aSubscription.metadata.name = aSubscription.metadata.url;
    } 
    if (oldRefresh !== aSubscription.metadata.refresh) {
      // We need type coercion here, hence "==" instead of "===".
      if (aSubscription.metadata.refresh == 0) {
        aSubscription.metadata.timer.cancel();
        delete aSubscription.metadata.timer;
        // There is no next update as refresh got set to zero. Therefore, 
        // deleting this property as well.
        delete aSubscription.metadata.nextUpdate;
        // Again, we need type coercion...
      } else if (oldRefresh == 0) {
        this.setSubscriptionTimer(aSubscription, false, false);
      } else {
	// We already had a timer just resetting it to the new refresh value.
        this.setSubscriptionTimer(aSubscription, true, false);
      }
    } 
    this.subscriptionsList[index] = aSubscription;
    this.writeSubscription();
  },

  setSubscriptionTimer: function(aSubscription, bRefresh, bStartup) {
    dump("Called setSubscriptionTimer!\n");
    var timer, d, that, event;
    // Now calculating the next time to refresh the subscription and setting
    // a respective timer just in case the user wants to have an automatic
    // update of her subscription.
    if (!aSubscription.metadata.timer) {
      timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      aSubscription.metadata.timer = timer; 
    } else {
      timer = aSubscription.metadata.timer;
    }
    d = new Date().getTime();
    if (bStartup) {
      if (aSubscription.metadata.nextUpdate <= d) {
        this.refreshSubscription(aSubscription, false);
        return;
      }
    } else {
      // TODO: Investigate whether there is an easy way to use 
      // metadata.lastUpdate here in order to calculate the next update time in
      // ms since 1969/01/01. By this we would not need metadata.nextUpdate.
      aSubscription.metadata.nextUpdate = d + aSubscription.metadata.
        refresh * 60 * 1000; 
    }
    that = this;
    event = {
      notify : function(timer) {
        that.refreshSubscription(aSubscription, false);
        that.subscriptionsTree.view = that.makeSubscriptionsTreeView();
      }
    };
    if (bRefresh) {
      timer.cancel();
      aSubscription.metadata.timer.cancel();
    }
    if (bStartup) {
      // Just a TYPE_ONE_SHOT on startup to come into the regular update cycle.
      timer.initWithCallback(event, aSubscription.metadata.nextUpdate - d, Ci.
        nsITimer.TYPE_ONE_SHOT);
    } else { 
      timer.initWithCallback(event, aSubscription.metadata.refresh * 60 * 1000,
        Ci.nsITimer.TYPE_REPEATING_SLACK);
    }
  },

  writeSubscription: function() {
    try {
      var subscriptionsData = "";
      var foStream;
      var converter;
      var subFile = this.getSubscriptionsFile(false);	
      for (var i = 0; i < this.subscriptionsList.length; i++) {
        subscriptionsData = subscriptionsData + this.getJSONFromObject(this.
	  subscriptionsList[i]) + "\n";
      }
      foStream = Cc["@mozilla.org/network/file-output-stream;1"].
                   createInstance(Ci.nsIFileOutputStream);
      // We should set it to the hex equivalent of 0644
      foStream.init(subFile, 0x02 | 0x08 | 0x20, -1, 0);
      converter = Cc["@mozilla.org/intl/converter-output-stream;1"].
                   createInstance(Ci.nsIConverterOutputStream);
      converter.init(foStream, "UTF-8", 0, 0);
      converter.writeString(subscriptionsData);
      converter.close(); 
    } catch (e) {
      dump("Error while writing the subscriptions to disc: " + e + "\n");
    }
  },

  refreshSubscription: function(aSubscription, showResponse) {
    // We are calculating the index in this method in order to be able to
    // use it with the nsITimer instances as well. If we would get the 
    // index from our caller it could happen that the index is wrong due
    // to changes in the subscription list while the timer was "sleeping".
    var aIndex;
    for (var i = 0; i < this.subscriptionsList.length; i++) {
      if (this.subscriptionsList[i] === aSubscription) {
	aIndex = i;
      }
    }
    var refreshedSubscription = this.loadSubscription(aSubscription.
      metadata.url); 
    var fp = Cc["@leahscape.org/foxyproxy/service;1"].
             getService().wrappedJSObject; 
    if (!refreshedSubscription) {
      fp.alert(fp.getMessage("foxyproxy"), fp.
        getMessage("patternsubscription.update.failure")); 
      aSubscription.metadata.status = fp.getMessage("error"); 
    } else {
      // We do not want to loose our metadata here as the user just 
      // refreshed the subscription to get up-to-date patterns.
      aSubscription.subscription = refreshedSubscription.
        subscription;
      // If we have a timer-based update of subscriptions we deactiva the
      // success popup as it can be quite annoying to get such kinds of popups
      // while surfing. TODO: Think about doing the same for failed updates. 
      if (showResponse) {
        fp.alert(fp.getMessage("foxyproxy"),fp.getMessage("patternsubscription.update.success")); 
      }
    }
    aSubscription.metadata.lastUpdate = fp.logg.format(Date.now()); 
    // Refreshing a subscription means refreshing the timer as well if there
    // is any...
    if (aSubscription.metadata.refresh > 0) {
      this.setSubscriptionTimer(aSubscription, true, false);
    }
    this.subscriptionsList[aIndex] = aSubscription;	
    this.writeSubscription(); 
  },

  getSubscriptionsFile: function(isStart) {
    // TODO: Merge the duplicated code with the one in foxyproxy.js
    var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    /* Always use ProfD by default in order to support application-wide 
       installations. http://foxyproxy.mozdev.org/drupal/content/
       tries-use-usrlibfirefox-304foxyproxyxml-linux#comment-974 */
    var dir = Cc["@mozilla.org/file/directory_service;1"].
      getService(Ci.nsIProperties).get("ProfD", Ci.nsILocalFile);
    file.initWithPath(dir.path);
    file.appendRelativePath("patternSubscriptions.txt");
    if ((!file.exists() || !file.isFile())) {
      if (isStart) {
	// Maybe we do not need such a file at all. Therefore, postponing its
	// creation.
	return false;
      }
      // Owners may do everthing with the file, the group and others are
      // only allowed to read it. 0x1E4 is the same as 0744 but we use it here
      // as octal literals and escape sequences are deprecated and the 
      // respective costants are not available yet, see: bug 433295.
      file.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0x1E4); 
    }
    return file;
  },

  makeSubscriptionsTreeView: function() {
    var fp = Cc["@leahscape.org/foxyproxy/service;1"].
	         getService().wrappedJSObject; 
    var that = this;
    var ret = {
      rowCount : that.subscriptionsList.length,
      getCellText : function(row, column) {
        var i = that.subscriptionsList[row];
        switch(column.id) {
          case "subscriptionsEnabled" : return i.metadata.enabled;
	  case "subscriptionsName" : return i.metadata.name;
          case "subscriptionsNotes" : return i.metadata.notes;
          case "subscriptionsUri" : return i.metadata.url;           
	  // We are doing here a similar thing as in addeditsubscription.js
	  // in the onLoad() function described: As we only saved the id's
	  // and the id's are not really helpful for users, we just use them to 
	  // get the respective name of a proxy out of the proxies object
	  // belonging to the foxyproxy service. These names are then displayed
	  // in the subscriptions tree comma separated in the proxy column.
          case "subscriptionsProxy":
	    var proxyString = "";
	    for (var j = 0; j < i.metadata.proxies.length; j++) {
	      for (var k = 0; k < fp.proxies.length; k++) {
		if (i.metadata.proxies[j] === fp.proxies.item(k).id) {
                  proxyString = proxyString + fp.proxies.item(k).name;
	          if (j < i.metadata.proxies.length - 1) {
		    proxyString = proxyString + ", ";
                  }
		}
              }
	    }
	    return proxyString; 
          case "subscriptionsRefresh" : return i.metadata.refresh;
          case "subscriptionsStatus" : return i.metadata.lastStatus;
          case "subscriptionsLastUpdate" : return i.metadata.lastUpdate;   
          case "subscriptionsFormat" : return i.metadata.format;
          case "subscriptionsObfuscation" : return i.metadata.obfuscation;
        }
      },
      setCellValue: function(row, col, val) {
		      that.subscriptionsList[row].metadata.enabled = val;
		    },
      getCellValue: function(row, col) {
		      return that.subscriptionsList[row].metadata.enabled;
		    },    
      isSeparator: function(aIndex) { return false; },
      isSorted: function() { return false; },
      isEditable: function(row, col) { return false; },
      isContainer: function(aIndex) { return false; },
      setTree: function(aTree){},
      getImageSrc: function(aRow, aColumn) {return null;},
      getProgressMode: function(aRow, aColumn) {},
      cycleHeader: function(aColId, aElt) {},
      getRowProperties: function(aRow, aColumn, aProperty) {},
      getColumnProperties: function(aColumn, aColumnElement, aProperty) {},
      getCellProperties: function(row, col, props) {},
      getLevel: function(row){ return 0; } 
    };
    return ret;
  }
}
