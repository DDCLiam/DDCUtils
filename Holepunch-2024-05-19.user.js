// ==UserScript==
// @name         Holepunch
// @namespace    http://tampermonkey.net/
// @version      2024-05-19
// @description  Repeatedly bills a meterpoint in 7 day increments. Helps narrow down the exact date where there is missing HH data.
// @author       Liam Jacobs
// @match        https://kraken.octopus.energy/accounts/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=octopus.energy
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    if (window.location.href.indexOf("statements") > 0)
    {
        startHolepunch();
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
            startHolepunch();
        }
    })

    function startHolepunch()
    {
        waitForElm('.billing-history-reset').then((elm) =>
                                                  {

            var timelinempxns = document.getElementsByClassName("tako-checkbox__label");
            var propertympxns = document.getElementsByClassName("properties__item properties__item--success");
            var mpxnList = []

            // We get all of the MPxNs from the properties box.

            for (var i = 0; i < propertympxns.length; i ++)
            {
                var getFirst = propertympxns[i].children[0].children[0];
                mpxnList.push(getFirst.children[1].innerHTML);
            }

            // We get all of the MPxNs from the billing timeline.

            for (i = 0; i < timelinempxns.length; i ++)
            {
                var thisMPxN = mpxnList[i];

                timelinempxns[i].innerHTML += "<p><input type = 'button' class = 'tako-button tako-button--primary' value = 'Holepunch' onclick='showholeGUI(" + thisMPxN + ")'><div id='holepunch_" + thisMPxN + "' style='width: 300px; display: none; box-shadow: rgba(0, 0, 0, 0.25) 0px 0.3rem 0.7rem; border-radius: .8rem !important; border-spacing: 0px !important; border-collapse: separate !important;'> <table class='ItemA' style='border-radius: .8rem !important; border-spacing: 0 !important; border-collapse: separate !important; background-color: #EEEEEE; width: 100%; text-align: left; border-collapse: collapse;'> <thead style='border: 1px solid #000; background: #721CE3;'> <tr> <th style='border-top-left-radius: .8rem !important; border-top-right-radius: .8rem !important; border-spacing: 0 !important; border-collapse: separate !important; padding: 5px 5px; font-size: 15px; font-weight: bold; color: #FFFFFF;'>Holepunch<br><span id='holepuncherror_" + thisMPxN + "' style = 'color: white'>Please input your desired dates</span></th> </tr> </thead> <tfoot style='border-radius: 0.8rem !important; border-spacing: 0px !important; font-size: 14px; font-weight: bold; color: #FFFFFF; background: #fafafa;'><tr><td style='color:white; border-bottom-left-radius: .8rem !important; border-bottom-right-radius: .8rem !important; border-spacing: 0 !important; border-collapse: separate !important; padding: 5px 5px;'> <input type='button' style='color: white;' id = 'submitHole_" + thisMPxN + "' onclick='holepunch(" + thisMPxN + ")' class = 'tako-button tako-button--primary' value='Finding missing HH date'> </td> </tr> </tfoot> <tbody style='background: white'> <tr> <td style='border: 0px solid #AAAAAA; padding: 5px 5px;'> Start date: <input type='date' id = 'fromHole_" + thisMPxN + "'> <br><br> End date: <input type='date' id = 'toHole_" + thisMPxN + "'> </td> </tr> </tbody> </table></div> </div>"

            }

            function showholeGUI(mpxn)
            {
                var x = document.getElementById("holepunch_" + mpxn);
                if (x.style.display === "none")
                {
                    x.style.display = "block";
                }
                else
                {
                    x.style.display = "none";
                }
            }

            function getWeeklyPeriods(startDate, endDate)
            {
                let periods = [];

                let currentStartDate = new Date(startDate);

                while (currentStartDate <= endDate)
                {
                    let currentEndDate = new Date(currentStartDate)
                    currentEndDate.setDate(currentEndDate.getDate() + 6)

                    if (currentEndDate > endDate)
                    {
                        currentEndDate = endDate;
                    }

                    periods.push([currentStartDate.toISOString().split('T')[0], currentEndDate.toISOString().split('T')[0]]);

                    currentStartDate.setDate(currentStartDate.getDate() + 7);
                }

                return periods;
            }

            function holepunch(mpxn)
            {
                var fromDate = new Date(document.getElementById("fromHole_" + mpxn).value);
                var toDate = new Date(document.getElementById("toHole_" + mpxn).value);
                var dateList = getWeeklyPeriods(fromDate, toDate);

                for (i = dateList.length - 1; i >= 0; i --)
                {

                    var canRun = true;

                    if (toDate.getTime() >= new Date().getTime())
                    {
                        document.getElementById("holepuncherror_" + mpxn).innerHTML = "<span id='holepuncherror_" + thisMPxN + "' style = 'color: white'><br>You cannot bill past today's date.<br>Solution: Don't.</span>"
                        canRun = false;
                    }

                    if (toDate.getTime() < fromDate.getTime())
                    {
                        // If our 'to' date is before our 'from' date, screech about it.
                        document.getElementById("holepuncherror_" + mpxn).innerHTML = "<span id='holepuncherror_" + thisMPxN + "' style = 'color: white'><br>Your 'to' date must be after your 'from' date.<br>Solution: Don't mix them up.</span>"
                        canRun = false;
                    }

                    if (toDate.getTime() == fromDate.getTime())
                    {
                        document.getElementById("holepuncherror_" + mpxn).innerHTML = "<span id='holepuncherror_" + thisMPxN + "' style = 'color: white'><br>Your 'to' cannot be the same as your 'from' date.<br>Solution: Space them out by at least one day.</span>"
                        canRun = false;
                    }

                    if (canRun)
                    {
                        window.open('https://kraken.octopus.energy/billing/fill-billing-gap/' + mpxn + '/' + dateList[i][0] + '/' + dateList[i][1] + '/', "", "height=800,width=600").focus();

                        document.getElementById("holepuncherror_" + mpxn).innerHTML = "<span id='holepuncherror_" + thisMPxN + "' style = 'color: white'><br>Good luck finding that pesky missing HH data!</span>"
                    }
                }
            }

            unsafeWindow.showholeGUI = bypassShowHoleGUI;
            unsafeWindow.holepunch = bypassHolepunch;
            unsafeWindow.getWeeklyPeriods = bypassGetWeeklyPeriods;

            function bypassShowHoleGUI(arg)
            {
                showholeGUI(arg);
            }

            function bypassGetWeeklyPeriods(arg, arg2)
            {
                getWeeklyPeriods(arg, arg2);
            }

            function bypassHolepunch(arg)
            {
                holepunch(arg);
            }
        });
    }

})();
