/*jshint esversion: 6*/

export default class DWUtils {

	static getParamTypeJSON(value, type) {

		if (type === undefined) {
			type = 'string';

			if (typeof value === 'boolean') {
				type = 'bool';
			}
			else if (typeof value === 'number') {
				type = 'number';
			}
		}

		return { 'Type':  type, 'Value': value};
	}

	static convertProtocol(param, send = false) {

    	if (param !== undefined && param.length !== 0) {
    		var paramConverted = [];
	    	var x = 0;
	    	while (x < param.length) {

	    		if (send === true) {
					if (param[x].Type !== undefined && DWUtils.DWMServerVersion === 2) {
	    				if (param[x].Type === 'byte[]') {
	    					param[x].Value = DWUtils.convertBase64ToArray(param[x].Value);
	    				}
	    				paramConverted.push(param[x].Value);
	    			} else {
	    				paramConverted.push(param[x]);
	    			}
	    		} else {//reception We are protocol > 2 so convert all
	    			if (param[x] === null || (param[x] !== null && param[x].Type === undefined)) {
	    				paramConverted.push(DWUtils.getParamTypeJSON(param[x]));
	    			} else {
	    				paramConverted.push(param[x]);
	    			}	    			
	    		}

	    		++x;
	    	}
	    	param = paramConverted;
    	}
    	return param;
	}
    
    static addMessage(type, message) {
        var dwmessagesscroll = $('#dwmessagesscroll');
        var isScrolledToBottom = dwmessagesscroll.prop('scrollHeight') - dwmessagesscroll.prop('clientHeight') <= dwmessagesscroll.scrollTop() + 1;
        $('#dwmessages').append('<li class="list-group-item ' + type + '">' + message + '</li>');

        if (isScrolledToBottom) {
            dwmessagesscroll.scrollTop(dwmessagesscroll.prop('scrollHeight') - dwmessagesscroll.prop('clientHeight'));
		}
    }

    static sendJson(websocket, obj) {
    	obj.Parameters = DWUtils.convertProtocol(obj.Parameters, true);
        var str = JSON.stringify(obj);
        DWUtils.log('Send: ' + str);
        websocket.send(str);
    }
    
    static convertBase64ToArray(dataURI) {
		var BASE64_MARKER = ';base64,';
		var base64;
		if (dataURI.indexOf(BASE64_MARKER) !== -1) {
			var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
			base64 = dataURI.substring(base64Index);
		} else {
			base64 = dataURI;
		}
		var raw = window.atob(base64);
		var byteNumbers = new Array(raw.length);
		for (var i = 0; i < raw.length; i++) {
			byteNumbers[i] = raw.charCodeAt(i);
		}
		return byteNumbers;
	}

	static resizeImage(img, maxLength, callback) {
		var ratio = 1;

		var imgTmp = new Image();
		imgTmp.onload = function() {

			var array = DWUtils.convertBase64ToArray(imgTmp.src);
			DWUtils.log('array.length: ' + array.length + ' maxLength: ' + maxLength + ' ratio: ' + ratio);
			if (maxLength !== 0 && array.length > maxLength) {
				ratio *= 0.9;

				var canvas = document.createElement('canvas');
				var ctx = canvas.getContext('2d');
				canvas.width = img.width * ratio;
				canvas.height = img.height * ratio;
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				imgTmp.src = canvas.toDataURL('image/jpeg', 0.3);
			} else {
				callback(imgTmp.src);
			}
		};

		imgTmp.src = img.src;
	}
	
	static log(msg) {
		if (console && DWUtils.enableLog) {
			console.log(msg);
		}
	}


	static Uint8ToString(u8a) {
		var CHUNK_SZ = 0x8000;
		var c = [];
		for (var i = 0; i < u8a.length; i += CHUNK_SZ) {
			c.push(String.fromCharCode.apply(null, u8a.subarray(i, i + CHUNK_SZ)));
		}
		return c.join('');
	}

	static getImageFromInputFile(self, imgId) {
		if (self.files && self.files[0]) {
			var FR = new FileReader();
			FR.onload = function(e) {
				var img = document.getElementById(imgId);
				var maxLength = img.getAttribute('max');
				img.onload = function() {
					img.onload = null;
					DWUtils.resizeImage(img, maxLength, function(data) {
						img.src = data;
					});
				};
				img.src = e.target.result;
			};
			FR.readAsDataURL(self.files[0]);
		}
	}
}

DWUtils.enableLog = false;

DWUtils.DWMServerVersion = 2;

DWUtils.DWTypeMsg = {
    NORMAL: '',
    SUCCESS: 'list-group-item-success',
    INFO: 'list-group-item-info',
    WARNING: 'list-group-item-warning',
    ERROR: 'list-group-item-danger'
};