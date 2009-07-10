/**
  FoxyProxy
  Copyright (C) 2006-2009 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

var foxyproxy, proxyTree, logTree, monthslong, dayslong, overlay, timeformat, saveLogCmd, clearLogCmd, noURLsCmd, fpc;
const CI = Components.interfaces, CC = Components.classes;

function onLoad() {
  foxyproxy = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;  
  fpc = CC["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  document.getElementById("maxSize").value = foxyproxy.logg.maxSize;
  overlay = fpc.getMostRecentWindow().foxyproxy;
  monthslong = [foxyproxy.getMessage("months.long.1"), foxyproxy.getMessage("months.long.2"),
    foxyproxy.getMessage("months.long.3"), foxyproxy.getMessage("months.long.4"), foxyproxy.getMessage("months.long.5"),
    foxyproxy.getMessage("months.long.6"), foxyproxy.getMessage("months.long.7"), foxyproxy.getMessage("months.long.8"),
    foxyproxy.getMessage("months.long.9"), foxyproxy.getMessage("months.long.10"), foxyproxy.getMessage("months.long.11"),
    foxyproxy.getMessage("months.long.12")];
  
  dayslong = [foxyproxy.getMessage("days.long.1"), foxyproxy.getMessage("days.long.2"),
    foxyproxy.getMessage("days.long.3"), foxyproxy.getMessage("days.long.4"), foxyproxy.getMessage("days.long.5"),
    foxyproxy.getMessage("days.long.6"), foxyproxy.getMessage("days.long.7")];
  proxyTree = document.getElementById("proxyTree");
  logTree = document.getElementById("logTree");
  saveLogCmd = document.getElementById("saveLogCmd");
  clearLogCmd = document.getElementById("clearLogCmd");  
  noURLsCmd = document.getElementById("noURLsCmd");
  timeformat = foxyproxy.getMessage("timeformat");
  _initSettings();
  //setTimeout(function(){sizeToContent()}, 0);
  CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService).addObserver(observer,"foxyproxy-mode-change", false);
  sizeToContent();
}

function onOK() {
  CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService).removeObserver(observer, "foxyproxy-mode-change");
}

var observer = {
  observe : function(subj, topic, str) {
    var e;
    try {
      e = subj.QueryInterface(CI.nsISupportsPRBool).data;
    }
    catch(e) {}
    switch (topic) {
      case "foxyproxy-mode-change":
        _updateView();
        break;
     }
   }
}
 
function _initSettings() {
  _updateView(false, true);
  updateSettingsInfo(); 
  document.getElementById("tabs").selectedIndex = foxyproxy.selectedTabIndex;
  document.getElementById("statusbarWidth").value = foxyproxy.statusbar.width;
  toggleStatusBarText(foxyproxy.statusbar.textEnabled);  
}

function updateSettingsInfo() {
  document.getElementById("settingsURL").value = foxyproxy.getSettingsURI("uri-string");
  document.getElementById("notDefaultSettingsBroadcaster").hidden = foxyproxy.usingDefaultSettingsURI();
  sizeToContent(); // because .hidden above can change the size of controls
}

function sortlog(columnId) {
	var columnName;
	
	// map columnId to the data
	switch(columnId) {
    case "timeCol":columnName = "timestamp"; break;
    case "urlCol":columnName = "uri"; break;
    case "nameCol":columnName = "proxyName"; break;
    case "notesCol":columnName = "proxyNotes"; break;
    case "mpNameCol":columnName = "matchName"; break;
    case "mpCol":columnName = "matchPattern";  break;
    case "mpCaseCol":columnName = "caseSensitive"; break;  
    case "mpTypeCol":columnName = "matchType"; break;
    case "mpBlackCol":columnName = "whiteBlack"; break;
    case "pacResult":columnName = "pacResult"; break;
    case "errCol":columnName = "errMsg"; break;
  }
	
	// determine how the log is currently sorted (ascending/decending) and by which column (sortResource)
	var order = logTree.getAttribute("sortDirection") == "ascending" ? 1 : -1;
	//if the column is passed and it's already sorted by that column, reverse sort
	if (columnId) {
		if (logTree.getAttribute("sortResource") == columnId) {
			order *= -1;
		}
	} else {
		columnId = logTree.getAttribute("sortResource");
	}
	
	function columnSort(a, b) {
		
		if (prepareForComparison(a[columnName]) > prepareForComparison(b[columnName])) return 1 * order;
		if (prepareForComparison(a[columnName]) < prepareForComparison(b[columnName])) return -1 * order;
		//tie breaker: timestamp ascending is the second level sort
		if (columnName != "timestamp") {
			if (prepareForComparison(a["timestamp"]) > prepareForComparison(b["timestamp"])) return 1;
			if (prepareForComparison(a["timestamp"]) < prepareForComparison(b["timestamp"])) return -1;
		}
		return 0;
	}
	foxyproxy.logg._elements.sort(columnSort);
	
	//setting these will make the sort option persist
	logTree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
	logTree.setAttribute("sortResource", columnId);
	
	//set the appropriate attributes to show to indicator
	var cols = logTree.getElementsByTagName("treecol");
	for (var i = 0; i < cols.length; i++) {
		cols[i].removeAttribute("sortDirection");
	}
	document.getElementById(columnId).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
	
	_updateLogView();
}

//prepares an object for easy comparison against another. for strings, lowercases them
function prepareForComparison(o) {
	if (typeof o == "string") {
		return o.toLowerCase();
	}
	return o;
}

function _updateLogView() {
	saveLogCmd.setAttribute("disabled", foxyproxy.logg.length == 0);
	clearLogCmd.setAttribute("disabled", foxyproxy.logg.length == 0);	
  noURLsCmd.setAttribute("checked", foxyproxy.logg.noURLs); 
  logTree.view = {
    rowCount : foxyproxy.logg.length,
    getCellText : function(row, column) {
      var mp = foxyproxy.logg.item(row);
      if (!mp) return;
      switch(column.id) {
        case "timeCol":return format(mp.timestamp);
        case "urlCol":return mp.uri;
        case "nameCol":return mp.proxyName;
        case "notesCol":return mp.proxyNotes;
        case "mpNameCol":return mp.matchName;
        case "mpCol":return mp.matchPattern; 
        case "mpCaseCol":return mp.caseSensitive;       
        case "mpTypeCol":return mp.matchType;
        case "mpBlackCol":return mp.whiteBlack;       
        case "pacResult":return mp.pacResult;
        case "errCol":return mp.errMsg;
      }
    },
    isSeparator: function(aIndex) { return false; },
    isSorted: function() { return false; },
    isEditable: function(row, col) { return false; },
    isContainer: function(aIndex) { return false; },
    setTree: function(aTree){},
    getImageSrc: function(aRow, aColumn) {return null;},
    getProgressMode: function(aRow, aColumn) {},
    getCellValue: function(row, col) {},
    cycleHeader: function(aColId, aElt) {},
    getRowProperties: function(row, col, props) {
      /*if (foxyproxy.logg.item(row) && foxyproxy.logg.item(row).matchPattern == NA) {      
	  	  var a = Components.classes["@mozilla.org/atom-service;1"].
		      getService(Components.interfaces.nsIAtomService);
		    col.AppendElement(a.getAtom("grey"));
	    }*/
    },
    getColumnProperties: function(aColumn, aColumnElement, props) {},
    getCellProperties: function(aRow, props) {},
    getLevel: function(row){ return 0; }
  };
}

  // Thanks for the inspiration, Tor2k (http://www.codeproject.com/jscript/dateformat.asp)
  function format(d) {
    d = new Date(d);
    if (!d.valueOf())
      return '&nbsp;';

    return timeformat.replace(/(yyyy|mmmm|mmm|mm|dddd|ddd|dd|hh|HH|nn|ss|zzz|a\/p)/gi,
      function($1) {
        switch ($1) {
          case 'yyyy': return d.getFullYear();
          case 'mmmm': return monthslong[d.getMonth()];
          case 'mmm':  return monthslong[d.getMonth()].substr(0, 3);
          case 'mm':   return zf((d.getMonth() + 1), 2);
          case 'dddd': return dayslong[d.getDay()];
          case 'ddd':  return dayslong[d.getDay()].substr(0, 3);
          case 'dd':   return zf(d.getDate(), 2);
          case 'hh':   return zf(((h = d.getHours() % 12) ? h : 12), 2);
          case 'HH':   return zf(d.getHours(), 2);          
          case 'nn':   return zf(d.getMinutes(), 2);
          case 'ss':   return zf(d.getSeconds(), 2);
          case 'zzz':  return zf(d.getSeconds(), 3);          
          case 'a/p':  return d.getHours() < 12 ? 'AM' : 'PM';
        }
      }
    );
  }
  
// My own zero-fill fcn, not Tor 2k's. Assumes (n==2 || n == 3) && c<=n.
function zf(c, n) { c=""+c; return c.length == 1 ? (n==2?'0'+c:'00'+c) : (c.length == 2 ? (n==2?c:'0'+c) : c); }

function _updateModeMenu() {
	var menu = document.getElementById("modeMenu");	
	var popup=menu.firstChild;
	fpc.removeChildren(popup);
	
  popup.appendChild(fpc.createMenuItem({idVal:"patterns", labelId:"mode.patterns.label", document:document}));
  for (var i=0,p; i<foxyproxy.proxies.length && ((p=foxyproxy.proxies.item(i)) || 1); i++)
    popup.appendChild(fpc.createMenuItem({idVal:p.id, labelId:"mode.custom.label", labelArgs:[p.name], type:"radio", name:"foxyproxy-enabled-type", document:document}));
    //popup.appendChild(fpc.createMenuItem({idVal["random", labelId:"mode.random.label", document:document}));
  popup.appendChild(fpc.createMenuItem({idVal:"disabled", labelId:"mode.disabled.label", document:document}));
  menu.value = foxyproxy.mode;
  if (foxyproxy.mode != "patterns" && foxyproxy.mode != "disabled" &&
  	foxyproxy.mode != "random") {
	  if (!foxyproxy.proxies.item(menu.selectedIndex-1).enabled) { // subtract 1 because first element, patterns, is not in the proxies array
  	  // User disabled or deleted the proxy; select default setting.
    	foxyproxy.setMode("disabled", true);
	    menu.value = "disabled";
  	}
  }
}

function onSettingsURLBtn() {
  const nsIFilePicker = CI.nsIFilePicker;
  var fp = CC["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
  fp.init(window, foxyproxy.getMessage("file.select"), nsIFilePicker.modeSave);
  fp.defaultString = "foxyproxy.xml";
  fp.appendFilters(nsIFilePicker.filterAll|nsIFilePicker.filterXML);
  fp.displayDirectory = foxyproxy.getSettingsURI(CI.nsIFile); /* WHY IS THIS ALWAYS NULL? */
  if (fp.show() != nsIFilePicker.returnCancel) {
    var defPath = foxyproxy.getDefaultPath();
    // If the current settings file is in the default path and the user wants to move it, warn him.
    // Since foxyproxy.getSettingsURI(CI.nsIFile) is always evaluating to null is this context (WHY?!),
    // I'm skipping the first conditional expression.
    //if (fp.displayDirectory.equals(defPath) && !defPath.equals(fp.file)) {
    if (!defPath.equals(fp.file)) {
      var c = overlay.ask(this, foxyproxy.getMessage("settings.warning"), null, null, foxyproxy.getMessage("more.info"));
      switch (c) {
        case 1:
          // "no" clicked
          return;
        case 2:
          // "more info" clicked
          fpc.openAndReuseOneTabPerURL("http://foxyproxy.mozdev.org/settings.html");
          return;
      }
    }
    foxyproxy.setSettingsURI(fp.file);
    _initSettings();
  }
}

function onResetSettingsURL() {
  foxyproxy.setSettingsURI(foxyproxy.getDefaultPath());
  updateSettingsInfo();
  overlay.alert(this, foxyproxy.getMessage("settings.default"));  
}

/* Contains items which can be updated via toolbar/statusbar/menubar/context-menu as well as the options dialog,
so we don't include these in onLoad() or init() */
function _updateView(writeSettings, updateLogView) {
  document.getElementById("dnsEnabled").checked = foxyproxy.proxyDNS;
  document.getElementById("enableLogging").checked = foxyproxy.logging;
  //document.getElementById("randomIncludeDirect").checked = foxyproxy.random.includeDirect;
  //document.getElementById("randomIncludeDisabled").checked = foxyproxy.random.includeDisabled;

  function _updateSuperAdd(saObj, str) {
    var temp = saObj.enabled;
    document.getElementById(str + "Enabled").checked = temp;
    document.getElementById(str + "Broadcaster").hidden = !temp;
    document.getElementById(str + "Reload").checked = saObj.reload;
    document.getElementById(str + "Notify").checked = saObj.notify;
    document.getElementById(str + "Prompt").checked = saObj.prompt;
  }

  _updateSuperAdd(foxyproxy.autoadd, "autoAdd");
  _updateSuperAdd(foxyproxy.quickadd, "quickAdd");
  document.getElementById("quickAddNotifyWhenCanceled").checked = foxyproxy.quickadd.notifyWhenCanceled; // only exists for QuickAdd
  
  document.getElementById("toolsMenuEnabled").checked = foxyproxy.toolsMenu;
  document.getElementById("contextMenuEnabled").checked = foxyproxy.contextMenu;
  document.getElementById("statusbarIconEnabled").checked = foxyproxy.statusbar.iconEnabled;
  document.getElementById("statusbarTextEnabled").checked = foxyproxy.statusbar.textEnabled;   
  document.getElementById("advancedMenusEnabled").checked = foxyproxy.advancedMenus;      

  document.getElementById("sbLeftClickMenu").value = foxyproxy.statusbar.leftClick;        
  document.getElementById("sbMiddleClickMenu").value = foxyproxy.statusbar.middleClick;          
  document.getElementById("sbRightClickMenu").value = foxyproxy.statusbar.rightClick;            

  document.getElementById("tbLeftClickMenu").value = foxyproxy.toolbar.leftClick;        
  document.getElementById("tbMiddleClickMenu").value = foxyproxy.toolbar.middleClick;          
  document.getElementById("tbRightClickMenu").value = foxyproxy.toolbar.rightClick;            
    
	_updateModeMenu();

  var menu = document.getElementById("autoAddProxyMenu");
  foxyproxy.autoadd.updateProxyMenu(menu, document);
  if (!menu.firstChild.firstChild) {
    document.getElementById("autoAddEnabled").checked = false;
    onAutoAddEnabled(false);
  }

  menu = document.getElementById("quickAddProxyMenu");
  foxyproxy.quickadd.updateProxyMenu(menu, document);
  if (!menu.firstChild.firstChild) {
    document.getElementById("quickAddEnabled").checked = false;
    onQuickAddEnabled(false);
  }
  
  proxyTree.view = fpc.makeProxyTreeView(foxyproxy);
  writeSettings && foxyproxy.writeSettings();
  setButtons();
  updateLogView && _updateLogView();
}

function onEnableTypeChanged(menu) {
  foxyproxy.setMode(menu.selectedItem.id, true);
  _updateView();
}

function onDeleteSelection() {
  if (_isDefaultProxySelected())
    overlay.alert(this, foxyproxy.getMessage("delete.proxy.default"));
  else if (overlay.ask(this, foxyproxy.getMessage("delete.proxy.confirm"))) {
	  // Store cur selection
	  var sel = proxyTree.currentIndex;  
    foxyproxy.proxies.remove(proxyTree.currentIndex);
    _updateView(true);
	  // Reselect what was previously selected
		proxyTree.view.selection.select(sel+1>proxyTree.view.rowCount ? 0:sel);    
  }  
}

function onCopySelection() {
  if (_isDefaultProxySelected())
    overlay.alert(this, foxyproxy.getMessage("copy.proxy.default"));
  else {  
	  // Store cur selection
	  var sel = proxyTree.currentIndex;    
	  var dom = foxyproxy.proxies.item(proxyTree.currentIndex).toDOM(document);
	  var p = CC["@leahscape.org/foxyproxy/proxy;1"].createInstance().wrappedJSObject;
	  p.fromDOM(dom);
	  p.id = foxyproxy.proxies.uniqueRandom(); // give it its own id
	  foxyproxy.proxies.push(p);
	  _updateView(true);
	  // Reselect what was previously selected
		proxyTree.view.selection.select(sel);    	  
	}
}

function move(direction) {
  // Store cur selection
  var sel = proxyTree.currentIndex;
  foxyproxy.proxies.move(proxyTree.currentIndex, direction) && _updateView(true);  
  // Reselect what was previously selected
	proxyTree.view.selection.select(sel + (direction=="up"?-1:1));
}

function onSettings(isNew) {
  var sel = proxyTree.currentIndex,
    params = {inn:{proxy:isNew ?
      CC["@leahscape.org/foxyproxy/proxy;1"].createInstance().wrappedJSObject : 
      foxyproxy.proxies.item(proxyTree.currentIndex)}, out:null};
        
  window.openDialog("chrome://foxyproxy/content/addeditproxy.xul", "",
    "chrome, dialog, modal, resizable=yes", params).focus();
  if (params.out) {
    isNew && foxyproxy.proxies.push(params.out.proxy);
    _updateView(true);
    foxyproxy.writeSettings();
	  // Reselect what was previously selected or the new item
		proxyTree.view.selection.select(isNew?proxyTree.view.rowCount-2:sel);    
  }
}

function setButtons() {
  document.getElementById("tree-row-selected").setAttribute("disabled", proxyTree.currentIndex == -1);
  document.getElementById("moveUpCmd").setAttribute("disabled", 
  	proxyTree.currentIndex == -1 || proxyTree.currentIndex == 0 || _isDefaultProxySelected());
  document.getElementById("moveDownCmd").setAttribute("disabled", 
  	proxyTree.currentIndex == -1 || proxyTree.currentIndex == foxyproxy.proxies.length-1 ||
  	(proxyTree.currentIndex+1 < foxyproxy.proxies.length && foxyproxy.proxies.item(proxyTree.currentIndex+1).lastresort));
}

function onMaxSize() {
	var v = document.getElementById("maxSize").value;
	var passed = true;
	if (/\D/.test(v)) {
		foxyproxy.alert(this, foxyproxy.getMessage("torwiz.nan"));
		passed = false;
	}
	v > 9999 &&
		!overlay.ask(this, foxyproxy.getMessage("logg.maxsize.maximum")) &&
		(passed = false);
	if (!passed) {
		document.getElementById("maxSize").value = foxyproxy.logg.maxSize;
		return;
	}
	if (overlay.ask(this, foxyproxy.getMessage("logg.maxsize.change"))) {
		foxyproxy.logg.maxSize = v;
		_updateView(false, true);
	}
	else
		document.getElementById("maxSize").value = foxyproxy.logg.maxSize;
}
/*
function onIncludeDirectInRandom() {
  // TODO: ERROR CHECKING
	overlay.alert(this, foxyproxy.getMessage('random.applicable'));
	foxyproxy.random.includeDirect = this.checked;
}

function onIncludeDisabledInRandom() {
  // TODO: ERROR CHECKING
	overlay.alert(this, foxyproxy.getMessage('random.applicable'));
	foxyproxy.random.includeDisabled = this.checked;
}*/

function saveLog() {
	const nsIFilePicker = CI.nsIFilePicker;
	var fp = CC["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(this, foxyproxy.getMessage("log.save"), nsIFilePicker.modeSave);
	fp.defaultExtension = "html";
	fp.appendFilters(nsIFilePicker.filterHTML | nsIFilePicker.filterAll);
	if (fp.show() == nsIFilePicker.returnCancel)
 		return;
	
	var os = CC["@mozilla.org/intl/converter-output-stream;1"].createInstance(CI.nsIConverterOutputStream);	
	var fos = CC["@mozilla.org/network/file-output-stream;1"].createInstance(CI.nsIFileOutputStream); // create the output stream
	fos.init(fp.file, 0x02 | 0x08 | 0x20 /*write | create | truncate*/, 0664, 0);
	os.init(fos, "UTF-8", 0, 0x0000);
	os.writeString(foxyproxy.logg.toHTML());
	os.close();
	if (overlay.ask(this, foxyproxy.getMessage("log.saved2", [fp.file.path]))) {
		var win = fpc.getMostRecentWindow();
		win.gBrowser.selectedTab = win.gBrowser.addTab(fp.file.path);
  }
}

function importSettings() {
}

function exportSettings() {
}

function importProxyList() {
}

function onProxyTreeSelected() {	
	setButtons();
}

function onProxyTreeMenuPopupShowing() {
	var e = document.getElementById("enabledPopUpMenuItem"), f = document.getElementById("menuSeperator");
  e.hidden = f.hidden = _isDefaultProxySelected();
	e.setAttribute("checked", foxyproxy.proxies.item(proxyTree.currentIndex).enabled); 
}

function toggleEnabled() {
	var p = foxyproxy.proxies.item(proxyTree.currentIndex);
	p.enabled = !p.enabled;
	_updateView(true, false);
}

function _isDefaultProxySelected() {
	return foxyproxy.proxies.item(proxyTree.currentIndex).lastresort;
}

function onToggleStatusBarText(checked) {
  foxyproxy.statusbar.textEnabled = checked;
  toggleStatusBarText(checked);
}

function toggleStatusBarText(checked) {
  // Next line--buggy in FF 1.5.x, 2.0.x--makes fields enabled but readonly
  // document.getElementById("statusBarWidthBroadcaster").setAttribute("disabled", true);
  // Call removeAttribute() instead of setAttribute("disabled", "false") or setAttribute("disabled", false);
  if (checked)
    document.getElementById("statusBarWidthBroadcaster").removeAttribute("disabled"); // enables!    
  else
    document.getElementById("statusBarWidthBroadcaster").setAttribute("disabled", "true");     
}

function onQuickAddEnabled(cb) {
  if (cb.checked) {
    if (foxyproxy.quickadd.allowed()) {
        foxyproxy.quickadd.enabled = true;
        foxyproxy.quickadd.updateProxyMenu(document.getElementById("quickAddProxyMenu"), document);
        document.getElementById("quickAddBroadcaster").hidden = false;              
    }
    else {
      overlay.alert(this, foxyproxy.getMessage("superadd.verboten2", [foxyproxy.getMessage("foxyproxy.quickadd.label")]));
      cb.checked = false;
    }
  }
  else {
    document.getElementById("quickAddBroadcaster").hidden = true;
    foxyproxy.quickadd.enabled = false;
  }
  sizeToContent();
}

function onAutoAddEnabled(cb) {
  if (cb.checked) {
    if (foxyproxy.autoadd.allowed()) {
      foxyproxy.autoadd.enabled = true;
      document.getElementById("autoAddBroadcaster").hidden = false;     
      foxyproxy.autoadd.updateProxyMenu(document.getElementById("autoAddProxyMenu"), document);
      sizeToContent(); // call this before the alert() otherwise user can see unsized dialog in background
      overlay.alert(this, foxyproxy.getMessage("autoadd.notice"));
    }
    else {
      overlay.alert(this, foxyproxy.getMessage("superadd.verboten2", [foxyproxy.getMessage("foxyproxy.tab.autoadd.label")]));
      cb.checked = false;
    }    
  }
  else {
    document.getElementById("autoAddBroadcaster").hidden = true;
    foxyproxy.autoadd.enabled = false;
    sizeToContent();
  }
}

function onDefinePattern(superadd) {
  var p = superadd.match.clone();
  p.temp = superadd.temp; // see notes in the .match setter in superadd.js as to why we do this
  var params = {inn:{pattern:p, superadd:true}, out:null};

  window.openDialog("chrome://foxyproxy/content/pattern.xul", "",
    "chrome, dialog, modal, resizable=yes", params).focus();

  if (params.out)
    superadd.match = params.out.pattern;
}

function onBlockedPagePattern() {
  var m = foxyproxy.autoadd.blockedPageMatch;
  var params = {inn:{pattern:m.pattern, regex:m.isRegEx, caseSensitive:m.caseSensitive}, out:null};

  window.openDialog("chrome://foxyproxy/content/blockedpagepattern.xul", "",
    "chrome, dialog, modal, resizable=yes", params).focus();

  if (params.out) {
    params = params.out;
    m.pattern = params.pattern;
    m.isRegEx = params.isRegEx;
    m.caseSensitive = params.caseSensitive;
    foxyproxy.writeSettings();
  }    
}