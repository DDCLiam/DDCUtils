// ==UserScript==
// @name         Cut and Sew 1: Show me the fun!
// @namespace    http://tampermonkey.net/
// @version      2024-05-19
// @description  Displays the "Cut and Sew" option for each MPxN + performs a calculation to find the number of tariffs we need to use to split & splice between two given dates + opens the Split & Splice window for each.
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
        startCutAndSew();
    }

    function waitForElm(selector)
    // This is basically a function that delays code from running until something on the page has loaded. In this case we are using this to await the special "HH data random number that I don't recognise" number that Kraken loads on the properties tab.
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
            startCutAndSew();
        }
    })

    document.querySelector('body').addEventListener('paste', (e) =>
    {
        // We "listen" to the browser to see when dates have been pasted
        if (document.activeElement.nodeName === "INPUT")
        {
            if (document.activeElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.className == "tako-checkbox__label")
            {
                var value = e.clipboardData.getData('text');
                var newDate = new Date(value);

                if (Object.prototype.toString.call(newDate) === '[object Date]')
                {
                    newDate = newDate.toISOString().split('T')[0];
                    document.activeElement.value = newDate;
                }
            }
        }
    });

    function startCutAndSew()
    {
        waitForElm('.billing-history-reset').then((elm) =>
                                                  {

            var timelinempxns = document.getElementsByClassName("tako-checkbox__label");
            var propertympxns = document.getElementsByClassName("properties__item properties__item--success");
            var exportList = []

            // We get all of the MPxNs from the properties box.

            for (var i = 0; i < propertympxns.length; i ++)
            {
                var getFirst = propertympxns[i].children[0].children[0];
                if (getFirst.innerHTML.includes("Export"))
                {
                    exportList.push(getFirst.children[1].innerHTML);
                }
            }

            // We get all of the MPxNs from the billing timeline.

            for (i = 0; i < timelinempxns.length; i ++)
            {
                var thisMPxN = timelinempxns[i].innerHTML;

                timelinempxns[i].parentNode.children[0].setAttribute("disabled", "");
                timelinempxns[i].parentNode.children[0].setAttribute("readonly", "");

                if (timelinempxns[i].innerHTML.length == 13)
                {
                    timelinempxns[i].innerHTML += "<p><input type = 'button' class = 'tako-button tako-button--primary' value = 'Cut & Sew' onclick='showGUI(" + thisMPxN + ")'><div id='splitAndSplice_" + thisMPxN + "' style='width: 300px; display: none; box-shadow: rgba(0, 0, 0, 0.25) 0px 0.3rem 0.7rem; border-radius: .8rem !important; border-spacing: 0px !important; border-collapse: separate !important;'> <table class='ItemA' style='border-radius: .8rem !important; border-spacing: 0 !important; border-collapse: separate !important; background-color: #EEEEEE; width: 100%; text-align: left; border-collapse: collapse;'> <thead style='border: 1px solid #000; background: #721CE3;'> <tr> <th style='border-top-left-radius: .8rem !important; border-top-right-radius: .8rem !important; border-spacing: 0 !important; border-collapse: separate !important; padding: 5px 5px; font-size: 15px; font-weight: bold; color: #FFFFFF;'>Cut &amp; Sew<br><span id='errorbox_" + thisMPxN + "' style = 'color: white'>Ready to go</span></th> </tr> </thead> <tfoot style='border-radius: 0.8rem !important; border-spacing: 0px !important; font-size: 14px; font-weight: bold; color: #FFFFFF; background: #fafafa;'><tr><td style='color:white; border-bottom-left-radius: .8rem !important; border-bottom-right-radius: .8rem !important; border-spacing: 0 !important; border-collapse: separate !important; padding: 5px 5px;'> <input type='button' style='color: white;' id = 'submit_" + thisMPxN + "' onclick='cutandsew(" + thisMPxN + ")' class = 'tako-button tako-button--primary' value='Splice in Flexible Octopus'> </td> </tr> </tfoot> <tbody style='background: white'> <tr> <td style='border: 0px solid #AAAAAA; padding: 5px 5px;'> Start date: <input type='date' id = 'from_" + thisMPxN + "'> <br><br> End date: <input type='date' id = 'to_" + thisMPxN + "'> </td> </tr> </tbody> </table></div> </div>"
                }
            }

            function showGUI(mpxn)
            // This function toggles the "Cut & Sew" modal.
            {
                var x = document.getElementById("splitAndSplice_" + mpxn);
                if (x.style.display === "none")
                {
                    x.style.display = "block";
                }
                else
                {
                    x.style.display = "none";
                }
            }

            function cutandsew(mpxn)
            {
                // First let's get a list of all of the agreements, their unique ID (this is needed for splitting + splicing), and their start + end dates.
                var barList = document.getElementsByClassName("ChartBarGroup__Bar__Rect");
                var goodBars = [];
                let elecAgreementData = [];
                let exportAgreementData = [];
                let gasAgreementData = [];

                // Loop over all of the "bars" on the page (these are the horizontal bars that show up on the billing timeline)
                for (var i = 0; i < barList.length; i ++)
                {
                    if (barList[i].__data__.isAgreement == true)
                        // Kraken so very kindly provides us with some existing data that tells us whether or not one of these elements is an agreement.
                    {
                        goodBars.push(barList[i]);
                        // Add it to the list of "good" bars that we're going to work on.
                    }
                }

                for (i = 0; i < goodBars.length; i ++)
                    // We loop over the list of "good" bars and to grab their data and add them into arrays.
                {
                    var aID = goodBars[i].__data__.agreementId;
                    var thismpxn = goodBars[i].__data__.mpxn;
                    var aStart = goodBars[i].__data__.lower;
                    var isGas = goodBars[i].__data__.isGas;
                    var aEnd = "";

                    if (Object.prototype.toString.call (goodBars[i].__data__.higher) != '[object Date]')
                    {
                        aEnd = new Date();
                        // If it's open-ended (doesn't have an end date) we'll just set that to today. We'll never be splitting or splicing into the future, so it doesn't matter.
                    }
                    else
                    {
                        aEnd = goodBars[i].__data__.higher;
                        // If it has an end date, we just take note of that.
                    }

                    if (isGas)
                    {
                        gasAgreementData.push([aID, aStart, aEnd]);
                        console.log("Gas: ", aID);
                        // Add it to the gas agreement list if it's gas.
                    }
                    else if (exportList.includes(thismpxn.toString()))
                    {
                        console.log("Export: ", aID);
                        exportAgreementData.push([aID, aStart, aEnd]);
                        // Add it to the export agreement list if it's export.
                    }
                    else
                    {
                        console.log("Elec: ", aID);
                        elecAgreementData.push([aID, aStart, aEnd]);
                        // Add it to the elec agreement list if it's elec.
                    }
                }

                // We grab our from/to dates from the modal for THIS MPxN.
                var fromDate = new Date(document.getElementById("from_" + mpxn).value);
                var toDate = new Date(document.getElementById("to_" + mpxn).value);

                // We grab the ACN from the URL (a bit dirty - I could grab it from an element, but this is so much easier). We also set the earliest tariff date.
                var earliestTariff = new Date(2018, 6, 27);
                var thisACN = window.location.href.split("/");
                thisACN = thisACN[4];

                // We find out if it's a Bulb account or not.
                var isBulb = document.getElementById("usersSummary").innerHTML.includes("Bulb");
                var meterType = "Oof";

                if (mpxn.toString().length == 13)
                // If the MPxN is 13 characters long, we know it's elec of some description.
                {
                    if (exportList.includes(mpxn.toString()))
                        // If our list of Export MPANs contains this MPAN, then we know it's an export.
                    {
                        meterType = "Export";
                    }
                    else
                    {
                        // Otherwise, it's 13 characters long, it's not in our list of Export MPANs, so it's just elec.
                        meterType = "Elec";
                    }
                }
                else
                {
                    // And finally, if it's not elec import or export, we know it's gas.
                    meterType = "Gas";
                }

                if (isBulb && meterType == "Export")
                {
                    // If it's a Bulb export, then this tool does not cover that.
                    meterType = "Bad Export";
                }

                let newTariffs = getNewTariff(fromDate, toDate);
                // We get a list of all of the active tariffs that fell between our "from" and "to" dates.

                for (i = 0; i < newTariffs.length; i ++)
                {
                    switch (meterType)
                    {
                        case "Export":
                            var oldTariffs = findOldTariffs(exportAgreementData, newTariffs[i][1], newTariffs[i][2]);
                            // We get all of the existing export agreements between our "from" and "to" dates.
                        break;
                        case "Elec":
                            oldTariffs = findOldTariffs(elecAgreementData, newTariffs[i][1], newTariffs[i][2]);
                            // We get all of the existing elec agreements between our "from" and "to" dates.
                        break;
                        case "Gas":
                            oldTariffs = findOldTariffs(gasAgreementData, newTariffs[i][1], newTariffs[i][2]);
                            // We get all of the existing gas agreements between our "from" and "to" dates.
                        break;
                    }

                    var canRun = true;
                    // We set this to false if we run into any issues while doing our error checks.

                    if (oldTariffs.length == 0)
                    // If there has never been an agreement, or something otherwise went wrong with our tool getting the tariffs.
                    {
                        document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>There was an unexpected error. Please try refreshing the page, otherwise you will have to Split and Splice this account manually.</span>"
                        canRun = false;
                    }

                    if (oldTariffs.length > 1)
                    // If we're splitting and splicing over multiple agreements.
                        // FAO Liam: You could update the tool to still split and splice these, but just end each period one day before the end date of the existing agreement. The user would have to manually revoke the bad tariff and extend the new flexible one, but it's better than doing it manually.
                        // FAO Liam: You could update the tool to still split and splice these, but just end each period one day before the end date of the existing agreement. The user would have to manually revoke the bad tariff and extend the new flexible one, but it's better than doing it manually.
                        // FAO Liam: You could update the tool to still split and splice these, but just end each period one day before the end date of the existing agreement. The user would have to manually revoke the bad tariff and extend the new flexible one, but it's better than doing it manually.
                        // FAO Liam: You could update the tool to still split and splice these, but just end each period one day before the end date of the existing agreement. The user would have to manually revoke the bad tariff and extend the new flexible one, but it's better than doing it manually.
                        // FAO Liam: You could update the tool to still split and splice these, but just end each period one day before the end date of the existing agreement. The user would have to manually revoke the bad tariff and extend the new flexible one, but it's better than doing it manually.
                        // FAO Liam: You could update the tool to still split and splice these, but just end each period one day before the end date of the existing agreement. The user would have to manually revoke the bad tariff and extend the new flexible one, but it's better than doing it manually.
                        // FAO Liam: You could update the tool to still split and splice these, but just end each period one day before the end date of the existing agreement. The user would have to manually revoke the bad tariff and extend the new flexible one, but it's better than doing it manually.
                        // FAO Liam: You could update the tool to still split and splice these, but just end each period one day before the end date of the existing agreement. The user would have to manually revoke the bad tariff and extend the new flexible one, but it's better than doing it manually.
                    {
                        document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>You cannot Split and Splice across multiple agreements.<br>Solution: Set the end date of the old agreement to the splice start date, set the start date of the new agreement to the splice end state, then manually insert your Flexible Octopus tariff.</span>"
                        canRun = false;
                    }

                    if (meterType == "Elec")
                    {
                        if (fromDate.getTime() === elecAgreementData[oldTariffs[0]][1].getTime())
                        // If we're splitting and splicing from an agreement start date, throw an error.
                        {
                            document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>You cannot Split and Splice an existing agreement from its start date.<br>Solution: Change the start date or revoke the agreement, then manually insert your Flexible Octopus tariff.</span>"
                            canRun = false;
                        }

                        if (toDate.getTime() === elecAgreementData[oldTariffs[0]][2].getTime())
                        {
                            // If we're splitting and splicing from an agreement end date, throw an error.
                            document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>You cannot Split and Splice an existing agreement on its end date.<br>Solution: Change the end date or revoke the agreement, then manually insert your Flexible Octopus tariff.</span>"
                            canRun = false;
                        }
                    }
                    else if (meterType == "Gas")
                    {
                        if (fromDate.getTime() === gasAgreementData[oldTariffs[0]][1].getTime())
                        {
                            // Ditto above, but for gas.
                            document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>You cannot Split and Splice an existing agreement from its start date.<br>Solution: Change the start date or revoke the agreement, then manually insert your Flexible Octopus tariff.</span>"
                            canRun = false;
                        }

                        if (toDate.getTime() === gasAgreementData[oldTariffs[0]][2].getTime())
                        {
                            // Ditto above, but for gas.
                            document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>You cannot Split and Splice an existing agreement on its end date.<br>Solution: Change the end date or revoke the agreement, then manually insert your Flexible Octopus tariff.</span>"
                            canRun = false;
                        }
                    }
                    else if (meterType == "Export")
                    {
                        if (fromDate.getTime() === exportAgreementData[oldTariffs[0]][1].getTime())
                        {
                            // Ditto above, but for export.
                            document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>You cannot Split and Splice an existing agreement from its start date.<br>Solution: Change the start date or revoke the agreement, then manually insert your Flexible Octopus tariff.</span>"
                            canRun = false;
                        }

                        if (toDate.getTime() === exportAgreementData[oldTariffs[0]][2].getTime())
                        {
                            // Ditto above, but for export.
                            document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>You cannot Split and Splice an existing agreement on its end date.<br>Solution: Change the end date or revoke the agreement, then manually insert your Flexible Octopus tariff.</span>"
                            canRun = false;
                        }
                    }
                    else if (meterType == "Bad export")
                    {
                        // If we're handling a Bulb account's export meter, error out.
                        document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>This tool does not currently handle export agreements for Bulb Energy accounts.<br>Solution: Split and Splice this manually.</span>"
                        canRun = false;
                    }

                    if (toDate.getTime() >= new Date().getTime())
                    {
                        // If we're splitting and splicing past today's date, throw an error. (technically we shouldn't allow today's date either, but they'll get an error when splitting and splicing anyways).
                        document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>You cannot Split and Splice into the future.<br>Solution: Don't do this.</span>"
                        canRun = false;
                    }

                    if (fromDate.getTime() < earliestTariff.getTime())
                    {
                        // If we're splitting and splicing before 27/06/2018 (the earliest tariff code this tool has in its arsenal), throw an error.
                        document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>This tool does not support dates before 27/06/2018.<br>Solution: Good luck.</span>"
                        canRun = false;
                    }

                    if (toDate.getTime() < fromDate.getTime())
                    {
                        // If our 'to' date is before our 'from' date, screech about it.
                        document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>Your 'to' date must be after your 'from' date.<br>Solution: Don't mix them up.</span>"
                        canRun = false;
                    }

                    if (toDate.getTime() == fromDate.getTime())
                    {
                        // If our 'to' date is the same as our 'from' date, cry about it.
                        // FAO Liam: Maybe look at just setting it to the day after automatically?
                        document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>Your 'to' cannot be the same as your 'from' date.<br>Solution: Space them out by at least one day.</span>"
                        canRun = false;
                    }



                    if (canRun)
                    // If it can run, then we open a Split and Splice window for the new tariff code between the given dates (remember, this is in a loop of all of the new tariff codes we found for this period, so this can execute multiple times).
                    {
                        switch (meterType)
                        {
                            case "Export":
                                window.open('https://kraken.octopus.energy/accounts/' + thisACN + "/electricity-agreements/" + exportAgreementData[oldTariffs[0]][0] + "/splice?tariff=OUTGOING-FIX-12M-19-05-13&from=" + newTariffs[i][1] + "&to=" + newTariffs[i][2] + "&LiamsMagic=true", '_blank').focus();
                            break;

                            case "Elec":
                                if (isBulb)
                                {
                                    window.open('https://kraken.octopus.energy/accounts/' + thisACN + "/electricity-agreements/" + elecAgreementData[oldTariffs[0]][0] + "/splice?tariff=VAR-BB-23-04-01&from=" + newTariffs[i][1] + "&to=" + newTariffs[i][2] + "&LiamsMagic=true", '_blank').focus();
                                }
                                else
                                {
                                    window.open('https://kraken.octopus.energy/accounts/' + thisACN + "/electricity-agreements/" + elecAgreementData[oldTariffs[0]][0] + "/splice?tariff=" + newTariffs[i][0] + "&from=" + newTariffs[i][1] + "&to=" + newTariffs[i][2] + "&LiamsMagic=true", '_blank').focus();
                                }
                            break;

                            case "Gas":
                                if (isBulb)
                                {
                                    window.open('https://kraken.octopus.energy/accounts/' + thisACN + "/gas-agreements/" + gasAgreementData[oldTariffs[0]][0] + "/splice?tariff=VAR-BB-23-04-01&from=" + newTariffs[i][1] + "&to=" + newTariffs[i][2] + "&LiamsMagic=true", '_blank').focus();
                                }
                                else
                                {
                                    window.open('https://kraken.octopus.energy/accounts/' + thisACN + "/gas-agreements/" + gasAgreementData[oldTariffs[0]][0] + "/splice?tariff=" + newTariffs[i][0] + "&from=" + newTariffs[i][1] + "&to=" + newTariffs[i][2] + "&LiamsMagic=true", '_blank').focus();
                                }
                            break;
                        }

                        document.getElementById("errorbox_" + mpxn).innerHTML = "<span id='errorbox_" + thisMPxN + "' style = 'color: white'><br>Hope your knitting went well!</span>"
                    }
                }
            }

            unsafeWindow.showGUI = bypassShowGUI;
            unsafeWindow.cutandsew = bypassCutAndSew;
            // Disgusting workaround because Javascript wants me dead. Getting more information on this is between you and God because I barely understand how it works, myself.

            function bypassShowGUI(arg)
            {
                showGUI(arg);
            }

            function bypassCutAndSew(arg)
            {
                cutandsew(arg);
            }

            // Our list of all of the active tariff codes from 2018 - 2100-01-01. This means that this tool will break in the year 2100. If you're reading this after the year 2100, just change this to 2200 and you'll be golden.
            const tariffList = [
                ["VAR-18-06-27-1A", "2018-06-27", "2019-04-12"],
                ["VAR-19-04-12", "2019-04-12", "2021-07-02"],
                ["VAR-21-07-02", "2021-07-02", "2022-09-21"],
                ["VAR-22-10-01", "2022-09-21", "2023-04-01"],
                ["VAR-22-11-01", "2023-04-01", "2100-01-01"]
            ];

            function getNewTariff(startDate, endDate)
            {
                // Parse the startDate and endDate to Date objects
                let start = new Date(startDate);
                let end = new Date(endDate);

                let newTariff = [];
                // We create the "newTariff" array to hold the new tariff(s) we're going to add + their start and end dates.

                // Loop through all of the known tariffs
                for (var i = 0; i < tariffList.length; i++)
                {
                    let tariffStart = new Date(tariffList[i][1]);
                    let tariffEnd = new Date(tariffList[i][2]);

                    // If the tariff period overlaps with the requested period
                    if (tariffStart <= end && tariffEnd > start)
                    {
                        // Determine the overlapping period
                        let overlapStart = new Date(Math.max(tariffStart, start));
                        let overlapEnd = new Date(Math.min(tariffEnd, end));

                        // This is a little workaround - if our end date is on the same date as a new tariff, we don't want to splice in that new tariff, because the old tariff ends on the same day, and we won't need a new one for the one day period.
                        if (overlapEnd.getTime() === end.getTime() && i < tariffList.length - 1)
                        {
                            newTariff.push([tariffList[i][0], overlapStart.toISOString().split('T')[0], end.toISOString().split('T')[0]]);
                            break;
                            // This basically means: If this tariff code ended on the same day we're splicing to, just stop here.
                        }
                        else
                            // Otherwise, we know we can just keep looking for the next tariff code(s).
                        {
                            newTariff.push([tariffList[i][0], overlapStart.toISOString().split('T')[0], overlapEnd.toISOString().split('T')[0] ]);
                        }
                    }
                }

                return newTariff;
            }


            function findOldTariffs(agreementData, startDate, endDate)
            {
                // Parse the startDate and endDate to Date objects
                let start = new Date(startDate);
                let end = new Date(endDate);

                let replacingTariffs = [];
                // Iterate through the elecTariffArray to find the overlapping tariff
                for (i = 0; i < agreementData.length; i++)
                {
                    let tariffStart = new Date(agreementData[i][1]);
                    let tariffEnd = new Date(agreementData[i][2]);

                    // Check if the new period overlaps with the existing tariff period
                    if (start < tariffEnd && end > tariffStart) {
                        replacingTariffs.push(i)
                    }
                }

                return replacingTariffs;
            }

        });
    }

})();
