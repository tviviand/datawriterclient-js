/*jshint esversion: 6*/

import DWUtils from './DWUtils';

export default class DWReadersProtocol {
	constructor() {
        
	}

	set WebSocketReaders(eWebSocketReaders) {
		this.mWSReaders = eWebSocketReaders;
		this.DWReadersProtocolOperations = {};
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

	DoIt(obj) {
		if ($.inArray(obj.Method, this.DWReadersProtocolOperations) !== -1) {
			this[obj.Method](obj);
		} else {
			DWUtils.sendJson(this.mProxyReader, obj); //foward to reader directly
		}
	}
}