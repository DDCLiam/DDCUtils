// ==UserScript==
// @name         DateBorrower
// @namespace    http://tampermonkey.net/
// @version      2024-05-28
// @description  Adds "Bill 3 months" and "Copy From Date" buttons to the billing gap filler.
// @author       You
// @match        https://kraken.octopus.energy/billing/fill-billing-gap/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=octopus.energy
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var button = document.getElementsByClassName("tako-button-group");
    var URL = window.location.href;
    var urlParams = URL.split("/");
    var toDate = urlParams[6];


    var originalToDate = new Date(toDate);
    var newToDate = new Date(originalToDate.setMonth(originalToDate.getMonth()+3));
    var newToDateString = newToDate.toISOString().split('T')[0];

    button[0].innerHTML += '<a onclick = "navigator.clipboard.writeText(\'' + toDate +'\');" class="tako-button tako-button--primary tako-button--outlined">Copy "From" Date</a><a onclick = "window.location=\'' + urlParams[0] + "//" + urlParams[2] + "/" + urlParams[3] + "/" + urlParams[4] + "/" + urlParams[5] + "/" + urlParams[6] + "/" + newToDateString + '/\'" class="tako-button tako-button--primary tako-button--outlined">Bill 3 months</a>';

})();