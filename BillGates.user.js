// ==UserScript==
// @name         BillGates
// @namespace    http://tampermonkey.net/
// @version      2024-05-19
// @description  Attempts to bill all gaps for a given MPxN.
// @author       Liam Jacobs
// @match        https://kraken.octopus.energy/accounts/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=octopus.energy
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    if (window.location.href.indexOf("statements") > 0)
    // Show the tool if we're on the statements tab.
    {
        startMrGates();
    }

    function waitForElm(selector)
    {
        return new Promise(resolve =>
                           {
            if (document.querySelector(selector))
            {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations =>
                                                  {
                if (document.querySelector(selector))
                {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
            observer.observe(document.body,
                             {
                childList: true,
                subtree: true
            });
        });
    }
    window.navigation.addEventListener("navigate", (event) =>
                                       // We "listen" to the browser to see if the user changes pages
                                       {
        if (window.location.href.indexOf("statements") > 0)
        {
            // Show the tool if we SWITCH to the statements tab.
            startMrGates();
        }
    })

    function startMrGates()
    {
        waitForElm('.billing-history-reset').then((elm) =>
                                                  {
            var timelinempxns = document.getElementsByClassName("tako-flex--gap-md");

            // We grab all of the MPxNs from the timeline (usually we have Cut & Sew installed, so we also strip out the data that inserted into the elements).

            for (var i = 0; i < timelinempxns[0].childNodes.length; i ++)
            {
                if (timelinempxns[0].childNodes[i].tagName == "LABEL")
                {
                    var thisMPxN = timelinempxns[0].childNodes[i];
                    var test = thisMPxN.innerHTML.split(">");
                    var test2 = test[1].split("<");
                    thisMPxN = test2[0].trim();

                    timelinempxns[0].childNodes[i].innerHTML += "<p><input type = 'button' class = 'tako-button tako-button--primary' value = 'BillGates' onclick='billgates(" + thisMPxN + ")'>"
                    // Shoe-horn in a button that runs our 'billgates' function below.
                }
            }

            function billgates(mpxn)
            {
                var barList = document.getElementsByClassName("ChartBarGroup__Bar__Rect--problem gap");
                var goodBars = [];

                for (var i = 0; i < barList.length; i ++)
                {
                    if (barList[i].__data__.isError == true)
                    {
                        goodBars.push([barList[i].__data__.mpxn, barList[i].__data__.lower.toISOString().split('T')[0], barList[i].__data__.higher.toISOString().split('T')[0]]);
                    }

                }

                for (i = 0; i < goodBars.length; i ++)
                {
                    if (goodBars[i][0] == mpxn)
                    {
                        window.open("https://kraken.octopus.energy/billing/fill-billing-gap/" + goodBars[i][0] + "/" + goodBars[i][1] + "/" + goodBars[i][2] +"/", '', "width=500,height=500").focus();
                    }
                }
            }

            unsafeWindow.billgates = bypassBill;

            function bypassBill(arg)
            {
                billgates(arg);
            }


        });
    }

})();
