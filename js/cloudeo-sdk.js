/*

 Copyright (C) SayMama Ltd 2012

 All rights reserved. Any use, copying, modification, distribution and selling
 of this software and it's documentation for any purposes without authors'
 written permission is hereby prohibited.
*/
var CDO = CDO || {};
(function() {
  CDO._UPDATE_DESCRIPTOR_NAME = "update";
  var UPDATE_DESCRIPTOR_CONTAINER_ID = "updateDescrContainer";
  var installerURLResponder;
  var waitingForUpdateDescriptor = false;
  CDO._MIC_CONFIG_KEY = "cloudeo-mic";
  CDO._SPK_CONFIG_KEY = "cloudeo-spk";
  CDO._CAM_CONFIG_KEY = "cloudeo-cam";
  CDO.MEDIA_TYPE_AUDIO = "audio";
  CDO.MEDIA_TYPE_VIDEO = "video";
  CDO.MEDIA_TYPE_SCREEN = "screen";
  CDO.ConnectionType = {NOT_CONNECTED:"MEDIA_TRANSPORT_TYPE_NOT_CONNECTED", UDP_RELAY:"MEDIA_TRANSPORT_TYPE_UDP_RELAY", UDP_P2P:"MEDIA_TRANSPORT_TYPE_UDP_P2P", TCP_RELAY:"MEDIA_TRANSPORT_TYPE_TCP_RELAY"};
  CDO.MediaType = {AUDIO:CDO.MEDIA_TYPE_AUDIO, VIDEO:CDO.MEDIA_TYPE_VIDEO, SCREEN:CDO.MEDIA_TYPE_SCREEN};
  CDO.LogLevel = {DEBUG:"DEBUG", WARN:"WARN", ERROR:"ERROR"};
  CDO.VideoScalingFilter = {FAST_BILINEAR:"fast_bilinear", BICUBIC:"bicubic"};
  CDO.initStdLogging = function(enableDebug) {
    if(enableDebug) {
      _setupStdLogLevel("_logd", "debug");
      _setupStdLogLevel("_logd", "log")
    }
    _setupStdLogLevel("_logw", "warn");
    _setupStdLogLevel("_loge", "error");
    CDO._logd("Logging initialized")
  };
  CDO.initLogging = function(logHandler, enableDebug) {
    if(enableDebug) {
      CDO._logd = _wrapLogHandler(logHandler, "DEBUG")
    }
    CDO._logw = _wrapLogHandler(logHandler, "WARN");
    CDO._loge = _wrapLogHandler(logHandler, "ERROR");
    CDO._logd("Logging initialize")
  };
  CDO.getInstallerURL = function(responder, updateDescriptorUrl) {
    try {
      if(waitingForUpdateDescriptor) {
        responder.error(CDO.ErrorCodes.Logic.INVALID_STATE, "getInstallerURL already awaits for update descriptor")
      }
      installerURLResponder = responder;
      if(updateDescriptorUrl === undefined) {
        updateDescriptorUrl = CDO._PLUGIN_INSTALL_ROOT + CDO._UPDATE_DESCRIPTOR_NAME + CDO._getUpdateDescriptorSuffix() + ".js"
      }
      _loadScript(updateDescriptorUrl, UPDATE_DESCRIPTOR_CONTAINER_ID, true)
    }catch(e) {
      responder.error(e.code, e.message)
    }
  };
  CDO.renderSink = function(sinkIdOrDescription, containerId, fullSize, document, mirror, filterType, windowless) {
    var sinkId;
    if(arguments.length == 1) {
      sinkId = sinkIdOrDescription.sinkId;
      containerId = sinkIdOrDescription.containerId;
      fullSize = sinkIdOrDescription.fullSize;
      document = sinkIdOrDescription.document;
      mirror = sinkIdOrDescription.mirror;
      filterType = sinkIdOrDescription.filterType;
      windowless = sinkIdOrDescription.windowless
    }else {
      sinkId = sinkIdOrDescription
    }
    if(fullSize === undefined) {
      fullSize = true
    }
    if(document === undefined) {
      document = window.document
    }
    if(mirror === undefined) {
      mirror = false
    }
    if(filterType === undefined) {
      filterType = "fast_bilinear"
    }
    var container = document.getElementById(containerId);
    if(!container) {
      throw new CDO.CloudeoException("Invalid container ID, cannot find DOM node with given id.", CDO.ErrorCodes.Logic.LOGIC_INVALID_ARGUMENT);
    }
    container.innerHTML = "";
    container.innerHTML = '<object type="application/x-cloudeoplugin">' + '<param  name="vcamid" value="' + sinkId + '"/>' + '<param  name="serviceid" value="' + CDO._service.serviceid + '"/>' + '<param  name="mirror" value="' + (mirror ? "true" : "false") + '"/>' + '<param  name="filtertype" value="' + filterType + '"/>' + '<param  name="windowless" value="' + (windowless ? "true" : "false") + '"/>' + "</object>";
    if(container && container.children && container.children[0]) {
      var objectNode = container.children[0];
      if(!objectNode.nodeName) {
        objectNode.nodeName = "object"
      }
      if(fullSize) {
        objectNode.style.width = "100%";
        objectNode.style.height = "100%"
      }
    }
  };
  CDO.CloudeoException = function(message, code) {
    this.name = "CloudeoException";
    this.message = message;
    this.code = code
  };
  CDO._updateDescriptorReady = function(descriptor) {
    waitingForUpdateDescriptor = false;
    setTimeout(function() {
      var scriptNode = document.getElementById(UPDATE_DESCRIPTOR_CONTAINER_ID);
      scriptNode.parentNode.removeChild(scriptNode)
    }, 500);
    var ua = window.navigator.userAgent;
    var url = descriptor["url.installer"], failSafeInstallerURL = descriptor["url.installer"];
    if(/Chrome/.test(ua)) {
      url = descriptor["url.chromeExtension"]
    }else {
      if(/Firefox/.test(ua)) {
        url = descriptor["url.firefoxExtension"]
      }else {
        if(/MSIE 8|MSIE 9/.test(ua)) {
          url = descriptor["url.clickOnceInstaller"]
        }else {
          failSafeInstallerURL = undefined
        }
      }
    }
    installerURLResponder.result(url, failSafeInstallerURL)
  };
  CDO._getUpdateDescriptorSuffix = function() {
    var ua = window.navigator.userAgent;
    var suffix = false;
    if(/Windows/.test(ua)) {
      suffix = ".win"
    }else {
      if(/Mac OS X 10_[6-8]/.test(ua)) {
        suffix = ".mac"
      }
    }
    if(suffix) {
      return suffix
    }else {
      throw new CDO.CloudeoException("Cannot update - platform unsupported", CDO.ErrorCodes.Logic.PLATFORM_UNSUPPORTED);
    }
  };
  CDO._nop = function() {
  };
  CDO._logd = function(msg) {
  };
  CDO._logw = function(msg) {
  };
  CDO._loge = function(msg) {
  };
  CDO._setLocalStorageProperty = function(key, value) {
    if(localStorage) {
      localStorage[key] = value
    }
  };
  CDO._getLocalStorageProperty = function(key) {
    if(localStorage) {
      return localStorage[key]
    }else {
      return undefined
    }
  };
  function _wrapLogHandler(handler, level) {
    return function(msg) {
      handler(level, msg)
    }
  }
  function _setupStdLogLevel(cloudeoHandlerName, consoleName) {
    if(!window["console"]) {
      if(window.console[consoleName]) {
        try {
          window.console[consoleName]("Log initialization");
          CDO[cloudeoHandlerName] = function(msg) {
            window.console[consoleName](msg)
          };
          return true
        }catch(e) {
        }
      }
    }
    return false
  }
  function _loadScript(src, id, async, responder) {
    if(!responder) {
      responder = CDO._nop
    }
    var po = document.createElement("script");
    po.type = "text/javascript";
    po.async = async;
    po.src = src;
    po.onload = responder;
    po.id = id;
    var s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(po, s)
  }
  CDO._validateInterface = function(iface, instance, missingMethods) {
    if(!missingMethods) {
      missingMethods = []
    }
    var sampleInstance = new iface;
    for(var method in sampleInstance) {
      if(typeof instance[method] !== "function") {
        missingMethods.push(method)
      }
    }
    return!missingMethods.length
  };
  CDO._validateResponder = function(responder) {
    var msg;
    if(responder === undefined) {
      msg = "Responder not defined";
      CDO._loge(msg);
      throw new CDO.CloudeoException(msg, CDO.ErrorCodes.Logic.LOGIC_INVALID_ARGUMENT);
    }
    if(!CDO._validateInterface(CDO.Responder, responder)) {
      msg = "Invalid responder";
      CDO._loge(msg);
      throw new CDO.CloudeoException(msg, CDO.ErrorCodes.Logic.LOGIC_INVALID_ARGUMENT);
    }
  };
  CDO._isOwnProperty = function(obj, member) {
    return Object.prototype.hasOwnProperty.call(obj, member)
  };
  CDO._mergeObj = function(dest, src) {
    for(var k in src) {
      if(Object.prototype.hasOwnProperty.call(src, k)) {
        dest[k] = src[k]
      }
    }
  }
})();
(function() {
  CDO.ErrorCodes = {};
  CDO.ErrorCodes.Logic = {LOGIC_INVALID_ROOM:1001, INVALID_ROOM:1001, LOGIC_INVALID_ARGUMENT:1002, INVALID_ARGUMENT:1002, LOGIC_INVALID_JS_PARAMETER_KEY:1003, INVALID_JS_PARAMETER_KEY:1003, PLATFORM_INIT_FAILED:1004, LOGIC_PLATFORM_INIT_FAILED:1004, PLUGIN_UPDATING:1005, LOGIC_PLUGIN_UPDATING:1005, LOGIC_INTERNAL:1006, INTERNAL:1006, LIB_IN_USE:1007, LOGIC_LIB_IN_USE:1007, PLATFORM_UNSUPPORTED:1009, INVALID_STATE:1010};
  CDO.ErrorCodes.Communication = {COMM_INVALID_HOST:2001, INVALID_HOST:2001, COMM_INVALID_PORT:2002, INVALID_PORT:2002, COMM_BAD_AUTH:2003, BAD_AUTH:2003, COMM_MEDIA_LINK_FAILURE:2005, MEDIA_LINK_FAILURE:2005, COMM_REMOTE_END_DIED:2006, REMOTE_END_DIED:2006, COMM_INTERNAL:2007, INTERNAL:2007, COMM_ALREADY_JOINED:2009, ALREADY_JOINED:2009, PLUGIN_VERSION_NOT_SUPPORTED:2011};
  CDO.ErrorCodes.Media = {INVALID_VIDEO_DEV:4001, MEDIA_INVALID_VIDEO_DEV:4001, MEDIA_NO_AUDIO_IN_DEV:4002, NO_AUDIO_IN_DEV:4002, MEDIA_INVALID_AUDIO_IN_DEV:4003, INVALID_AUDIO_IN_DEV:4003, MEDIA_INVALID_AUDIO_OUT_DEV:4004, INVALID_AUDIO_OUT_DEV:4004, MEDIA_INVALID_AUDIO_DEV:4005, INVALID_AUDIO_DEV:4005};
  CDO.ErrorCodes.Common = {DEFAULT_ERROR:-1}
})();
(function() {
  CDO.PluginWrapper = function(configuration) {
    this.mimeType = configuration.mimeType;
    this.classId = configuration.classId;
    this.testMethod = configuration.testMethod;
    this.objectId = this.generateObjectTagId();
    this.params = {};
    this.attributes = {};
    this.polling = false;
    this.width = 0;
    this.height = 0
  };
  CDO.PluginWrapper.prototype.startPolling = function(handler, pollInterval) {
    this.pollingHandler = handler;
    if(this.polling) {
      return
    }
    this.polling = true;
    this._pollInterval = pollInterval || 1E3;
    this._startPolling()
  };
  CDO.PluginWrapper.prototype.stopPolling = function() {
    clearTimeout(this.pollingTimer)
  };
  CDO.PluginWrapper.prototype.unload = function() {
    CDO._logd("[PluginWrapper] Trying to unload plug-in");
    var pluginContainerId = this.pluginContainerId;
    if(!pluginContainerId) {
      CDO._loge("[PluginWrapper] Cannot unload plug-in: pluginContainerId " + "was not specified")
    }
    CDO._logd("[PluginWrapper] Removing OBJECT tag");
    document.getElementById(this.pluginContainerId).innerHTML = "";
    CDO._logd("[PluginWrapper] OBJECT tag removed from DOM")
  };
  CDO.PluginWrapper.prototype.loadPlugin = function() {
    CDO._logd("[PluginWrapper] Trying to embed plug-in");
    try {
      navigator.plugins.refresh()
    }catch(e) {
      CDO._logd("Failed to refresh " + e)
    }
    var installed = this._pluginInstalled();
    if(installed !== null && !installed) {
      CDO._logd("[PluginWrapper] Pre load tests shows that plug-in isn't " + "installed. Skipping");
      return false
    }
    CDO._logd("[PluginWrapper] Setting up OBJECT tag");
    return this._loadByMime(this.mimeType)
  };
  CDO.PluginWrapper.prototype.generateObjectTagId = function() {
    var text = "plugin_";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(var i = 0;i < 5;i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
  };
  CDO.PluginWrapper.prototype._pluginInstalled = function() {
    var ua = window.navigator.userAgent;
    if(window.navigator.plugins.length) {
      var installed = false;
      var self = this;
      for(var i = 0;i < window.navigator.plugins.length;i++) {
        var plugin = window.navigator.plugins[i];
        for(var j = 0;j < plugin.length;j++) {
          var mimeType = plugin[j];
          if(mimeType.type == self.mimeType) {
            return true
          }
        }
      }
      return false
    }else {
      return null
    }
  };
  CDO.PluginWrapper.prototype._startPolling = function() {
    var self = this;
    this.pollingTimer = setTimeout(function() {
      self._pollForPlugin()
    }, this._pollInterval)
  };
  CDO.PluginWrapper.prototype._pollForPlugin = function() {
    CDO._logd("[PluginWrapper] Polling for plug-in...");
    var loadStatus = this.loadPlugin();
    if(loadStatus) {
      CDO._logd("[PluginWrapper] Plugin loaded, notyfing listener");
      this.pollingHandler()
    }else {
      CDO._logd("[PluginWrapper] failed to load the plug-in, retrying");
      this._startPolling()
    }
  };
  CDO.PluginWrapper.prototype._loadByMime = function(mimeType) {
    if(!this.pluginContainerId) {
      CDO._loge("[PluginWrapper] Cannot embed plug-in: pluginContainerId " + "was not specified");
      return false
    }
    CDO._logd("[PluginWrapper] Resetting innerHTML of container");
    var container = document.getElementById(this.pluginContainerId);
    container.innerHTML = this._getObjectTag(mimeType);
    if(container && container.children && container.children[0]) {
      var objectNode = container.children[0];
      if(!objectNode.nodeName) {
        objectNode.nodeName = "object"
      }
    }
    CDO._logd("[PluginWrapper] OBJECT tag added to DOM. Testing for" + " method: " + this.testMethod);
    this.pluginInstance = document.getElementById(this.objectId);
    var result = this.testMethod === null || this.testMethod in this.pluginInstance;
    if(!result) {
      CDO._logd("[PluginWrapper] Plugin " + this.mimeType + " seems not to be installed")
    }
    return result
  };
  CDO.PluginWrapper.prototype._getObjectTag = function(mimeType) {
    var attrString = "";
    var k;
    for(k in this.attributes) {
      if(this.attributes.hasOwnProperty(k)) {
        attrString += k + '="' + this.attributes[k] + '" '
      }
    }
    var tagContent = '<object type="' + mimeType + '" id="' + this.objectId + '" ' + 'width="1" height="1"' + attrString + ">";
    for(k in this.params) {
      if(this.params.hasOwnProperty(k)) {
        tagContent += '<param name="' + k + '" value="' + this.params[k] + '"/>'
      }
    }
    tagContent += "  </object>";
    return tagContent
  };
  CDO.CloudeoPlugin = function(pluginContainerId, clientId) {
    this.pluginContainerId = pluginContainerId;
    if(clientId) {
      CDO._clientId = clientId
    }
  };
  var SAYMAMA_PLUGIN_CONFIG = {mimeType:"application/x-cloudeoplugin", classId:"clsid: 051e3002-6ebb-5b93-9382-f13f091b2ab2", testMethod:"createService"};
  CDO.CloudeoPlugin.prototype = new CDO.PluginWrapper(SAYMAMA_PLUGIN_CONFIG);
  CDO.CloudeoPlugin.prototype.constructor = CDO.CloudeoPlugin;
  CDO.CloudeoPlugin.prototype.createService = function(responder) {
    CDO._logd("[CloudeoPlugin] Creating new plug-in service instance");
    responder._realResultHandler = responder.result;
    responder.result = function(service) {
      service = new CDO.CloudeoService(service);
      CDO._service = service;
      this._realResultHandler(service)
    };
    responder.setMethod("createService()");
    this.pluginInstance.createService(responder)
  };
  CDO.CloudeoPlugin.prototype.update = function(listener, url) {
    CDO._logd("[CloudeoPlugin] Updating plug-in");
    if(!url) {
      url = CDO._PLUGIN_UPDATE_ROOT + CDO._UPDATE_DESCRIPTOR_NAME + CDO._getUpdateDescriptorSuffix()
    }
    _validateUpdateListenerMethod(listener, "updateProgress");
    _validateUpdateListenerMethod(listener, "updateStatus");
    if(this.pluginInstance["updateCS"] === undefined) {
      this.pluginInstance.update(listener, url)
    }else {
      this.pluginInstance.updateCS(listener, url)
    }
  };
  CDO.CloudeoPlugin.prototype.getLogFileTag = function() {
    CDO._logd("[CloudeoPlugin] Retrieving container log file tag");
    if(this.pluginInstance.getLogFileTag === undefined) {
      return null
    }
    return this.pluginInstance.getLogFileTag()
  };
  CDO.CloudeoPlugin.prototype.getLogFileByTag = function(tag) {
    CDO._logd("[CloudeoPlugin] Retrieving log file by tag " + tag);
    if(this.pluginInstance.getLogFileByTag === undefined) {
      return""
    }
    return this.pluginInstance.getLogFileByTag(tag)
  };
  CDO.PluginUpdateListener = function() {
  };
  CDO.PluginUpdateListener.prototype.updateProgress = function(progress) {
  };
  CDO.PluginUpdateListener.prototype.updateStatus = function(newStatus, errCode, errMessage) {
  };
  function _validateUpdateListenerMethod(listener, method) {
    if(listener[method] === undefined || typeof listener[method] !== "function") {
      throw new CDO.CloudeoException("Invalid udpate listener - " + method + " method is missing or not a " + "function", CDO.ErrorCodes.Logic.LOGIC_INVALID_ARGUMENT);
    }
  }
})();
(function() {
  CDO.Responder = function(resultHandler, errHandler, context) {
    if(context === undefined) {
      context = new Object
    }
    if(errHandler === undefined) {
      errHandler = CDO._nop
    }
    if(resultHandler === undefined) {
      resultHandler = CDO._nop
    }
    var self = this;
    this.result = function(result) {
      CDO._logd("Got successful result of method call " + this.method + ": " + result);
      resultHandler.call(self, result)
    };
    this.error = function(errCode, errMessage) {
      CDO._loge("Got error result of method call: " + this.method + ": " + errMessage + " (" + errCode + ")");
      errHandler.call(self, errCode, errMessage)
    };
    for(var k in context) {
      if(Object.prototype.hasOwnProperty.call(context, k)) {
        this[k] = context[k]
      }
    }
  };
  CDO.Responder.prototype.setMethod = function(method) {
    this.method = method
  };
  CDO.Responder.prototype.resultHandler = function(result) {
  };
  CDO.Responder.prototype.errHandler = function(errCode, errMessage) {
  };
  CDO.createResponder = function(resultHandler, errHandler, context) {
    return new CDO.Responder(resultHandler, errHandler, context)
  }
})();
(function() {
  CDO.CloudeoService = function(nativeService) {
    this.nativeService = nativeService;
    this.serviceid = nativeService.serviceid
  };
  CDO.CloudeoService.prototype.getVersion = function(responder) {
    CDO._logd("Getting service version");
    CDO._validateResponder(responder);
    responder.setMethod("getVersion()");
    this.nativeService.getVersion(responder)
  };
  CDO.CloudeoService.prototype.addServiceListener = function(responder, listener) {
    var r = responder;
    var l = listener;
    var msg = "Cannot register Cloudeo Service Listener as ";
    if(arguments.length === 0) {
      msg += "both responder and listener were not specified";
      CDO._loge(msg);
      throw new CDO.CloudeoException(msg, CDO.ErrorCodes.Logic.LOGIC_INVALID_ARGUMENT);
    }else {
      if(arguments.length == 1) {
        if(r["error"] === undefined) {
          CDO._logw("Responder not given to the call to the " + "addServiceListener. Using default one");
          l = r;
          r = CDO.createResponder()
        }else {
          msg += "listener was not specified";
          CDO._loge(msg);
          r.error(CDO.ErrorCodes.Logic.LOGIC_INVALID_ARGUMENT, msg);
          return
        }
      }
    }
    var missingMethods = [];
    if(!CDO._validateInterface(CDO.CloudeoServiceListener, l, missingMethods)) {
      msg = "Got invalid Cloudeo Service Listener. Missing methods: " + missingMethods;
      r.error(CDO.ErrorCodes.Logic.LOGIC_INVALID_ARGUMENT, msg);
      return
    }
    var adaptedListener = new CSLA(l);
    CDO._logd("Calling plugin method addCloudeoPluginListener({...})");
    r.setMethod("addEventListener({...})");
    this.nativeService.addCloudeoPluginListener(r, adaptedListener)
  };
  CDO.CloudeoService.prototype.getHostCpuDetails = function(responder) {
    CDO._logd("Calling plugin method getHostCpuDetails");
    CDO._validateResponder(responder);
    responder.setMethod("getHostCpuDetails()");
    responder._result = responder.result;
    responder.result = function(cpuInfo) {
      this._result.call(this, JSON.parse(cpuInfo))
    };
    this.nativeService.getHostCpuDetails(responder)
  };
  CDO.CloudeoService.prototype.getVideoCaptureDeviceNames = function(responder) {
    CDO._logd("Calling plugin method getVideoCaptureDeviceNames()");
    CDO._validateResponder(responder);
    responder.setMethod("getVideoCaptureDeviceNames()");
    this.nativeService.getVideoCaptureDeviceNames(responder)
  };
  CDO.CloudeoService.prototype.setVideoCaptureDevice = function(responder, deviceId) {
    CDO._logd("Calling plugin method setVideoCaptureDevice(" + deviceId + ")");
    var msg;
    if(arguments.length === 0) {
      msg = "setVideoCaptureDevice failure - both responder and device " + "id were not specified";
      throw new CDO.CloudeoException(msg, CDO.ErrorCodes.Logic.LOGIC_INVALID_ARGUMENT);
    }else {
      if(arguments.length === 1) {
        if(typeof responder === "string") {
          CDO._logw("Responder not given - although the setVideoCaptureDevice " + "does not return any result it's worth using a " + "responder to handler configuration error which is " + "possible due to device misuse by user");
          deviceId = responder;
          responder = CDO.createResponder()
        }else {
          CDO._validateResponder(responder);
          msg = "setVideoCaptureDevice failure - device id not specified";
          responder.error(msg, CDO.ErrorCodes.Logic.LOGIC_INVALID_ARGUMENT);
          return
        }
      }
    }
    CDO._validateResponder(responder);
    responder.setMethod("setVideoCaptureDevice(" + deviceId + ")");
    responder._originalResultHandler = responder.result;
    responder.result = function() {
      CDO._setLocalStorageProperty(CDO._CAM_CONFIG_KEY, deviceId);
      this._originalResultHandler()
    };
    this.nativeService.setVideoCaptureDevice(responder, deviceId)
  };
  CDO.CloudeoService.prototype.getVideoCaptureDevice = function(responder) {
    CDO._logd("Calling plugin method getVideoCaptureDevice()");
    CDO._validateResponder(responder);
    responder.setMethod("getVideoCaptureDevice()");
    this.nativeService.getVideoCaptureDevice(responder)
  };
  CDO.CloudeoService.prototype.getAudioCaptureDeviceNames = function(responder) {
    CDO._validateResponder(responder);
    CDO._logd("Calling plugin method getAudioCaptureDeviceNames()");
    responder.setMethod("getAudioCaptureDeviceNames()");
    this.nativeService.getAudioCaptureDeviceNames(responder)
  };
  CDO.CloudeoService.prototype.setAudioCaptureDevice = function(responder, deviceId) {
    CDO._logd("Calling plugin method setAudioCaptureDevice(" + deviceId + ")");
    responder.setMethod("setAudioCaptureDevice(" + deviceId + ")");
    responder._originalResultHandler = responder.result;
    responder.result = function() {
      CDO._setLocalStorageProperty(CDO._MIC_CONFIG_KEY, deviceId);
      this._originalResultHandler()
    };
    this.nativeService.setAudioCaptureDevice(responder, deviceId)
  };
  CDO.CloudeoService.prototype.getAudioCaptureDevice = function(responder) {
    CDO._logd("Calling plugin method getAudioCaptureDevice()");
    CDO._validateResponder(responder);
    responder.setMethod("getAudioCaptureDevice()");
    this.nativeService.getAudioCaptureDevice(responder)
  };
  CDO.CloudeoService.prototype.getAudioOutputDeviceNames = function(responder) {
    CDO._logd("Calling plugin method getAudioOutputDeviceNames()");
    CDO._validateResponder(responder);
    responder.setMethod("getAudioOutputDeviceNames()");
    this.nativeService.getAudioOutputDeviceNames(responder)
  };
  CDO.CloudeoService.prototype.setAudioOutputDevice = function(responder, deviceId) {
    CDO._logd("Calling plugin method setAudioOutputDevice(" + deviceId + ")");
    responder.setMethod("setAudioOutputDevice(" + deviceId + ")");
    responder._originalResultHandler = responder.result;
    responder.result = function() {
      CDO._setLocalStorageProperty(CDO._SPK_CONFIG_KEY, deviceId);
      this._originalResultHandler()
    };
    this.nativeService.setAudioOutputDevice(responder, deviceId)
  };
  CDO.CloudeoService.prototype.getAudioOutputDevice = function(responder) {
    CDO._logd("Calling plugin method getAudioOutputDevice()");
    CDO._validateResponder(responder);
    responder.setMethod("getAudioOutputDevice()");
    this.nativeService.getAudioOutputDevice(responder)
  };
  CDO.CloudeoService.prototype.getScreenCaptureSources = function(responder, thumbWidth) {
    CDO._logd("Calling plugin method getScreenCaptureDeviceNames(" + thumbWidth + ")");
    responder.setMethod("getScreenCaptureDeviceNames(" + thumbWidth + ")");
    CDO._validateResponder(responder);
    responder._originalResultHandler = responder.result;
    responder.result = function(devs) {
      devs = JSON.parse(devs);
      this._originalResultHandler(devs)
    };
    this.nativeService.getScreenCaptureDeviceNames(responder, thumbWidth)
  };
  CDO.CloudeoService.prototype.startLocalVideo = function(responder) {
    CDO._logd("Calling plugin method startLocalVideo()");
    CDO._validateResponder(responder);
    responder.setMethod("startLocalVideo()");
    this.nativeService.startLocalVideo(responder, 640, 480)
  };
  CDO.CloudeoService.prototype.stopLocalVideo = function(responder) {
    CDO._logd("Calling plugin method stopLocalVideo()");
    if(!responder) {
      responder = CDO.createResponder()
    }
    responder.setMethod("stopLocalVideo()");
    this.nativeService.stopLocalVideo(responder)
  };
  CDO.CloudeoService.prototype.connect = function(responder, connectionDescription) {
    CDO._logd("Calling plugin method connect(" + connectionDescription + ")");
    responder.setMethod("connect(" + JSON.stringify(connectionDescription) + ")");
    if(!_sanitizeConnectionDescriptor(responder, connectionDescription)) {
      return
    }
    var url = connectionDescription.url;
    var scopeId = _unwrapScopeId(_getScopeFromURL(url));
    var params = JSON.stringify(connectionDescription);
    responder._originalResultHandler = responder.result;
    responder.result = function(result) {
      this._originalResultHandler(new CDO.MediaConnection(scopeId))
    };
    CDO._logd("Connecting to Streamer endpoint with URL: " + url);
    this.nativeService.connect(responder, params)
  };
  CDO.CloudeoService.prototype.getConnectedUsers = function(responder, scopeId, token) {
    responder.setMethod("getConnectedUsers(" + url + "," + token + ")");
    if(token === undefined) {
      token = "1"
    }
    this.nativeService.getConnectedUsers(responder, url, token)
  };
  CDO.CloudeoService.prototype.disconnect = function(responder, scopeId) {
    CDO._logd("Calling plugin method disconnect(" + scopeId + ")");
    if(typeof responder === "string") {
      scopeId = responder;
      responder = CDO.createResponder()
    }
    responder.setMethod("disconnect(" + scopeId + ")");
    this.nativeService.disconnect(responder, _wrapScopeId(scopeId))
  };
  CDO.CloudeoService.prototype.publish = function(responder, scopeId, what, details) {
    if(details === undefined) {
      details = ""
    }
    var methodString = "publish(" + scopeId + ", " + what + ", " + JSON.stringify(details) + ")";
    CDO._logd("Calling plugin method " + methodString);
    responder.setMethod(methodString);
    this.nativeService.publish(responder, _wrapScopeId(scopeId), what, details)
  };
  CDO.CloudeoService.prototype.unpublish = function(responder, scopeId, what) {
    var methodString = "unpublish(" + scopeId + ", " + what + ")";
    CDO._logd("Calling plugin method " + methodString);
    responder.setMethod(methodString);
    this.nativeService.unpublish(responder, _wrapScopeId(scopeId), what)
  };
  CDO.CloudeoService.prototype.sendMessage = function(responder, scopeId, message, targetUserId) {
    var method = "broadcast(" + scopeId + ", " + message + ", " + targetUserId + ")";
    CDO._logd("Calling plugin method " + method);
    responder.setMethod(method);
    scopeId = _wrapScopeId(scopeId);
    if(targetUserId) {
      this.nativeService.broadcast(responder, scopeId, message, targetUserId)
    }else {
      this.nativeService.broadcast(responder, scopeId, message)
    }
  };
  CDO.CloudeoService.prototype.getSpeakersVolume = function(responder) {
    CDO._logd("Calling plugin method getSpeakersVolume()");
    responder.setMethod("getSpeakersVolume()");
    this.nativeService.getSpeakersVolume(responder)
  };
  CDO.CloudeoService.prototype.setSpeakersVolume = function(responder, volume) {
    CDO._logd("Calling plugin method setSpeakersVolume(" + volume + ")");
    responder.setMethod("setSpeakersVolume(" + volume + ")");
    this.nativeService.setSpeakersVolume(responder, volume)
  };
  CDO.CloudeoService.prototype.getMicrophoneVolume = function(responder) {
    CDO._logd("Calling plugin method getMicrophoneVolume()");
    responder.setMethod("getMicrophoneVolume()");
    this.nativeService.getMicrophoneVolume(responder)
  };
  CDO.CloudeoService.prototype.setMicrophoneVolume = function(responder, volume) {
    CDO._logd("Calling plugin method setMicrophoneVolume(" + volume + ")");
    responder.setMethod("setMicrophoneVolume(" + volume + ")");
    this.nativeService.setMicrophoneVolume(responder, volume)
  };
  CDO.CloudeoService.prototype.monitorMicActivity = function(responder, enabled) {
    CDO._logd("Calling plugin method monitorMicActivity(" + enabled + ")");
    responder.setMethod("monitorMicActivity(" + enabled + ")");
    this.nativeService.monitorMicActivity(responder, enabled)
  };
  CDO.CloudeoService.prototype.startMeasuringStatistics = function(responder, scopeId, interval) {
    CDO._logd("Calling plugin method startMeasuringStatistics(" + scopeId + ", " + interval + ")");
    responder.setMethod("startMeasuringStatistics(" + scopeId + ", " + interval + ")");
    scopeId = _wrapScopeId(scopeId);
    this.nativeService.startMeasuringStatistics(responder, scopeId, interval)
  };
  CDO.CloudeoService.prototype.stopMeasuringStatistics = function(responder, scopeId) {
    CDO._logd("Calling plugin method stopMeasuringStatistics(" + scopeId + ")");
    responder.setMethod("stopMeasuringStatistics(" + scopeId + ")");
    scopeId = _wrapScopeId(scopeId);
    this.nativeService.stopMeasuringStatistics(responder, scopeId)
  };
  CDO.CloudeoService.prototype.startPlayingTestSound = function(responder) {
    CDO._logd("Calling plugin method startPlayingTestSound()");
    responder.setMethod("startPlayingTestSound()");
    this.nativeService.startPlayingTestSound(responder)
  };
  CDO.CloudeoService.prototype.stopPlayingTestSound = function(responder) {
    CDO._logd("Calling plugin method stopPlayingTestSound()");
    responder.setMethod("stopPlayingTestSound()");
    this.nativeService.stopPlayingTestSound(responder)
  };
  CDO.CloudeoService.prototype.getProperty = function(responder, name) {
    var method = "getSmProperty(" + name + ")";
    CDO._logd("Calling plugin method " + method);
    responder.setMethod(method);
    this.nativeService.getSmProperty(responder, name)
  };
  CDO.CloudeoService.prototype.setProperty = function(responder, name, value) {
    var method = "setSmProperty(" + name + ", " + value + ")";
    CDO._logd("Calling plugin method " + method);
    responder.setMethod(method);
    this.nativeService.setSmProperty(responder, name, value)
  };
  CDO.CloudeoService.prototype.getLogFileTag = function(responder) {
    var method = "getLogFileTag()";
    CDO._logd("Calling plugin method " + method);
    responder.setMethod(method);
    this.nativeService.getLogFileTag(responder)
  };
  CDO.CloudeoService.prototype.echo = function(responder, value) {
    this.nativeService.echo(responder, value)
  };
  CDO.CloudeoService.prototype.echoNotification = function(responder, value) {
    this.nativeService.echoNotification(responder, value)
  };
  function CSLA(listener) {
    this.listener = listener
  }
  CSLA.prototype.videoFrameSizeChanged = function(sinkId, width, height) {
    this.listener.onVideoFrameSizeChanged(new CDO.VideoFrameSizeChangedEvent(sinkId, width, height))
  };
  CSLA.prototype.connectionLost = function(scopeId, errCode, errMessage) {
    scopeId = _unwrapScopeId(scopeId);
    this.listener.onConnectionLost(new CDO.ConnectionLostEvent(scopeId, errCode, errMessage))
  };
  CSLA.prototype.onUserEvent = function(scopeId, userDetails) {
    scopeId = _unwrapScopeId(scopeId);
    this.listener.onUserEvent(new CDO.UserStateChangedEvent(scopeId, userDetails))
  };
  CSLA.prototype.onVideoEvent = function(scopeId, userDetails) {
    scopeId = _unwrapScopeId(scopeId);
    this.listener.onMediaStreamEvent(new CDO.UserStateChangedEvent(scopeId, userDetails, CDO.MEDIA_TYPE_VIDEO))
  };
  CSLA.prototype.onAudioEvent = function(scopeId, userDetails) {
    scopeId = _unwrapScopeId(scopeId);
    this.listener.onMediaStreamEvent(new CDO.UserStateChangedEvent(scopeId, userDetails, CDO.MEDIA_TYPE_AUDIO))
  };
  CSLA.prototype.screenPublished = function(scopeId, userId, isPublished, sinkId) {
    scopeId = _unwrapScopeId(scopeId);
    var userDetails = {id:userId, screenPublished:isPublished, screenSinkId:sinkId};
    this.listener.onMediaStreamEvent(new CDO.UserStateChangedEvent(scopeId, userDetails, CDO.MEDIA_TYPE_SCREEN))
  };
  CSLA.prototype.micActivity = function(activity) {
    this.listener.onMicActivity(new CDO.MicActivityEvent(activity))
  };
  CSLA.prototype.spkActivity = function(activity) {
  };
  CSLA.prototype.micGain = function(gain) {
    this.listener.onMicGain(new CDO.MicGainEvent(gain))
  };
  CSLA.prototype.deviceListChanged = function(audioIn, audioOut, videoIn) {
    this.listener.onDeviceListChanged(new CDO.DeviceListChangedEvent(audioIn, audioOut, videoIn))
  };
  CSLA.prototype.newVideoStats = function(scopeId, userId, stats) {
    scopeId = _unwrapScopeId(scopeId);
    if(userId == -1) {
      userId = undefined
    }
    this.listener.onMediaStats(new CDO.MediaStatsEvent(scopeId, CDO.MEDIA_TYPE_VIDEO, stats, userId))
  };
  CSLA.prototype.newAudioStats = function(scopeId, userId, stats) {
    scopeId = _unwrapScopeId(scopeId);
    if(userId == -1) {
      userId = undefined
    }
    this.listener.onMediaStats(new CDO.MediaStatsEvent(scopeId, CDO.MEDIA_TYPE_AUDIO, stats, userId))
  };
  CSLA.prototype.newScreenStats = function(scopeId, userId, stats) {
    scopeId = _unwrapScopeId(scopeId);
    if(userId == -1) {
      userId = undefined
    }
    this.listener.onMediaStats(new CDO.MediaStatsEvent(scopeId, CDO.MEDIA_TYPE_SCREEN, stats, userId))
  };
  CSLA.prototype.onBroadcast = function(srcUserId, data) {
    this.listener.onMessage(new CDO.MessageEvent(srcUserId, data))
  };
  CSLA.prototype.serviceInvalidated = function() {
    this.listener.onServiceInvalidated()
  };
  CSLA.prototype.serviceRevalidated = function() {
    this.listener.onServiceRevalidated()
  };
  CSLA.prototype.newMediaConnectionType = function(scopeId, mediaType, connectionType) {
    scopeId = _unwrapScopeId(scopeId);
    if(mediaType === "AUDIO") {
      mediaType = CDO.MEDIA_TYPE_AUDIO
    }else {
      if(mediaType === "VIDEO") {
        mediaType = CDO.MEDIA_TYPE_VIDEO
      }
    }
    this.listener.onMediaConnTypeChanged(new CDO.MediaConnTypeChangedEvent(scopeId, mediaType, connectionType))
  };
  CSLA.prototype.onEchoNotification = function(echoedValue) {
    this.listener.onEchoNotification(echoedValue)
  };
  function _wrapScopeId(scopeId) {
    return CDO._clientId + "_" + scopeId
  }
  function _wrapURL(url) {
    var endpoint = url.substring(0, url.indexOf("/")), scopeId = url.substring(url.indexOf("/") + 1, url.length);
    var wrapped = _wrapScopeId(scopeId);
    return endpoint + "/" + wrapped
  }
  function _unwrapScopeId(scopeId) {
    var prefixLen = (CDO._clientId + "_").length;
    return scopeId.substring(prefixLen, scopeId.length)
  }
  function _getScopeFromURL(url) {
    var endpoint = url.substring(0, url.indexOf("/")), scopeId = url.substring(url.indexOf("/") + 1, url.length);
    return scopeId
  }
  function _sanitizeConnectionDescriptor(responder, connDescriptor) {
    for(var i = 0;i < _CONN_DESCR_SANITIZERS.length;i++) {
      if(!_CONN_DESCR_SANITIZERS[i](responder, connDescriptor)) {
        return false
      }
    }
    return true
  }
  function _sanitizeToken(listener, connDescriptor) {
    connDescriptor.token += "";
    return true
  }
  function _sanitizeConnDescriptorURL(listener, connectionDescription) {
    var scopeId;
    if(connectionDescription.url) {
      connectionDescription.url = _wrapURL(connectionDescription.url);
      var u = connectionDescription.url;
      scopeId = u.substring(u.indexOf("/") + 1, u.length)
    }else {
      if(connectionDescription.scopeId) {
        scopeId = connectionDescription.scopeId;
        connectionDescription.url = CDO._getStreamerEndpoint(connectionDescription.scopeId) + "/" + _wrapScopeId(connectionDescription.scopeId)
      }else {
        responder.error(CDO.ErrorCodes.Logic.LOGIC_INVALID_ARGUMENT, "Cannot connect as neither scopeId or url not given in the " + "connection descriptor.");
        return false
      }
    }
    return true
  }
  var _CONN_DESCR_SANITIZERS = [_sanitizeConnDescriptorURL, _sanitizeToken]
})();
(function() {
  CDO.CloudeoServiceListener = function() {
  };
  CDO.CloudeoServiceListener.prototype.onVideoFrameSizeChanged = function(e) {
  };
  CDO.CloudeoServiceListener.prototype.onConnectionLost = function(e) {
  };
  CDO.CloudeoServiceListener.prototype.onUserEvent = function(e) {
  };
  CDO.CloudeoServiceListener.prototype.onMediaStreamEvent = function(e) {
  };
  CDO.CloudeoServiceListener.prototype.onMicActivity = function(e) {
  };
  CDO.CloudeoServiceListener.prototype.onMicGain = function(e) {
  };
  CDO.CloudeoServiceListener.prototype.onDeviceListChanged = function(e) {
  };
  CDO.CloudeoServiceListener.prototype.onMediaStats = function(e) {
  };
  CDO.CloudeoServiceListener.prototype.onMessage = function(e) {
  };
  CDO.CloudeoServiceListener.prototype.onServiceInvalidated = function() {
  };
  CDO.CloudeoServiceListener.prototype.onServiceRevalidated = function() {
  };
  CDO.CloudeoServiceListener.prototype.onMediaConnTypeChanged = function(e) {
  };
  CDO.VideoFrameSizeChangedEvent = function(sinkId, width, height) {
    this.type = "VideoFrameSizeChangedEvent";
    this.sinkId = sinkId;
    this.width = width;
    this.height = height
  };
  CDO.ConnectionLostEvent = function(scopeId, errCode, errMessage) {
    this.type = "ConnectionLostEvent";
    this.scopeId = scopeId;
    this.errCode = errCode;
    this.errMessage = errMessage
  };
  CDO.UserStateChangedEvent = function(scopeId, userDetails, mediaType) {
    this.type = "UserStateChangedEvent";
    this.scopeId = scopeId;
    this.userId = userDetails.id || userDetails.userId;
    this.mediaType = mediaType;
    this.isConnected = userDetails.isConnected;
    this.audioPublished = userDetails.audioPublished;
    this.videoPublished = userDetails.videoPublished;
    this.screenPublished = userDetails.screenPublished;
    this.videoSinkId = userDetails.videoSinkId;
    this.screenSinkId = userDetails.screenSinkId
  };
  CDO.MicActivityEvent = function(activity) {
    this.type = "MicActivityEvent";
    this.activity = activity
  };
  CDO.MicGainEvent = function(gain) {
    this.type = "MicGainEvent";
    this.gain = gain
  };
  CDO.DeviceListChangedEvent = function(audioIn, audioOut, videoIn) {
    this.type = "DeviceListChangedEvent";
    this.audioInChanged = audioIn;
    this.audioOutChanged = audioOut;
    this.videoInChanged = videoIn
  };
  CDO.MediaStatsEvent = function(scopeId, mediaType, stats, remoteUserId) {
    this.type = "MediaStatsEvent";
    this.scopeId = scopeId;
    this.mediaType = mediaType;
    this.stats = stats;
    this.remoteUserId = remoteUserId
  };
  CDO.MessageEvent = function(srcUserId, data) {
    this.type = "MessageEvent";
    this.srcUserId = srcUserId;
    this.data = data
  };
  CDO.MediaConnTypeChangedEvent = function(scopeId, mediaType, connectionType) {
    this.type = "MediaConnTypeChangedEvent";
    this.scopeId = scopeId;
    this.mediaType = mediaType;
    this.connectionType = connectionType
  }
})();
var JSON;
if(!JSON) {
  JSON = {}
}
(function() {
  function f(n) {
    return n < 10 ? "0" + n : n
  }
  if(typeof Date.prototype.toJSON !== "function") {
    Date.prototype.toJSON = function(key) {
      return isFinite(this.valueOf()) ? this.getUTCFullYear() + "-" + f(this.getUTCMonth() + 1) + "-" + f(this.getUTCDate()) + "T" + f(this.getUTCHours()) + ":" + f(this.getUTCMinutes()) + ":" + f(this.getUTCSeconds()) + "Z" : null
    };
    String.prototype.toJSON = Number.prototype.toJSON = Boolean.prototype.toJSON = function(key) {
      return this.valueOf()
    }
  }
  var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, gap, indent, meta = {"\u0008":"\\b", "\t":"\\t", "\n":"\\n", "\u000c":"\\f", "\r":"\\r", '"':'\\"', "\\":"\\\\"}, rep;
  function quote(string) {
    escapable.lastIndex = 0;
    return escapable.test(string) ? '"' + string.replace(escapable, function(a) {
      var c = meta[a];
      return typeof c === "string" ? c : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
    }) + '"' : '"' + string + '"'
  }
  function str(key, holder) {
    var i, k, v, length, mind = gap, partial, value = holder[key];
    if(value && typeof value === "object" && typeof value.toJSON === "function") {
      value = value.toJSON(key)
    }
    if(typeof rep === "function") {
      value = rep.call(holder, key, value)
    }
    switch(typeof value) {
      case "string":
        return quote(value);
      case "number":
        return isFinite(value) ? String(value) : "null";
      case "boolean":
      ;
      case "null":
        return String(value);
      case "object":
        if(!value) {
          return"null"
        }
        gap += indent;
        partial = [];
        if(Object.prototype.toString.apply(value) === "[object Array]") {
          length = value.length;
          for(i = 0;i < length;i += 1) {
            partial[i] = str(i, value) || "null"
          }
          v = partial.length === 0 ? "[]" : gap ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]" : "[" + partial.join(",") + "]";
          gap = mind;
          return v
        }
        if(rep && typeof rep === "object") {
          length = rep.length;
          for(i = 0;i < length;i += 1) {
            if(typeof rep[i] === "string") {
              k = rep[i];
              v = str(k, value);
              if(v) {
                partial.push(quote(k) + (gap ? ": " : ":") + v)
              }
            }
          }
        }else {
          for(k in value) {
            if(Object.prototype.hasOwnProperty.call(value, k)) {
              v = str(k, value);
              if(v) {
                partial.push(quote(k) + (gap ? ": " : ":") + v)
              }
            }
          }
        }
        v = partial.length === 0 ? "{}" : gap ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}" : "{" + partial.join(",") + "}";
        gap = mind;
        return v
    }
  }
  if(typeof JSON.stringify !== "function") {
    JSON.stringify = function(value, replacer, space) {
      var i;
      gap = "";
      indent = "";
      if(typeof space === "number") {
        for(i = 0;i < space;i += 1) {
          indent += " "
        }
      }else {
        if(typeof space === "string") {
          indent = space
        }
      }
      rep = replacer;
      if(replacer && typeof replacer !== "function" && (typeof replacer !== "object" || typeof replacer.length !== "number")) {
        throw new Error("JSON.stringify");
      }
      return str("", {"":value})
    }
  }
  if(typeof JSON.parse !== "function") {
    JSON.parse = function(text, reviver) {
      var j;
      function walk(holder, key) {
        var k, v, value = holder[key];
        if(value && typeof value === "object") {
          for(k in value) {
            if(Object.prototype.hasOwnProperty.call(value, k)) {
              v = walk(value, k);
              if(v !== undefined) {
                value[k] = v
              }else {
                delete value[k]
              }
            }
          }
        }
        return reviver.call(holder, key, value)
      }
      text = String(text);
      cx.lastIndex = 0;
      if(cx.test(text)) {
        text = text.replace(cx, function(a) {
          return"\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
        })
      }
      if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
        j = eval("(" + text + ")");
        return typeof reviver === "function" ? walk({"":j}, "") : j
      }
      throw new SyntaxError("JSON.parse");
    }
  }
})();
(function() {
  var _DEFAULT_PLATFORM_INIT_OPTIONS = {pluginPollFrequency:500, initDevices:true};
  var _UPDATE_BEGIN_PROGRESS = 5;
  var _UPDATE_END_PROGRESS = 70;
  var _CREATE_SERVICE_BEGIN_PROGRESS = 71;
  var _CREATE_SERVICE_END_PROGRESS = 80;
  var _INIT_COMPLETE_PROGRESS = 100;
  var _DEFAULT_CLIENT_ID = 1;
  CDO.initPlatform = function(listener, optionsOrClientId) {
    CDO._logd("Initializing the platform");
    _validatePlatformOptions(optionsOrClientId);
    CDO._platformOptions = {};
    CDO._mergeObj(CDO._platformOptions, _DEFAULT_PLATFORM_INIT_OPTIONS);
    CDO._clientId = _DEFAULT_CLIENT_ID;
    if(optionsOrClientId) {
      if(typeof optionsOrClientId === "number") {
        CDO._clientId = optionsOrClientId
      }else {
        CDO._mergeObj(CDO._platformOptions, optionsOrClientId);
        if(optionsOrClientId.clientId !== undefined) {
          CDO._clientId = optionsOrClientId.clientId
        }
      }
    }
    var pluginContainerId = _embedPluginContainer();
    var pluginInstalled = _embedPlugin();
    if(pluginInstalled) {
      _updatePlugin(listener)
    }else {
      _getInstallURL(listener)
    }
  };
  CDO.getService = function() {
    return CDO._service
  };
  CDO.disposePlatform = function() {
    CDO._logd("Disposing platform");
    delete CDO._service;
    CDO._pluginInstance.unload();
    delete CDO._pluginInstance
  };
  CDO.PlatformInitListener = function() {
  };
  CDO.PlatformInitListener.prototype.onInitStateChanged = function(event) {
  };
  CDO.PlatformInitListener.prototype.onInitProgressChanged = function(event) {
  };
  CDO.InitStateChangedEvent = function(state, installerUrl, errCode, errMessage, failSafeInstallerURL) {
    this.state = state;
    this.errCode = errCode;
    this.errMessage = errMessage;
    this.installerURL = installerUrl;
    this.failSafeInstallerUrl = failSafeInstallerURL
  };
  CDO.InitProgressChangedEvent = function(progress) {
    this.progress = progress
  };
  CDO.InitState = {ERROR:"ERROR", INITIALIZED:"INITIALIZED", BROWSER_RESTART_REQUIRED:"BROWSER_RESTART_REQUIRED", INSTALLATION_REQUIRED:"INSTALLATION_REQUIRED", INSTALLATION_COMPLETE:"INSTALLATION_COMPLETE"};
  function _embedPluginContainer() {
    var pluginContainer = document.createElement("div");
    pluginContainer.style.position = "fixed";
    pluginContainer.style.overflow = "hidden";
    pluginContainer.style.width = 10;
    pluginContainer.style.height = 10;
    pluginContainer.style.top = 0;
    pluginContainer.style.left = -100;
    pluginContainer.id = "cloudeoPluginContainer" + _generateRandomIdSuffix();
    document.body.appendChild(pluginContainer);
    CDO._pluginContainerId = pluginContainer.id
  }
  function _embedPlugin() {
    CDO._logd("Embedding the Cloudeo plugin inside a container with id: " + CDO._pluginContainerId);
    CDO._pluginInstance = new CDO.CloudeoPlugin(CDO._pluginContainerId);
    return CDO._pluginInstance.loadPlugin()
  }
  function _updatePlugin(listener) {
    var updateListener = new CDO.PluginUpdateListener;
    updateListener.updateProgress = function(progress) {
      var progressRange = _UPDATE_END_PROGRESS - _UPDATE_BEGIN_PROGRESS;
      var progressWeighted = _UPDATE_BEGIN_PROGRESS + progressRange * progress / 100;
      this.initListener.onInitProgressChanged(new CDO.InitProgressChangedEvent(progressWeighted))
    };
    updateListener.updateStatus = function(status, errCode, error) {
      var initListener = this.initListener;
      switch(status) {
        case "UPDATING":
          break;
        case "UPDATED":
        ;
        case "UP_TO_DATE":
          _createService(initListener);
          break;
        case "UPDATED_RESTART":
          initListener.onInitProgressChanged(new CDO.InitProgressChangedEvent(_INIT_COMPLETE_PROGRESS));
          initListener.onInitStateChanged(new CDO.InitStateChangedEvent(CDO.InitState.BROWSER_RESTART_REQUIRED));
          break;
        case "NEEDS_MANUAL_UPDATE":
          break;
        case "ERROR":
          break;
        default:
          break
      }
    };
    updateListener.initListener = listener;
    listener.onInitProgressChanged(new CDO.InitProgressChangedEvent(_UPDATE_BEGIN_PROGRESS));
    CDO._pluginInstance.update(updateListener)
  }
  function _getInstallURL(listener) {
    var succHandler = function(url, failSafeUrl) {
      listener.onInitStateChanged(new CDO.InitStateChangedEvent(CDO.InitState.INSTALLATION_REQUIRED, url, undefined, undefined, failSafeUrl));
      CDO._pluginInstance.startPolling(_getPollingHandler(listener), CDO._platformOptions.pluginPollFrequency)
    };
    var errHandler = function(errCode, errMessage) {
      listener.onInitStateChanged(new CDO.InitStateChangedEvent(CDO.InitState.ERROR, undefined, errCode, errMessage))
    };
    CDO.getInstallerURL(CDO.createResponder(succHandler, errHandler))
  }
  function _createService(listener) {
    listener.onInitProgressChanged(new CDO.InitProgressChangedEvent(_CREATE_SERVICE_BEGIN_PROGRESS));
    var createServiceResultHandler = function(service) {
      listener.onInitProgressChanged(new CDO.InitProgressChangedEvent(_CREATE_SERVICE_END_PROGRESS));
      CDO._service = service;
      if(CDO._platformOptions.initDevices) {
        _initDevices(listener)
      }else {
        CDO._logw("Skipping devices initialization due to " + "platformOptions.initDevices being false");
        listener.onInitProgressChanged(new CDO.InitProgressChangedEvent(_INIT_COMPLETE_PROGRESS));
        listener.onInitStateChanged(new CDO.InitStateChangedEvent(CDO.InitState.INITIALIZED))
      }
    };
    var createServiceErrorHandler = function(errCode, errMessage) {
      listener.onInitProgressChanged(new CDO.InitProgressChangedEvent(_INIT_COMPLETE_PROGRESS));
      listener.onInitStateChanged(new CDO.InitStateChangedEvent(CDO.InitState.ERROR, undefined, errCode, errMessage))
    };
    CDO._pluginInstance.createService(CDO.createResponder(createServiceResultHandler, createServiceErrorHandler))
  }
  function _initDevices(listener) {
    var stepsToComplete = 3;
    listener._currentProgress = _CREATE_SERVICE_END_PROGRESS;
    var stepComplete = function() {
      stepsToComplete--;
      if(stepsToComplete === 0) {
        delete listener["_currentProgress"];
        listener.onInitProgressChanged(new CDO.InitProgressChangedEvent(_INIT_COMPLETE_PROGRESS));
        listener.onInitStateChanged(new CDO.InitStateChangedEvent(CDO.InitState.INITIALIZED))
      }else {
        listener._currentProgress += 5;
        listener.onInitProgressChanged(new CDO.InitProgressChangedEvent(listener._currentProgress))
      }
    };
    _configDeviceOfType("VideoCapture", CDO._CAM_CONFIG_KEY, stepComplete);
    _configDeviceOfType("AudioCapture", CDO._MIC_CONFIG_KEY, stepComplete);
    _configDeviceOfType("AudioOutput", CDO._SPK_CONFIG_KEY, stepComplete)
  }
  function _configDeviceOfType(devType, storageProperty, stepComplete) {
    var getNamesMethod = "get" + devType + "DeviceNames";
    var setMethod = "set" + devType + "Device";
    CDO._service[getNamesMethod](CDO.createResponder(function(devs) {
      var configuredDev = CDO._getLocalStorageProperty(storageProperty);
      if(!(configuredDev && configuredDev in devs)) {
        for(var k in devs) {
          if(Object.prototype.hasOwnProperty.call(devs, k)) {
            configuredDev = k;
            CDO._setLocalStorageProperty(storageProperty, configuredDev);
            break
          }
        }
      }
      CDO._service[setMethod](CDO.createResponder(stepComplete, stepComplete), configuredDev)
    }, function(errCode, errMessage) {
      CDO._logw("Failed to initialize device of type: " + devType + " due to: " + errMessage + "(" + errCode + ")");
      stepComplete()
    }))
  }
  function _generateRandomIdSuffix() {
    return Math.random().toString(36).substring(2, 5)
  }
  function _getPollingHandler(listener) {
    return function() {
      listener.onInitStateChanged(new CDO.InitStateChangedEvent(CDO.InitState.INSTALLATION_COMPLETE));
      _createService(listener)
    }
  }
  function _validatePlatformOptions(options) {
    if(options === undefined) {
      return
    }
    var msg;
    if(options.pluginPollFrequency !== undefined) {
      var originalPollValue = options.pluginPollFrequency;
      options.pluginPollFrequency = parseInt(originalPollValue);
      if(options.pluginPollFrequency === NaN || options.pluginPollFrequency < 0) {
        msg = "Invalid initialization options object - invalid " + "pluginPollFrequency property value: " + originalPollValue;
        throw new CDO.CloudeoException(msg, CDO.ErrorCodes.Logic.LOGIC_INVALID_ARGUMENT);
      }
    }
  }
})();
(function() {
  CDO._CLIENT_ENDPOINTS = CDO._CLIENT_ENDPOINTS || {};
  CDO._getStreamerEndpoint = function(scopeId) {
    if(CDO._CLIENT_ENDPOINTS[CDO._clientId] === undefined) {
      return CDO._DEFAULT_STREAMER_ENDPOINT
    }else {
      return CDO._CLIENT_ENDPOINTS[CDO._clientId]
    }
  }
})();
(function() {
  CDO.MediaConnection = function(scopeId) {
    this.scopeId = scopeId
  };
  CDO.MediaConnection.prototype.publish = function(responder, what, how) {
    CDO.getService().publish(responder, this.scopeId, what, how)
  };
  CDO.MediaConnection.prototype.unpublish = function(responder, what) {
    CDO.getService().unpublish(responder, this.scopeId, what)
  };
  CDO.MediaConnection.prototype.publishAudio = function(responder) {
    this.publish(responder, CDO.MediaType.AUDIO)
  };
  CDO.MediaConnection.prototype.unpublishAudio = function(responder) {
    this.unpublish(responder, CDO.MediaType.AUDIO)
  };
  CDO.MediaConnection.prototype.publishVideo = function(responder) {
    this.publish(responder, CDO.MediaType.VIDEO)
  };
  CDO.MediaConnection.prototype.unpublishVideo = function(responder) {
    this.unpublish(responder, CDO.MediaType.VIDEO)
  };
  CDO.MediaConnection.prototype.publishScreen = function(responder, windowId, nativeWidth) {
    if(nativeWidth === undefined) {
      nativeWidth = 640
    }
    this.publish(responder, CDO.MediaType.SCREEN, {windowId:windowId, nativeWidth:nativeWidth})
  };
  CDO.MediaConnection.prototype.unpublishScreen = function(responder) {
    this.unpublish(responder, CDO.MediaType.SCREEN)
  };
  CDO.MediaConnection.prototype.disconnect = function(responder) {
    CDO.getService().disconnect(responder, this.scopeId)
  };
  CDO.MediaConnection.prototype.sendMessage = function(responder, message, targetUserId) {
    CDO.getService().sendMessage(responder, this.scopeId, message, targetUserId)
  }
})();
(function() {
  CDO.RELEASE_LEVEL = "dev";
  CDO.VERSION = "1.17.0";
  CDO._DEFAULT_STREAMER_ENDPOINT = "46.137.126.193:7005";
  CDO._PLUGIN_UPDATE_ROOT = "http://s3.amazonaws.com/api.cloudeo/dev/";
  CDO._PLUGIN_INSTALL_ROOT = "https://s3.amazonaws.com/api.cloudeo/dev/"
})();
(function() {
  CDO._CLIENT_ENDPOINTS = {}
})();
