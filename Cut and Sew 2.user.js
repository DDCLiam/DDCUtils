// ==UserScript==
// @name         Cut and Sew 2: There's knitting to do!
// @namespace    http://tampermonkey.net/
// @version      2024-05-16
// @description  This one yoinks the URL parameters we set earlier and populates the tariff code + date fields
// @author       You
// @match        https://kraken.octopus.energy/accounts/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=octopus.energy
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);

    if (params.has('tariff') && params.has('from') && params.has("to") && params.has("LiamsMagic"))
    {
        document.getElementById('id_product').value=params.get('tariff');
        document.getElementById('id_splice_from').value=params.get('from');
        document.getElementById('id_splice_to').value=params.get('to');
    }
})();
