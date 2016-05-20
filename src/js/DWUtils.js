/*jshint esversion: 6*/

export default class DWUtils {
    
    static addMessage(type, message) {
        var dwmessagesscroll = $('#dwmessagesscroll');
        var isScrolledToBottom = dwmessagesscroll.prop('scrollHeight') - dwmessagesscroll.prop('clientHeight') <= dwmessagesscroll.scrollTop() + 1;
        $('#dwmessages').append('<li class="list-group-item ' + type + '">' + message + '</li>');

        if (isScrolledToBottom) {
            dwmessagesscroll.scrollTop(dwmessagesscroll.prop('scrollHeight') - dwmessagesscroll.prop('clientHeight'));
		}
    }

    static sendJson(websocket, obj) {
        var str = JSON.stringify(obj);
        DWUtils.log('Send: ' + str);
        websocket.send(str);
    }
    
    static convertBase64ToArray(dataURI) {
		var BASE64_MARKER = ';base64,';
		var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
		var base64 = dataURI.substring(base64Index);
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
}

DWUtils.enableLog = false;

DWUtils.DWTypeMsg = {
    NORMAL: '',
    SUCCESS: 'list-group-item-success',
    INFO: 'list-group-item-info',
    WARNING: 'list-group-item-warning',
    ERROR: 'list-group-item-danger'
};