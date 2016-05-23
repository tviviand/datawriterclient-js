/*jshint esversion: 6*/

import DWUtils from './DWUtils';
import DWReadersProtocol from './DWReadersProtocol';
import DWSessionsProtocol from './DWSessionsProtocol';
import DWTasksProtocol from './DWTasksProtocol';
import LocalReader from './LocalReader';

// For IE
Number.isInteger = Number.isInteger || function(value) {
    return typeof value === 'number' && 
           isFinite(value) && 
           Math.floor(value) === value;
};

/**
 * DataWriter Web Client to encode & print RFID / NFC cards.
 */
class DataWriterClient {

	/**
	 * Create a new DataWriter client instance.
	 */
    constructor() {
		// Make a copy of prototype.options to protect against overriding defaults
        this.options = $.extend({}, DataWriterClient.prototype.options);
		
        if (!window.WebSocket) {
            throw new Error('WebSocket is not supported.');
        }
		
        this.wsSessions = null;
        this.wsTasks = null;
        this.wsReaders = null;

        this.dwTaskProtocol = null;
        this.dwSessionsProtocol = null;
        this.dwReadersProtocol = null;
		
		this.localReader = null;
    }
	
    get TaskProtocol() {
        return this.dwTaskProtocol;
    }

    waitDWSockets() {
        if ((this.wsSessions.readyState !== 1 || this.wsTasks.readyState !== 1 || this.wsReaders.readyState !== 1) || (this.dwSessionsProtocol.WebSocketTasks === null && this.dwSessionsProtocol.WebSocketSessions === null && this.dwSessionsProtocol.WebSocketReaders === null)) {
            if (this.wsSessions.readyState === 3 || this.wsTasks.readyState === 3 || this.wsReaders.readyState === 3) {
                DWUtils.addMessage(DWUtils.DWTypeMsg.ERROR, 'Error while connecting to the server.');
                this.reset();
                return;
            }
            setTimeout(() => {
                this.waitDWSockets();
            }, 1000);
        } else {
            DWUtils.addMessage(DWUtils.DWTypeMsg.SUCCESS, 'Connection to server succeeded !');

            this.dwSessionsProtocol.CreateSessionAsync();
        }
    }

    resetDWSockets() {
        if (this.wsSessions !== null) {
            this.wsSessions.onclose = null;
            this.wsSessions.close();
        }
        if (this.wsTasks !== null) {
            this.wsTasks.onclose = null;
            this.wsTasks.close();
        }
        if (this.wsReaders !== null) {
            this.wsReaders.onclose = null;
            this.wsReaders.close();
        }

        this.wsTasks = this.wsReaders = this.wsSessions = null;
    }

    initDWSockets() {
        this.resetDWSockets();
        DWUtils.addMessage(DWUtils.DWTypeMsg.INFO, 'Connection to server...');

        //Connect Sessions
        this.dwSessionsProtocol = new DWSessionsProtocol(this.options);
        DWUtils.log(this.options.uri + '/Sessions connecting...');
        this.wsSessions = new WebSocket(this.options.uri + '/Sessions');

        this.wsSessions.onopen = () => {
            DWUtils.log(this.options.uri + '/Sessions connected');
            this.dwSessionsProtocol.WebSocketSessions = this.wsSessions;
        };
        this.wsSessions.onmessage = event => {
            var obj = JSON.parse(event.data);
            DWUtils.log('Sessions: ' + event.data);

            this.dwSessionsProtocol.DoIt(obj);
        };
        this.wsSessions.onclose = event => {
            DWUtils.log(this.options.uri + '/Sessions disconnected');
        };

        //Connect Tasks
        DWUtils.log(this.options.uri + '/Tasks connecting...');
        this.wsTasks = new WebSocket(this.options.uri + '/Tasks');

        this.wsTasks.onopen = () => {
            DWUtils.log(this.options.uri + '/Tasks connected');
            this.dwTaskProtocol = new DWTasksProtocol(this);

            this.dwTaskProtocol.WebSocketTasks = this.wsTasks;
            this.dwSessionsProtocol.TaskProtocol = this.dwTaskProtocol;
            this.dwSessionsProtocol.WebSocketTasks = this.wsTasks;
        };
        this.wsTasks.onmessage = event => {
            var obj = JSON.parse(event.data);
            DWUtils.log('Tasks: ' + event.data);

            this.dwTaskProtocol.DoIt(obj);
        };
        this.wsTasks.onclose = event => {
            DWUtils.log(this.options.uri + '/Tasks disconnected');
        };

        //Connect Readers
        DWUtils.log(this.options.uri + '/Readers connecting...');
        this.wsReaders = new WebSocket(this.options.uri + '/Readers');

        this.wsReaders.onopen = () => {
            DWUtils.log(this.options.uri + '/Readers connected');
            this.dwReadersProtocol = new DWReadersProtocol();
            this.dwReadersProtocol.WebSocketReaders = this.wsReaders;
			if (this.localReader !== null) {
				this.localReader.WebSocketReaders = this.wsReaders;
				this.dwReadersProtocol.ProxyReader = this.localReader.LocalReaderWSSocket;
			}
            this.dwSessionsProtocol.WebSocketReaders = this.wsReaders;
        };
        this.wsReaders.onmessage = event => {
            var obj = JSON.parse(event.data);
            DWUtils.log('Readers: ' + event.data);

            this.dwReadersProtocol.DoIt(obj);
        };
        this.wsReaders.onclose = event => {
            DWUtils.log(this.options.uri + '/Readers disconnected');
        };

        this.waitDWSockets();
    }

    reset() {
        $('#cardPreviewId').hide();
        $('#showTasksButton').hide();
        $('#dwRecordFields').empty();
        $('#userValideButton').hide();

        this.resetDWSockets();

		if (this.localReader !== null) {
			this.localReader.reset();
			this.localReader = null;
		}
    }

	/**
	 * Initialize the DataWriter client according to provided options.
	 * @param {string[]} options - Client options.
	 * @param {string[]} options[].deviceTech - Default order of rfid reader technology.
	 * @param {string} options[].binPath - Binaries (exe file, ...) root path.
	 * @param {string} options[].uri - DataWriter server address.
	 * @param {string} options[].username - DataWriter username.
	 * @param {string} options[].password - DataWriter password.
	 * @param {string} options[].taskId - Default task identifier. If defined, the task will be started after successful authentication.
	 */
    init(options) {
        // Updated options with supplied options
        this.options = $.extend(this.options, options);
        
        // if the global option object was accidentally blown away by
        // someone, bail early with an informative error
        if (!this.options || !this.options.deviceTech || !this.options.deviceTech.length) {
            throw new Error('No deviceTech specified.');
        }
		
        $('#collapseOne').collapse('show');
        $('#dwmessages').empty();

        this.reset();
		var wsType = '';
		if ($.inArray('bin', this.options.deviceTech) !== -1) {
			wsType = 'bin';
		} else if ($.inArray('java', this.options.deviceTech) !== -1) {
			wsType = 'java';
		}

		if (wsType !== '' && LocalReader.isSupported(wsType)) {
			this.localReader = new LocalReader();
			this.localReader.start(wsType, this.options.binPath, () => {
				this.initDWSockets();
			});
		} else {
			this.initDWSockets();
		}
    }
}

/**
 * DataWriter Client options.
 */
DataWriterClient.prototype.options = {
  /**
   * Default order of rfid reader technology (java, bin, protocol).
   */
  'deviceTech': ['bin', 'protocol'],
  
  /**
   * Binaries (exe file, ...) root path.
   */
  'binPath': 'http://download.islog.com/datawriter/client/web/',
  
  /**
   * DataWriter server address.
   */
  'uri': 'ws://demo.islog.com',
  
  /**
   * DataWriter username.
   */
  'username': 'demo',
  
  /**
   * DataWriter password.
   */
  'password': 'demo',
  
  /**
   * Default task identifier. If defined, the task will be started after successful authentication.
   */
  'taskId': undefined,
};

export default DataWriterClient;