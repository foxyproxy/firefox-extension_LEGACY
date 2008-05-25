var fpc;
function onLoad() {
  var inn = window.arguments[0].inn;  
  fpc = Components.classes["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  document.getElementById("enabled").checked = inn.enabled;
  document.getElementById("temp").checked = inn.temp;
  document.getElementById("reload").checked = inn.reload;
  document.getElementById("prompt").checked = inn.prompt;
  document.getElementById("notify").checked = inn.notify;
  document.getElementById("notifyWhenCanceled").checked = inn.notifyWhenCanceled;
  var proxyMenuPopup = document.getElementById("proxyMenuPopup");
  for (var i=0,p; i<inn.proxies.length && ((p=inn.proxies.item(i)) || 1); i++) {
    if (!p.lastresort && p.enabled) {
      proxyMenuPopup.appendChild(fpc.createMenuItem({idVal:p.id, labelVal:p.name, document:document}));
    }
  }
  document.getElementById("proxyMenu").value = inn.proxyId || proxyMenuPopup.firstChild.id;
  document.getElementById("name").value = inn.match.name;
  document.getElementById("urlTemplate").value = inn.urlTemplate;    
  document.getElementById("url").value = inn.url;
  document.getElementById("matchtype").value = inn.match.isRegEx ? "r" : "w";
  document.getElementById("whiteblacktype").value = inn.match.isBlackList ? "b" : "w"
  document.getElementById("caseSensitive").checked = inn.match.caseSensitive;
  updateGeneratedPattern();
  document.getElementById("setupMode").setAttribute("hidden", inn.setupMode);
  document.getElementById("notSetupMode").setAttribute("hidden", !inn.setupMode);
  if (inn.isQuickAdd) {
    document.getElementById("autoAddMode").setAttribute("hidden", true);
  } 
  else {
    // Hide QuickAdd specifics from AutoAdd
    var fp = Components.classes["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
    window.document.title = fp.getMessage("foxyproxy.tab.autoadd.label");
    document.getElementById("quickAddMode").setAttribute("hidden", true);
    // Show AutoAdd specifics
    var e = document.getElementById("notify");
    e.label = fp.getMessage("foxyproxy.autoadd.notify.label");
    e.setAttribute("tooltiptext", fp.getMessage("foxyproxy.autoadd.notify.tooltip2"));
    e = document.getElementById("notifyWhenCanceled");
    e.label = fp.getMessage("foxyproxy.autoadd.notify.whencanceled.label");
    e.setAttribute("tooltiptext", fp.getMessage("foxyproxy.autoadd.notify.whencanceled.tooltip")); 
    e = document.getElementById("notifyWhenCanceledPopup");
  }   
  sizeToContent();  
}

function onOK() {   
  var isRegEx = document.getElementById("matchtype").value=="r";
  var p = window.arguments[0].inn.setupMode || fpc.validatePattern(window, isRegEx, document.getElementById("generatedPattern").value);
  if (p) {
    window.arguments[0].out = {enabled:document.getElementById("enabled").checked,
      temp:document.getElementById("temp").checked,
      reload:document.getElementById("reload").checked,
      notify:document.getElementById("notify").checked,
      prompt:document.getElementById("prompt").checked,
      notifyWhenCanceled:document.getElementById("notifyWhenCanceled").checked,
      proxyId:document.getElementById("proxyMenu").value,     
      name:document.getElementById("name").value,       
      urlTemplate:document.getElementById("urlTemplate").value,
      pattern:document.getElementById("generatedPattern").value,
      caseSensitive:document.getElementById("caseSensitive").checked,      
      isRegEx:isRegEx,
      isBlackList:document.getElementById("whiteblacktype").value == "b",
      autoAddPattern:document.getElementById("autoAddPattern").value,
      autoAddCaseSensitive:document.getElementById("autoAddCaseSensitive").checked}; 
    return true;
  }
}

function updateGeneratedPattern() {
	document.getElementById("generatedPattern").value =
    fpc.applyTemplate(document.getElementById("url").value,
      document.getElementById("urlTemplate").value,
      document.getElementById("caseSensitive").checked);
}
