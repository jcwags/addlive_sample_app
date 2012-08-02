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


var CLIENT_ID = 1;

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

//noinspection StringLiteralBreaksHTMLJS
/**
 * Template for rendering local user video feed.
 * @type {String}
 */
var RENDER_LOCAL_TMPL = '<li id="userFeed#"></li>';

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
  initLogging();
  initCloudeoPlatform();
}

function initCloudeoPlatform() {
  log_d("Initializing the Cloudeo platform");

  var initListener = new CDO.PlatformInitListener();
  initListener.onInitProgressChanged = function (e) {
    log_d("Platform init progress: " + e.progress);
  };

  initListener.onInitStateChanged = function (e) {
    switch (e.state) {
      case CDO.InitState.ERROR:
        log_e("Failed to initialize the Cloudeo SDK");
        log_e("Reason: " + e.errMessage + ' (' + e.errCode + ')');
        break;
      case CDO.InitState.INITIALIZED:
        startPlugin();
        break;
      case CDO.InitState.INSTALLATION_REQUIRED:
        showInstallButton(e.installerURL);
        break;
      case CDO.InitState.INSTALLATION_COMPLETE:
        hideInstallButton();
        break;
      case CDO.InitState.BROWSER_RESTART_REQUIRED:
        log_d("Please restart your browser in order to complete platform auto-update");
        break;
      default:
        log_e("Got unsupported init state: " + e.state);
    }
  };

  CDO.initPlatform(initListener,
                   {
                     clientId:CLIENT_ID,
                     pluginPollFrequency:1000
                   }
  );

//  or just
//  CDO.initPlatform(initListener, CLIENT_ID);
}

function initLogging() {
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

}

/**
 * Initialize the UI components.
 */
function initUI() {
  //noinspection StringLiteralBreaksHTMLJS
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
  CDO.getService().addServiceListener(CDO.createResponder(), listener);
  initDevices();
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
  CDO.getService().getAudioCaptureDeviceNames(
      CDO.createResponder(onAudioCaptureDeviceNames));

//  Initialize speakers
  log_d("Getting audio output devices");
  CDO.getService().getAudioOutputDeviceNames(
      CDO.createResponder(onAudioOutputDeviceNames));

//  Initialize cameras
  log_d("Getting video capture devices");
  CDO.getService().getVideoCaptureDeviceNames(
      CDO.createResponder(onVideoCaptureDeviceNames));
}

function onAudioCaptureDeviceNames(devs) {
  log_d("Got Audio capture devices list (" + devs.length + ')');
  CDO.getService().getAudioCaptureDevice(CDO.createResponder(function (dev) {
    log_d("Using audio capture device :" + devs[dev]);
    fillDevicesSelect('#micSelect', devs, dev);
  }));

}

function onAudioOutputDeviceNames(devs) {
  log_d("Got Audio output devices list (" + devs.length + ')');
  CDO.getService().getAudioOutputDevice(CDO.createResponder(function (dev) {
    log_d("Using audio output device :" + devs[dev]);
    fillDevicesSelect('#spkSelect', devs, dev);
  }));
}

function onVideoCaptureDeviceNames(devs) {
  log_d("Got video capture devices.");
  CDO.getService().getVideoCaptureDevice(CDO.createResponder(function (dev) {
    log_d("Using video capture device: " + devs[dev]);
    fillDevicesSelect('#camSelect', devs, dev);
    if (dev) {
      startLocalPreview();
    }
  }));
}

function fillDevicesSelect(selectSelector, devs, selectedDevice) {
  var dev;
  var $select = $(selectSelector);
  $.each(devs, function (k, v) {
    dev = k;
    //noinspection StringLiteralBreaksHTMLJS
    $select.append($('<option value="' + k + '">' + v + '</option> '));
  });
  $select.val(selectedDevice);
}


function changeCamera() {
  var selected = $(this).val();
  CDO.getService().setVideoCaptureDevice(CDO.createResponder(function () {
    $('#camSelect').val(selected);
    startLocalPreview();
  }), selected);
}

function changeMicrophone() {
  var selected = $(this).val();
  CDO.getService().setAudioCaptureDevice(CDO.createResponder(function () {
    $('#micSelect').val(selected);
  }), selected);
}

function changeSpeakers() {
  var selected = $(this).val();
  CDO.getService().setAudioOutputDevice(CDO.createResponder(function () {
    $('#micSelect').val(selected);
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
  var succHandler = function (sinkId) {
    log_d("Local video started. Setting up renderer");
    var rendererContent = RENDER_LOCAL_TMPL.replace('#', '_local');
    $('.feeds-wrapper').append($(rendererContent));
    CDO.renderSink({
                     sinkId:sinkId,
                     containerId:'userFeed_local',
                     mirror:true,
                     windowless:true
                   });
  };
  CDO.getService().startLocalVideo(CDO.createResponder(succHandler));
}

/**
 * =============================================================================
 * Installation, updating
 * =============================================================================
 */

/**
 * Shows install button in case the plugin isn't installed.
 */
function showInstallButton(url) {
  log_d("Plugin not installed.");
  $('#installBtn').attr('href', url).show();
}

function hideInstallButton() {
  log_d("Plugin not installed.");
  $('#installBtn').hide();
}

/**
 * =============================================================================
 * Connection and streaming management.
 * =============================================================================
 */


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
  connDescr.scopeId = scopeId;
  var succHandler = function (mediaConnection) {
    window.mediaConnection = mediaConnection;
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
  CDO.getService().connect(CDO.createResponder(succHandler, errHandler), connDescr);
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
  mediaConnection.disconnect(CDO.createResponder(succHandler));
}

function getPublishChckboxChangedHandler(mediaType) {
  return function () {
    if ($(this).is(':checked')) {
      mediaConnection.publish(CDO.createResponder(),
                              mediaType, {})
    } else {
      mediaConnection.unpublish(CDO.createResponder(),
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
    CDO.renderSink({
                     sinkId:details.videoSinkId,
                     containerId:'userFeed' + details.userId,
                     mirror:false,
                     windowless:true
                   });
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

$(initPlugin);