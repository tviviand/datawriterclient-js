/*jshint esversion: 6*/

import DataWriterClient from './DataWriterClient';

/**
 * Create a new DataWriter client instance.
 */
var dwjs = function() {
    return new DataWriterClient();
};

/* jshint ignore:start */
/**
 * Custom Universal Module Definition (UMD)
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('dwjs', [], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.dwjs = factory();
    }
}(this, function () {
    // Just return a value to define the module export.
    return dwjs;
}));

export default dwjs;
/* jshint ignore:end */