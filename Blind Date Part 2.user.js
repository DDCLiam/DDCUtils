// ==UserScript==
// @name         Blind Date Part 2: Electric Boogaloo
// @namespace    http://tampermonkey.net/
// @version      2024-05-16
// @description  This one yoinks the URL parameters we set earlier and populates the dates on the DCC HH request form
// @author       You
// @match        https://kraken.octopus.energy/smartmeters/smets2/request-adhoc-profile-data-electricity/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=octopus.energy
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);

    if (params.has('from') && params.has("to") && params.has("LiamsMagic"))
    {
        document.getElementById('id_from_date').value=params.get('from');
        document.getElementById('id_to_date').value=params.get('to');
    }

})();
