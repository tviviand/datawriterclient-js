/*jshint esversion: 6*/
/*jshint scripturl:true*/
/*jshint multistr:true*/

import DWUtils from './DWUtils';

export default class DataWriterBridge {

    constructor(bridgeOpt)
    {
        this.reconnectBridge = false;

        this.bridgeOpt = bridgeOpt;
        this.bridgeSSLPort = bridgeOpt.SSLPort;
        this.bridgePort = bridgeOpt.port;
        // This is used to general to "protocol-url datawriter://"
        this.baseBridgeURL = bridgeOpt.baseURL;

        // Should the encoding client use SSL websocket to connect to the bridge.
        this.encodingClientToBridgeSSL = bridgeOpt.EncodingClientSSL;

        // Should the connection from browser to bridge be SSL.
        this.bridgeWSS = bridgeOpt.SSLEnabled;

        this.dataWriterBridgeWS = null; // WebSocket to the DataWriter Bridge.
        this.dwbContextId = ''; // Context Id on the bridge.
        this.mWSReaders = null;
        this.mCallback = null;
        this.binPath = '';

        // A message is sent by DW Bridge when the encoding
        // client join the context.
        this.encodingClientJoinedContext = false;
    }

    get DataWriterBridgeWebSocket()
    {
        return this.dataWriterBridgeWS;
    }

    waitForSocketConnection()
    {
        setTimeout(() =>
        {
            if (!this.dataWriterBridgeWS)
            {
                return;
            }
            if (this.dataWriterBridgeWS.readyState === 1 && this.encodingClientJoinedContext)
            {
                DWUtils.log('Successfully connected to the bridge.');
                this.mCallback();
            }
            else if (this.dataWriterBridgeWS.readyState === 1)
            {
                // Connected but encoding client didnt join yet.
                this.waitForSocketConnection();
            }
            else
            {
                if (this.dataWriterBridgeWS.readyState === 0)
                {
                    DWUtils.log('wait for connection...');
                    this.waitForSocketConnection();
                }
            }
        }, 1000); // wait 1000 milisecond for the connection...
    }

    /**
     * Generate a link (datawriter://) or link to a JNLP file
     * that will properly start the encoding wrt the current encoding
     * context.
     */
    generateEncodingLink()
    {
        let dlUrl = '';

        // If using protocol mode.
        let protocolUrl = '';

        console.log('WSTYPE: ' + this.wsType);

        if (this.wsType === 'java')
        {
            // Full bridge url for encoding Java Client.
            let bridge_full_url = '';
            bridge_full_url += (this.encodingClientToBridgeSSL ? 'wss://' : 'ws://');
            bridge_full_url += this.baseBridgeURL + ':';
            bridge_full_url += (this.encodingClientToBridgeSSL ? this.bridgeSSLPort : this.bridgePort);
            bridge_full_url += '/encoder';

            // Url to a JS function that will generate and trigger the download of a
            // customized JNLP file.
            const jnlpCodeBase = this.binPath + '/jnlp';
            dlUrl = 'javascript:rfidonl.downloadCustomizedJNLP(\'' + bridge_full_url + '\', \'' + this.dwbContextId + '\', \'' + jnlpCodeBase + '\')';
        }
        else if (this.wsType === 'protocol')
        {
            // Protocol style require the download of the python encoder program.
            protocolUrl = 'datawriter://' + this.baseBridgeURL + ':' +
                (this.encodingClientToBridgeSSL ? this.bridgeSSLPort : this.bridgePort) +
                '/encoder/?contextId=' + this.dwbContextId;
            if (this.encodingClientToBridgeSSL)
            {
                protocolUrl += '&wss=True';
            }

            launchInIFrame(protocolUrl);
            if (navigator.appVersion.indexOf('Win') !== -1 || true)
            {
                dlUrl = this.binPath + '/DataWriterWebClient.exe';
            }
            protocolUrl = 'javascript:rfidonl.downloadProtocolUrl(\'' + protocolUrl + '\')';
        }

        if (dlUrl.length === 0)
        {
            DWUtils.addMessage(DWUtils.DWTypeMsg.ERROR, 'Sorry, your OS is currently not supported.');
        } else
        {
            let msg = 'Please download and run the <a href="' + dlUrl + '">DataWriterWebClient</a> to enabled Web Encoding.';
            if (this.wsType === 'protocol')
            {
                msg += ' Then click <a href="' + protocolUrl + '">here</a> to start the encoding client.';
            }
            DWUtils.addMessage(DWUtils.DWTypeMsg.WARNING, msg);
        }
    }

    reset()
    {
        if (this.dataWriterBridgeWS !== null)
        {
            this.dataWriterBridgeWS.onclose = null;
            this.dataWriterBridgeWS.close();
        }

        this.encodingClientJoinedContext = false;
        this.dataWriterBridgeWS = null;
    }

    get WebSocketReaders()
    {
        return this.mWSReaders;
    }

    set WebSocketReaders(eWebSocketReaders)
    {
        this.mWSReaders = eWebSocketReaders;
    }

    initSocket()
    {
        DWUtils.log('Connecting to DataWriter Bridge...');
        if (!this.reconnectBridge)
        {
            DWUtils.addMessage(DWUtils.DWTypeMsg.INFO, 'Connecting to DataWriter Bridge...');
        }

        //this.dataWriterBridgeWS = new WebSocket('ws://127.0.0.1:27354/Reader');

        // NGINX reverse proxy for DWB
        this.dataWriterBridgeWS = new WebSocket((this.bridgeWSS ? 'wss://' : 'ws://') + this.baseBridgeURL + ':' +
           (this.bridgeWSS ? this.bridgeSSLPort : this.bridgePort) + '/browser');

        this.dataWriterBridgeWS.onopen = () =>
        {
            this.reconnectBridge = false;

            DWUtils.addMessage(DWUtils.DWTypeMsg.SUCCESS, 'Connected to DataWriter Bridge.');

            // Parameterless command to create+attach a context.
            this.dataWriterBridgeWS.send(JSON.stringify({
                type: 'CMSGCreateContext'
            }));
        };
        this.dataWriterBridgeWS.onmessage = (event) =>
        {
            //For now directly forward to reader server
            var obj = JSON.parse(event.data);

            if (obj.type && obj.type === 'SMSGCreateContext')
            {
                console.log('DataWriter Bridge ContextId = ' + obj.content.context_id);
                this.dwbContextId = obj.content.context_id;
                this.generateEncodingLink();
            }
            else if (obj.type && obj.type === 'SMSGEncodingClientJoined')
            {
                DWUtils.addMessage(DWUtils.DWTypeMsg.SUCCESS, 'Encoding client joined context.');
                this.encodingClientJoinedContext = true;
            }
            else if (obj.type && obj.type === 'SMSGEncodingClientLeft')
            {
                DWUtils.addMessage(DWUtils.DWTypeMsg.ERROR,
                    'Encoding client left. Please refresh the page.');
            }
            else
            {
                DWUtils.log('Received from bridge: ' + event.data);
                DWUtils.sendJson(this.mWSReaders, obj);
            }
        };
        this.dataWriterBridgeWS.onclose = (event) =>
        {
            DWUtils.log('Disconnected from bridge. Reconnecting...');
            if (!this.reconnectBridge)
            {
                DWUtils.addMessage(DWUtils.DWTypeMsg.WARNING, 'Disconnected from bridge. Reconnecting...');
            }
            this.reconnectBridge = true;
            setTimeout(() =>
            {
                this.initSocket();
            }, 1000);
        };

        this.waitForSocketConnection();
    }

    start(wsType, binPath, callback)
    {
        this.wsType = wsType;
        this.binPath = binPath;
        this.mCallback = callback;
        this.encodingClientJoinedContext = false;

        this.initSocket();
    }

    static isSupported(wsType)
    {
        return true;
        // Java works everywhere, python binary (with protocol support) only work for windows for now.
        //return (wsType === 'java' || (wsType === 'protocol' && navigator.appVersion.indexOf('Win') !== -1));
    }
}


/**
 * Generate and start the download of a custom JNLP file
 * that is tailored to the current context.
 *
 *
 * IT WILL BE ANNOYING TO MAINTAINING THE BASE_JNLP BECAUSE IT
 * IS THE OUTPUT OF mvn COMMAND.
 *
 * This is the only way to pass custom parameter to the JNLP
 * backed program.
 */
function downloadCustomizedJNLP(bridgeUrl, contextId, jnlpCodaBase)
{
    const base_jnlp = '<?xml version="1.0" encoding="utf-8"?>\
<jnlp\
    spec="1.0+"\
    codebase="' + jnlpCodaBase + '" \
    >\
  <information>\
    <title>DataWriter Client Java</title>\
    <vendor>ISLOG</vendor>\
    <homepage href="http://www.islog.com/"/>\
    <description>$project.Description</description>\
  </information>\
  <security>\
     <all-permissions/>\
  </security>\
  <resources>\
    <j2se version="1.5+"/>\
\
    <jar href="lib/datawriterclient-java-1.1.jar" main="true"/>\
    <jar href="lib/tyrus-container-grizzly-server-1.12.jar"/>\
    <jar href="lib/grizzly-framework-2.3.22.jar"/>\
    <jar href="lib/grizzly-http-server-2.3.22.jar"/>\
    <jar href="lib/grizzly-http-2.3.22.jar"/>\
    <jar href="lib/tyrus-server-1.12.jar"/>\
    <jar href="lib/javax.websocket-api-1.1.jar"/>\
    <jar href="lib/tyrus-client-1.12.jar"/>\
    <jar href="lib/tyrus-core-1.12.jar"/>\
    <jar href="lib/tyrus-spi-1.12.jar"/>\
    <jar href="lib/tyrus-container-grizzly-client-1.12.jar"/>\
    <jar href="lib/gson-2.6.2.jar"/>\
\
  </resources>\
\
<application-desc main-class="com.islog.datawriter.client.DataWriterClient">\
    <argument>BRIDGE_URL_REPLACE_ME</argument>\
    <argument>CONTEXT_ID_REPLACE_ME</argument>\
</application-desc>\
</jnlp>';

    let jnlp_content = base_jnlp.replace('BRIDGE_URL_REPLACE_ME', bridgeUrl);
    jnlp_content = jnlp_content.replace('CONTEXT_ID_REPLACE_ME', contextId);

    const element = document.createElement('a');
    const blob = new Blob([jnlp_content], {
        type: 'text/jnlp'
    });
    const url = URL.createObjectURL(blob);
    element.href = url;
    element.setAttribute('download', 'encodingclient.jnlp');
    document.body.appendChild(element);
    element.click();
}

/**
 * Spawn the URL link into an iframe.
 * @param url
 */
function downloadProtocolUrl(url)
{
    launchInIFrame(url);
}

function launchInIFrame(url)
{
    const iFrame = $('<iframe/>').attr('class', 'launchFrame').attr('src', 'about:blank');
    iFrame.appendTo($('body'));
    iFrame.hide();
    try
    {
        iFrame[0].contentWindow.location.href = url;
    } catch (e)
    {
    }
}

// Great hack so we can reference the function easily from a
// <a href="javascript:..."> link.
window.rfidonl = window.rfidonl || {};
window.rfidonl.downloadCustomizedJNLP = downloadCustomizedJNLP;
window.rfidonl.downloadProtocolUrl = downloadProtocolUrl;
