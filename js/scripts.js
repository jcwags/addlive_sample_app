/**
 * This is free and unencumbered software released into the public domain.
 * For more information, please refer to <http://unlicense.org/>
 *
 * Contains all functional code providing the Cloudeo Sample Application
 * functionality
 *
 * @author Tadeusz Kozak
 * @date 25-04-2012 13:01
 */

/**
 * =============================================================================
 * Constants definition
 * =============================================================================
 */

var UPDATE_DESCR_BASE = 'http://www.cloudeo.tv/plugin/update.';

var PLUGIN_CONTAINER_ID = 'pluginContainer';

/**
 *
 * CloudeoPlugin instance.
 * @type CDO.CloudeoPlugin
 */
var plugin;

/**
 * CloudeoService instance.
 * @type CDO.CloudeoService
 */
var service;

//noinspection StringLiteralBreaksHTMLJS

/**
 * Template for rendering remote user video feed.
 * @type {String}
 */
var RENDER_TMPL = '<li id="userFeed#" class="remote-feed"></li>';

/**
 * Template for rendering local user video feed.
 * @type {String}
 */
var RENDER_LOCAL_TMPL = '<li id="userFeed#"></li>';

var STREAMER_URL_BASE = "67.228.150.188:704/";

/**
 * Id of scope to which user is connected.
 */
var connectedScopeId;

/**
 * Connection descriptor - describes the connection to be established.
 * @type {Object}
 */
var CONNECTION_DESCRIPTOR = {
  lowVideoStream:{
    publish:true,
    receive:true,
    maxWidth:80,
    maxHeight:60,
    maxBitRate:30,
    maxFps:15
  },
  highVideoStream:{
    publish:true,
    receive:true,
    maxWidth:320,
    maxHeight:240,
    maxBitRate:400,
    maxFps:30
  },
  autopublishVideo:true,
  autopublishAudio:true,
  publishAudio:true,
  publishVideo:true,
  "token":"1"

};


/**
 * =============================================================================
 * Platform initialization
 * =============================================================================
 */

/**
 * Initializes the plugin by:
 * - setting up cloudeo logging
 * - checking whether it's installed, if so - create CloudeoService
 * - show the install plugin button otherwise
 */
function initPlugin() {
  initUI();

//  Setup logging using our handler
  CDO.initLogging(function (lev, msg) {
    switch (lev) {
      case "DEBUG":
        log_d("[CDO] " + msg);
        break;
      case "WARN":
        log_e("[CDO] " + msg);
        break;
      case "ERROR":
        log_e("[CDO] " + msg);
        break;
      default:
        log_e("Got unsupported log level: " + lev + ". Message: " + msg);
    }
  }, true);
  log_d("Initializing the plug-in");

//  Try to load the plugin
  plugin = new CDO.CloudeoPlugin(PLUGIN_CONTAINER_ID);
  var loadStatus = plugin.loadPlugin();
  if (loadStatus) {
//    Plugin is installed
    tryUpdatePlugin();
  } else {
//    Plugin requires installation
    showInstallFrame();
  }
}

/**
 * Initialize the UI components.
 */
function initUI() {
  $('select').append($('<option value="none">-- Select --</option> ')).val('none');
  $('#camSelect').change(changeCamera);
  $('#micSelect').change(changeMicrophone);
  $('#spkSelect').change(changeSpeakers);
  $('#publishAudioChckbx').change(getPublishChckboxChangedHandler(CDO.MEDIA_TYPE_AUDIO));
  $('#publishVideoChckbx').change(getPublishChckboxChangedHandler(CDO.MEDIA_TYPE_VIDEO));
  $('#connectBtn').click(connect);
  $('#disconnectBtn').click(disconnect);
}
/**
 * Further configures, the plugin - creates service and initializes devices.
 */
function startPlugin() {
  log_d("Starting the plug-in");
  $('#installBtn').hide();
//  Create and configure listener
  var listener = new CDO.CloudeoServiceListener();
  listener.onUserEvent = function (/**CDO.UserStateChangedEvent*/e) {
    if (e.isConnected) {
      newUser(e);
    } else {
      userGone(e);
    }
  };
  listener.onMediaStreamEvent = function (e) {
    log_d("Got new media stream event: " + JSON.stringify(e));
    if (e.mediaType !== CDO.MEDIA_TYPE_VIDEO) {
//      Ignore other event types.
      return;
    }
    if (e.videoPublished) {
//      User just published the video feed
      newUser(e);
    } else {
//      User just stoped publishing the video feed
      userGone(e);
    }
  };

//  Create the CloudeoService
  plugin.createService(CDO.createResponder(function (result) {
    service = /**CDO.CloudeoService*/ result;
    service.addServiceListener(CDO.createResponder(), listener);
    initDevices();
  }));
}

/**
 * =============================================================================
 * Devices handling
 * =============================================================================
 */

/**
 * Initializes audio subsystem:
 * - fetches microphones and speakers
 * - selects first mic and fisrt speaker to be used by the Cloudeo Service
 */
function initDevices() {
  log_d("Initializing the audio subsystem");

//  Initialize microphones
  log_d("Getting audio capture devices");
  service.getAudioCaptureDeviceNames(
      CDO.createResponder(onAudioCaptureDeviceNames));

//  Initialize speakers
  log_d("Getting audio output devices");
  service.getAudioOutputDeviceNames(
      CDO.createResponder(onAudioOutputDeviceNames));

//  Initialize cameras
  log_d("Getting video capture devices");
  service.getVideoCaptureDeviceNames(
      CDO.createResponder(onVideoCaptureDeviceNames));
}

function onAudioCaptureDeviceNames(devs) {
  log_d("Got audio capture devices: " + JSON.stringify(devs));
  log_d("Using audio capture device: " + devs[0]);
  window.configuredMic = fillDevicesSelect('#micSelect', devs);
  if (devs.length > 0) {
    service.setAudioCaptureDevice(CDO.createResponder(function () {
      log_d("Audio capture device configured");
      $('#micSelect').val(window.configuredMic);
    }), window.configuredMic);
  }
}

function onAudioOutputDeviceNames(devs) {
  log_d("Got audio output devices: " + JSON.stringify(devs));
  log_d("Using audio output device: " + devs[0]);
  window.configuredSpk = fillDevicesSelect('#spkSelect', devs);
  if (devs.length > 0) {
    service.setAudioOutputDevice(CDO.createResponder(
        function () {
          log_d("Audio output device configured");
          $('#spkSelect').val(window.configuredSpk);
        }
    ), window.configuredSpk);
  }
}


function onVideoCaptureDeviceNames(devs) {
  log_d("Got video capture devices: " + JSON.stringify(devs));
  var dev = fillDevicesSelect('#camSelect', devs);
  if (dev) {
    log_d("Using video capture device: " + JSON.stringify(devs[dev]));
    window.configuredCam = dev;
    service.setVideoCaptureDevice(CDO.createResponder(startLocalPreview), dev);
  } else {
    log_e("None video capture devices installed.");
  }
}

function fillDevicesSelect(selectSelector, devs) {
  var dev;
  var $select = $(selectSelector);
  $.each(devs, function (k, v) {
    dev = k;
    $select.append($('<option value="' + k + '">' + v + '</option> '));
  });
  return dev;
}


function changeCamera() {
  var selected = $(this).val();
  service.setVideoCaptureDevice(CDO.createResponder(function () {
    window.configuredCam = selected;
    startLocalPreview();
  }), selected);
}

function changeMicrophone() {
  var selected = $(this).val();
  service.setAudioCaptureDevice(CDO.createResponder(function () {
    window.configuredMic = selected;
  }), selected);
}

function changeSpeakers() {
  var selected = $(this).val();
  service.setAudioOutputDevice(CDO.createResponder(function () {
    window.configuredSpk = selected;
  }), selected);
}

/**
 * =============================================================================
 * Local preview management.
 * =============================================================================
 */

/**
 * Starts local preview of the user:
 * - requests the service to start capturing local user's video feed from
 * selected webcam
 * - upon successful result, initializes the renderer.
 */
function startLocalPreview() {
  log_d("Starting local video");
  $('#camSelect').val(window.configuredCam);
  var succHandler = function (sinkId) {
    window.localPreviewStarted = true;
    log_d("Local video started. Setting up renderer");
    var rendererContent = RENDER_LOCAL_TMPL.replace('#', '_local');
    $('.feeds-wrapper').append($(rendererContent));
    CDO.renderSink(sinkId, 'userFeed_local');
  };
  service.startLocalVideo(CDO.createResponder(succHandler));
}

/**
 * =============================================================================
 * Installation, updating
 * =============================================================================
 */

/**
 * Tries to perform plugin self-update.
 */
function tryUpdatePlugin() {
  var updateListener = {};
  updateListener.updateProgress = function (value) {
    log_d("Got update progress: " + value);
  };

  updateListener.updateStatus = function (eventType, errCode, errMessage) {
    log_d("Got update event type: " + eventType);
    switch (eventType) {
      case 'UPDATING':
//          Update process started
        break;
      case 'UPDATED':
//        Plugin updated
        startPlugin();
        break;
      //noinspection FallthroughInSwitchStatementJS
      case 'UP_TO_DATE':
//        Plugin up to date - nothing needs to be done
        startPlugin();
        break;
      case 'UPDATED_RESTART':
//        Plugin updated successfully but browser needs to be restarted
        break;
      case 'NEEDS_MANUAL_UPDATE':
//        Plugin needs reinstallation
        break;
      case 'ERROR':
//        Failed to update the plugin.
        break;
      default:
        break;
    }
  };
  plugin.update(updateListener)
}

/**
 * Shows install button in case the plugin isn't installed.
 */
function showInstallFrame() {
  log_d("Plugin not installed. Use install plugin button. Refresh the page when complete");
  CDO.getInstallerURL(CDO.createResponder(function (url) {
    $('#installBtn').
        attr('href', url).
        show().
        click(pollForPlugin);
  }));
}

function pollForPlugin() {
  plugin.startPolling(startPlugin);
}


/**
 * =============================================================================
 * Connection and streaming management.
 * =============================================================================
 */

function getConnectionUrl(scopeId) {
  return STREAMER_URL_BASE + scopeId;
}

/**
 * Connects to scope with given id
 *
 * @param scopeId
 */
function connect() {
  var scopeId = $('#roomId').val();
  log_d("Trying to connect to media scope with id: " + scopeId);
  var connDescr = $.extend({}, CONNECTION_DESCRIPTOR);
  connDescr.autopublishAudio = $('#publishAudioChckbx').is(':checked');
  connDescr.autopublishVideo = $('#publishVideoChckbx').is(':checked');
  connDescr.token = (Math.floor(Math.random() * 10000)) + '';
  connDescr.url = getConnectionUrl(scopeId);
  var succHandler = function () {
    log_d("Successfully connected");
    connectedScopeId = scopeId;
    $('#disconnectBtn').show();
    $('#connectBtn').hide();
  };
  var errHandler = function (code, msg) {
    log_e("Failed to connect due to: " + msg + " (" + code + ")");
    $('#connectBtn').click(connect).removeClass('disabled');
  };
  $('#connectBtn').unbind('click').addClass('disabled');
  service.connect(CDO.createResponder(succHandler, errHandler), connDescr);
}

/**
 * Terminates previously established connection.
 */
function disconnect() {
  var succHandler = function () {
    $('.remote-feed').remove();
    $('#disconnectBtn').hide();
    $('#connectBtn').show().click(connect).removeClass('disabled');

  };
  service.disconnect(CDO.createResponder(succHandler), connectedScopeId);
}

function getPublishChckboxChangedHandler(mediaType) {
  return function () {
    if ($(this).is(':checked')) {
      service.publish(CDO.createResponder(),
                      connectedScopeId,
                      mediaType, {})
    } else {
      service.unpublish(CDO.createResponder(),
                        connectedScopeId,
                        mediaType)
    }
  };
}


/**
 * =============================================================================
 * Platform notifications handling.
 * =============================================================================
 */

/**
 *
 * New user handler - renders remote user's video feed.
 * @param {CDO.UserStateChangedEvent} details
 */
function newUser(details) {
  log_d("Got new user with details: " + JSON.stringify(details));
  if (details.videoPublished) {
    var rendererContent = RENDER_TMPL.replace('#', details.userId);
    $('.feeds-wrapper').append($(rendererContent));
    CDO.renderSink(details.videoSinkId, 'userFeed' + details.userId);
  }
}

/**
 * User left handler - removes the remote user renderer.
 * @param details
 */
function userGone(details) {
  log_d("Got user left for user with details: " + JSON.stringify(details));
  $('#userFeed' + details.userId).html('').remove();
}


/**
 * =============================================================================
 * Logging.
 * =============================================================================
 */

/**
 * Logging
 * @param msg
 */
function log_d(msg) {
  //noinspection StringLiteralBreaksHTMLJS
  $('<li>' + msg + '</li>').appendTo($('#logContainer'))

}

function log_e(msg) {
  //noinspection StringLiteralBreaksHTMLJS
  $('<li class="error">' + msg + '</li>').appendTo($('#logContainer'))

}