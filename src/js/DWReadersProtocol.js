/*jshint esversion: 6*/

import DWUtils from './DWUtils';

export default class DWReadersProtocol {
	constructor() {
        this.DWReadersProtocolOperations = Object.getOwnPropertyNames(DWReadersProtocol.prototype);
	}

	set WebSocketReaders(eWebSocketReaders) {
		this.mWSReaders = eWebSocketReaders;
	}

	get ProxyReader() {
		return this.mProxyReader;
	}

	set ProxyReader(eProxyReader) {
		this.mProxyReader = eProxyReader;
	}

	get WebSocketReaders() {
		return this.mWSReaders;
	}

	SendRawCmdAsync(obj) {
		if (DWUtils.DWMServerVersion === 2) {
			obj.Parameters[1].Value = btoa(DWUtils.Uint8ToString(new Uint8Array(obj.Parameters[1].Value)));
		}
		this.SendToLocalReader(obj);
	}

	SendToLocalReader(obj) {
		var str = JSON.stringify(obj);
        DWUtils.log('Send to reader: ' + str);
        this.mProxyReader.send(str); //foward to reader directly
	}

	DoIt(obj) {
		if ($.inArray(obj.Method, this.DWReadersProtocolOperations) !== -1) {
			this[obj.Method](obj);
		} else {
			this.SendToLocalReader(obj); //foward to reader directly
		}
	}
}