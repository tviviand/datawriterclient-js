/*jshint esversion: 6*/

import DWUtils from './DWUtils';

export default class DWWebcam {

  static initVideo(imgId) {

    var streaming = false,
      video = document.querySelector('#dwVideo'),
      cover = document.querySelector('#dwCover'),
      canvas = document.createElement('canvas'),
      startbutton = document.querySelector('#dwPictureCambutton'),
      videoObj = {
        'video': true
      },
      errBack = function(error) {
        DWUtils.log('Video capture error: ' + error.code);
      },
      width = 320,
      height = 0,
      imgElement = document.getElementById(imgId);

    // Put video listeners into place
    if (navigator.getUserMedia) { // Standard
      navigator.getUserMedia(videoObj, function(stream) {
        video.src = stream;
        video.play();
      }, errBack);
    } else if (navigator.webkitGetUserMedia) { // WebKit-prefixed
      navigator.webkitGetUserMedia(videoObj, function(stream) {
        video.src = window.webkitURL.createObjectURL(stream);
        video.play();
      }, errBack);
    } else if (navigator.mozGetUserMedia) { // Firefox-prefixed
      navigator.mozGetUserMedia(videoObj, function(stream) {
        video.src = window.URL.createObjectURL(stream);
        video.play();
      }, errBack);
    }

    video.addEventListener('canplay', function(ev) {
      if (!streaming) {
        height = video.videoHeight / (video.videoWidth / width);
        video.setAttribute('width', width);
        video.setAttribute('height', height);
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
        streaming = true;
      }
    }, false);

    function takepicture() {
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(video, 0, 0, width, height);
      var result = canvas.toDataURL('image/jpeg', 1.0);
      var maxLength = imgElement.getAttribute('max');

      imgElement.onload = function() {
        imgElement.onload = null;
        DWUtils.resizeImage(imgElement, maxLength, function(data) {
          imgElement.src = data;
        });
      };
      imgElement.src = result;
    }

    startbutton.addEventListener('click', function(ev) {
      takepicture();
      ev.preventDefault();
    }, false);

  }

  static hasUserMediaSupport() {
    if (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {
      return true;
	}
    return false;
  }
}