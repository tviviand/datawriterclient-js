/*jshint esversion: 6 */

import DWUtils from './DWUtils';
import DWWebcam from './DWWebcam';

export default class DWTasksProtocol {

	constructor(dwClient) {

		this.dwClient = dwClient;
		this.currentProcess = {};
		this.currentTaskId = undefined;
		this.DW_RECORD_FIELD_NAME = 'DwField';

		this.DWTasksProtocolOperations = Object.getOwnPropertyNames(DWTasksProtocol.prototype);
	}

	addMessageNotified(obj) {
		var param = obj.Parameters;

		var type = DWUtils.DWTypeMsg.INFO;
		switch (param[2]) {
			case 0:
				type = DWUtils.DWTypeMsg.ERROR;
				break;
			case 1:
				type = DWUtils.DWTypeMsg.WARNING;
				break;
			case 2:
				type = DWUtils.DWTypeMsg.INFO;
				break;
		}

		DWUtils.addMessage(type, param[3]);
	}

	AttachToSessionCompleted(obj) {}

	NotifyEncodingRecordMessageNotified(obj) {
		this.addMessageNotified(obj);
	}

	CurrentRecordChanged(obj) {
		$('#cardPreviewId').hide();
		$('#dwRecordFields').empty();
		$('#userValideButton').hide();

		var param = obj.Parameters;
		DWUtils.addMessage(DWUtils.DWTypeMsg.INFO, 'Current record changed: ' + param[1]);
	}

	GetTaskListCompleted(obj) {
		var param = obj.Parameters;

		$('#dwTaskSelectorList').empty();
		param[0].forEach(function(element) {
			var state = '';
			if (element.State === 1) { // Running
				state = ' list-group-item-success';
			}

			$('#dwTaskSelectorList').append('<button type="button" class="list-group-item' + state + '" onclick="dwWebClient.TaskProtocol.startTask(' + element.Identifier + ')">' + element.Identifier + ' - ' + element.Name + '</button>');
		});

		$('#dwTaskSelectorModal').modal('show');
	}

	SetEncodingProcessConfiguration(obj) {
		this.currentProcess = obj.Parameters;
	}

	NotifyCardPreview(obj) {
		var param = obj.Parameters;
		var base64String;
		if (param[1]) {
			base64String = btoa(DWTasksProtocol.Uint8ToString(new Uint8Array(param[1])));
			$('#cardPreviewImgId').attr('src', 'data:image/png;base64,' + base64String);
			$('#cardPreviewImgId').show();
			$('#cardPreviewId').show();
		}
		if (param[2]) {
			base64String = btoa(DWTasksProtocol.Uint8ToString(new Uint8Array(param[2])));
			$('#cardPreviewImgBackId').attr('src', 'data:image/png;base64,' + base64String);
			$('#cardPreviewImgBackId').show();
			$('#cardPreviewId').show();
		}
	}

	NotifyEncodingProcessStarted(obj) {}

	SetTaskRecordConfiguration(obj) {
		var param = obj.Parameters;
		param[1].forEach(function(element) {
			if (element !== 2 && element !== 4) { //Encoding && Print
				DWUtils.sendJson(this.mWSTasks, {
					Method: 'SetCurrentRecordActionStepState',
					Parameters: [this.currentProcess[0], element, 4] //NotAvailable
				});
			}
		});
	}

	SetCurrentRecordField(obj) {
		var param = obj.Parameters;

		var name = param[1];

		var isReadOnly = param[4];
		var currentValue = param[2];
		var isNumber = Number.isInteger(param[2]);
		var min = 0;
		var max = param[3];
		var displayName = param[6].length === 0 ? param[1] : param[6];
		var editor = param[5];
		var src = '';
		var base64String;

		var field = document.getElementById(name + this.DW_RECORD_FIELD_NAME);
		if (field) { //we update it
			if (editor === undefined || editor === null) {
				field.value = currentValue;
			} else if (editor === 'Image') {
				base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(currentValue)));
				if (base64String.length !== 0) {
					src = 'data:image/png;base64,' + base64String;
				}
				field.src = src;
			}

		} else {

			var input = '';
			
			if (editor === undefined || editor === null) {

				input = '<input type="' + (isNumber ? 'number' : 'text') + '" class="form-control" id="' + name + this.DW_RECORD_FIELD_NAME + '" value="' + currentValue + '" ';
				if (max) {
					input += ' min="' + min + '" max="' + max + '"';
				}
				if (isReadOnly) {
					input += 'readonly';
				}
				input += '>';

			} else if (editor === 'Image') {

				base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(currentValue)));
				if (base64String.length !== 0) {
					src = 'data:image/png;base64,' + base64String;
				}

				input = '<div class="form-group">';
				input += '<img class="img-responsive" id="' + name + this.DW_RECORD_FIELD_NAME + '"  max="' + max + '" src="' + src + '" />';
				if (!isReadOnly) {
					input += '<input type="file" accept="image/*" onchange="getImageFromInputFile(this, \'' + name + this.DW_RECORD_FIELD_NAME + '\')" />';
					if (DWWebcam.hasUserMediaSupport()) {
						input += '<button type="button" class="btn btn-default" data-toggle="modal" data-target="#dwCameraModal" onclick="DWWebcam.initVideo(\'' + name + this.DW_RECORD_FIELD_NAME + '\')">Webcam</button>';
					}
				}
				input += '</div>';

			}

			$('#dwRecordFields').append('<li class="list-group-item"> <div class="row"> <div class="col-md-4"> ' + displayName + ' </div> <div class="col-md-8"> ' + input + ' </div></div> </li>');
		}
	}

	UserInteractionAskedAsync(obj) {
		$('#userValideButton').show();
	}

	GetCurrentRecordFieldValueAsync(obj) {
		var name = obj.Parameters[1];
		var field = document.getElementById(name + this.DW_RECORD_FIELD_NAME);

		var value;
		if (field.type === 'number') {
			value = parseInt(field.value);
		} else if (field.type === 'text') {
			value = field.value;
		} else { //Image
			value = DWUtils.convertBase64ToArray(field.getAttribute('src'));
		}

		DWUtils.sendJson(this.mWSTasks, {
			Method: 'GetCurrentRecordFieldValueCompleted',
			Parameters: [this.currentProcess[0], value]
		});
	}
	NotifyWaitInsertion(obj) {}

	NotifyBeginRecordCreationStep(obj) {}

	NotifyWaitRemoval(obj) {}

	NotifyEndRecordCreationStep(obj) {}

	CardErrorUserInteractionAskedAsync(obj) {
		$('#dwCardErrorUserInteractionAskedModalLabel').html(obj.Parameters[1]);
		$('#dwCardErrorUserInteractionAskedModal').modal('show');
	}

	NotifyEncodingMessageNotified(obj) {
		this.addMessageNotified(obj);
	}

	ProcessClientCreationStepAsync(obj) {
		var type = obj.Parameters[1];
		if (type === 4) {

			$('#cardPreviewImgModalId').hide();
			$('#cardPreviewImgBackModalId').hide();

			$('#dwPrintingModal').modal('show');

			$('#cardPreviewImgModalId').attr('src', $('#cardPreviewImgId').attr('src'));
			$('#cardPreviewImgBackModalId').attr('src', $('#cardPreviewImgBackId').attr('src'));

			if ($('#cardPreviewImgModalId').attr('src').length !== 0) {
				$('#cardPreviewImgModalId').show();
			}
			if ($('#cardPreviewImgBackModalId').attr('src').length !== 0) {
				$('#cardPreviewImgBackModalId').show();
			}
		}
	}


	set WebSocketTasks(eWebSocketTask) {
		this.mWSTasks = eWebSocketTask;
	}

	get WebSocketTasks() {
		return this.mWSTasks;
	}

	static Uint8ToString(u8a) {
		var CHUNK_SZ = 0x8000;
		var c = [];
		for (var i = 0; i < u8a.length; i += CHUNK_SZ) {
			c.push(String.fromCharCode.apply(null, u8a.subarray(i, i + CHUNK_SZ)));
		}
		return c.join('');
	}
    
    getImageFromInputFile(self, imgId) {
		if (self.files && self.files[0]) {
			var FR = new FileReader();
			FR.onload = function(e) {
				var img = document.getElementById(imgId);
				var maxLength = img.getAttribute('max');
				img.onload = function() {
					img.onload = null;
					DWTasksProtocol.resizeImage(img, maxLength, function(data) {
						img.src = data;
					});
				};
				img.src = e.target.result;
			};
			FR.readAsDataURL(self.files[0]);
		}
	}

	startTask(mTaskId) {
		if (this.dwClient.localReader !== null) {
			if (this.currentTaskId) {
				DWUtils.sendJson(this.mWSTasks, {
					Method: 'DetachTask',
					Parameters: [this.currentTaskId]
				});

				this.currentTaskId = undefined;
			}
		}

		$('#dwTaskSelectorModal').modal('hide');
		
		if (this.dwClient.localReader !== null) {
			DWUtils.sendJson(this.mWSTasks, {
				Method: 'StartEncodingProcess',
				Parameters: [mTaskId]
			});
		} else {
			if ($.inArray('protocol', this.dwClient.options.deviceTech) !== -1) {
				var oHiddFrame = document.createElement('iframe');
				oHiddFrame.style.visibility = 'hidden';
				oHiddFrame.style.position = 'absolute';
				oHiddFrame.src = 'datawriter://' + btoa(this.dwClient.options.uri + '@' + this.dwClient.options.login + ':' + this.dwClient.options.password + '/' + mTaskId);
				document.body.appendChild(oHiddFrame);
			}
		}

		this.currentTaskId = mTaskId;
	}

	getTaskList() {
		if (this.mWSTasks !== null) {
			DWUtils.sendJson(this.mWSTasks, {
				Method: 'GetTaskListAsync'
			});
		}
	}

	UserInteractionAskedCompleted() {
		$('#dwRecordFields :input').attr('disabled', true);

		$('#userValideButton').hide();
		DWUtils.sendJson(this.mWSTasks, {
			Method: 'UserInteractionAskedCompleted',
			Parameters: [this.currentProcess[0]]
		});
	}

	CardErrorUserInteractionAskedCompleted(response) {
		var type = 0;
		switch (response) {
			case 'Retry':
				type = 1;
				break;
			case 'Cancel':
				type = 2;
				break;
			case 'Skip':
				type = 3;
				break;
		}
		DWUtils.sendJson(this.mWSTasks, {
			Method: 'CardErrorUserInteractionAskedCompleted',
			Parameters: [this.currentProcess[0], type]
		});
	}

	ProcessClientCreationStepCompleted() {
		$('#dwPrintingModal').modal('hide');
		$('#cardPreviewImgModalId').attr('src', '');
		$('#cardPreviewImgBackModalId').attr('src', '');

		/* jshint ignore:start */
		function closePrint() {
			document.body.removeChild(this.__container__);
		}

		function setPrint() {
			this.contentWindow.__container__ = this;
			this.contentWindow.onbeforeunload = closePrint;
			this.contentWindow.onafterprint = closePrint;
			this.contentWindow.focus(); // Required for IE
			this.contentWindow.print();
		}
		/* jshint ignore:end */

		var pages = '<html><head><title>Card Image</title></head><body>';
		var imgCSS = '';
		var isChromium = window.chrome,
			winNav = window.navigator,
			vendorName = winNav.vendor,
			isOpera = winNav.userAgent.indexOf('OPR') > -1,
			isIEedge = winNav.userAgent.indexOf('Edge') > -1,
			isIOSChrome = winNav.userAgent.match('CriOS');

		if (isChromium !== null && isChromium !== undefined && vendorName === 'Google Inc.' && isOpera === false && isIEedge === false) {
			pages += '<div style="position: absolute;  left: 0;  top: 0;  bottom: 0;  right: 0; margin: 0; padding: 0; display: block;">';
			imgCSS = 'width: 100%; height: 100%; margin: 0; padding: 0; display: block;';
		} else {
			pages += '<div style="position: absolute;  left: 0;  top: 0;  bottom: 0;  right: 0;">';
			imgCSS = 'width: 100%; height: 100%;';
		}

		pages += '<img style="' + imgCSS + '" src="' + $('#cardPreviewImgId').attr('src') + '">';
		pages += '<img style="' + imgCSS + '" src="' + $('#cardPreviewImgBackId').attr('src') + '">';
		pages += '</div></body></html>';

		var oHiddFrame = document.createElement('iframe');
		/* jshint ignore:start */
		oHiddFrame.onload = setPrint;
		/* jshint ignore:end */
		oHiddFrame.style.visibility = 'hidden';
		oHiddFrame.style.position = 'absolute';
		oHiddFrame.style.right = '0';
		oHiddFrame.style.bottom = '0';
		oHiddFrame.style.width = '100%';
		oHiddFrame.style.height = '100%';
		oHiddFrame.srcdoc = pages;
		document.body.appendChild(oHiddFrame);

		DWUtils.sendJson(this.mWSTasks, {
			Method: 'ProcessClientCreationStepCompleted',
			Parameters: [this.currentProcess[0]]
		});
	}

	DoIt(obj) {
		if ($.inArray(obj.Method, this.DWTasksProtocolOperations) !== -1) {
			this[obj.Method](obj);
		} else {
			DWUtils.log('Tasks: Undefined method - ' + obj.Method);
		}
	}
}