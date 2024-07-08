// ==UserScript==
// @name         (Deprecated) Blind Date Part 3: The Final Jamboree
// @namespace    http://tampermonkey.net/
// @version      2024-05-17
// @description  This one just closes the "Close window" tab that opens after requesting HH reads.
// @author       Liam Jacobs
// @match        https://kraken.octopus.energy/close-window/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=octopus.energy
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.open('','_self').close()
    // Do not use until issue with Kraken reloads being needed is resolved.
})();
