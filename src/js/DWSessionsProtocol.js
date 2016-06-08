/*jshint esversion: 6*/

import DWUtils from './DWUtils';

export default class DWSessionsProtocol {

	constructor(options) {
		this.options = options;
		this.DWSessionsProtocolOperations = Object.getOwnPropertyNames(DWSessionsProtocol.prototype);
	}

	CreateSessionCompleted(obj) {
		obj.Method = 'AttachToSessionAsync';

		var msg = {
			Method: 'AttachToSessionAsync',
			Parameters: [obj.Parameters[0].Value]
		};

		DWUtils.sendJson(this.mWSSessions, msg);
		DWUtils.sendJson(this.mWSTasks, msg);
		DWUtils.sendJson(this.mWSReaders, msg);
	}

	AttachToSessionCompleted(obj) {
		if (obj.Parameters[0].Value === true) {
			if (this.options.useApiKey)
			{
				if (!this.options.apiKey)
					DWUtils.log('No API key available. Protocol will likely bug.');

				DWUtils.sendJson(this.mWSSessions, {
					Method: 'AuthenticateByAPIKeyAsync',
					Parameters: [this.options.apiKey]
				});
			}
			else
			{
				DWUtils.sendJson(this.mWSSessions, {
					Method: 'AuthenticateAsync',
					Parameters: [this.options.login, this.options.password]
				});
			}
		} else {
			DWUtils.addMessage(DWUtils.DWTypeMsg.ERROR, 'Authentication failed !');
		}
	}

	AuthenticateCompleted(obj) {
		if (obj.Parameters[0].Value === true) {
			if (this.options.taskId !== undefined && this.options.taskId.length !== 0) {
				this.mDWTasksProtocol.startTask(this.options.taskId);
			} else {
				this.mDWTasksProtocol.getTaskList();
			}

			$('#showTasksButton').show();
		} else {
			DWUtils.addMessage(DWUtils.DWTypeMsg.ERROR, 'Authentication failed !');
		}
	}

	CreateSessionAsync() {
		DWUtils.sendJson(this.mWSSessions, {
			Method: 'CreateSessionAsync'
		});
	}

	GetAPIVersionCompleted(obj) {
		//force api version 3
		if (obj.Parameters !== undefined) {
			obj.Parameters = DWUtils.convertProtocol(obj.Parameters);
		}
		DWUtils.DWMServerVersion  = Number(obj.Parameters[0].Value.split('.', 1)[0]);
		this.CreateSessionAsync();
	}

	GetAPIVersionAsync() {
		DWUtils.sendJson(this.mWSSessions, {
			Method: 'GetAPIVersionAsync'
		});
	}
	
	set TaskProtocol(eDWTasksProtocol) {
		this.mDWTasksProtocol = eDWTasksProtocol;
	}
	
	get TaskProtocol() {
		return this.mDWTasksProtocol;
	}

	set WebSocketSessions(eWSSocketSession) {
		this.mWSSessions = eWSSocketSession;
	}

	get WebSocketSessions() {
		return this.mWSSessions;
	}

	set WebSocketTasks(eWebSocketTask) {
		this.mWSTasks = eWebSocketTask;
	}

	get WebSocketTasks() {
		return this.mWSTasks;
	}

	set WebSocketReaders(eWebSocketReaders) {
		this.mWSReaders = eWebSocketReaders;
	}

	get WebSocketReaders() {
		return this.mWSReaders;
	}

	DoIt(obj) {
		if ($.inArray(obj.Method, this.DWSessionsProtocolOperations) !== -1) {
			this[obj.Method](obj);
		} else {
			DWUtils.log('Sessions: Undefined method - ' + obj.Method);
		}
	}
}