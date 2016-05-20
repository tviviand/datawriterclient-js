/*jshint esversion: 6*/

import DWUtils from './DWUtils';

export default class DWSessionsProtocol {

	constructor(options) {
		this.options = options;
		this.DWSessionsProtocolOperations = Object.getOwnPropertyNames(DWSessionsProtocol.prototype);
	}

	CreateSessionCompleted(obj) {
		obj.Method = 'AttachToSessionAsync';
		DWUtils.sendJson(this.mWSSessions, obj);
		DWUtils.sendJson(this.mWSTasks, obj);
		DWUtils.sendJson(this.mWSReaders, obj);
	}

	AttachToSessionCompleted(obj) {
		DWUtils.sendJson(this.mWSSessions, {
			Method: 'AuthenticateAsync',
			Parameters: [this.options.login, this.options.password]
		});
	}

	AuthenticateCompleted(obj) {
		if (obj.Parameters[0] === true) {
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