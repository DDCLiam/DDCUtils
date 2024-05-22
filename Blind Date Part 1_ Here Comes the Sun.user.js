// ==UserScript==
// @name         Blind Date Part 1: Here Comes the Sun
// @namespace    http://tampermonkey.net/
// @version      2024-05-16
// @description  This one inserts a textbox and a button onto the properties tab. When the button is hit, the data from the textbox is taken, some work is done in it, it is split into groups of date ranges up to 7 days, and then numerous windows are opened to request data from the DCC.
// @author       Liam Jacobs
// @match        https://kraken.octopus.energy/accounts/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=octopus.energy
// @grant        unsafeWindow

// ==/UserScript==

(function() {
    'use strict';
    const container = document.createElement('div');
    const appTitle = document.createTextNode("BlindDate");
    // We create elements for the container + title of the tool.

    window.navigation.addEventListener("navigate", (event) =>
    // We "listen" to the browser to see if the user changes pages
    {
        if (window.location.href.indexOf("properties") > 0)
        {
            container.style.display = 'block';
            // We show the tool if the user is on the 'Properties' tab.
        }
        else
        {
            container.style.display = 'none';
            // We hide the tool anywhere else.
        }
    })

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

    function addUI() {
        // Create a container for the input and button
        container.style.position = 'fixed';
        container.style.top = '100px';
        container.style.right = '10px';
        container.style.padding = '10px';
        container.style.backgroundColor = 'white';
        container.style.border = '1px solid #AAA';
        container.style.color = 'black';
        container.style.zIndex = '10000';

        container.style.wordWrap = "break-word";
        container.style.width = "316px";
        container.style.maxWidth = "316px";
        container.style.borderRadius = ".8rem";
        container.style.boxShadow = "0 .1rem .3rem rgba(0, 0, 0, .1)";

        // Create a text area for input
        const textArea = document.createElement('textarea');
        textArea.id = 'feedMeDates';
        textArea.rows = 5;
        textArea.cols = 30;
        textArea.placeholder = 'Please enter the missing dates';

        const pageBreak = document.createElement('br');

        // Create a button to run the script
        const button = document.createElement('button');
        button.innerHTML = "<button style = 'color: white; font-size: 1.6rem; font-weight: 500; line-height: 1.25;' type = 'button' value = 'Get HH data' onclick='workaround();'>Get HH data";
        button.classList.add('tako-button');
        button.classList.add('tako-button--primary');


        // Append the text area and button to the container
        container.appendChild(appTitle);
        container.appendChild(pageBreak);
        container.appendChild(textArea);
        container.appendChild(button);

        // Append the container to the body
        document.body.appendChild(container);
    }

    waitForElm('#property-screenshot-content').then((elm) =>
    {
        // Once Kraken finishes loading the property tab

        unsafeWindow.workaround = workaround
        // The absolute bane of my existence. Userscripts operate out of a sandbox, and so when code is injected onto the page, it cannot invoke functions written inside of the sandbox. The only workaround for this is to force an entire browser into "unsafe" mode, and then share a function that calls another function from within the sandbox.
        // I could double the length of the script writing about my hatred for this and how I worked out how to do this, so I will just say the following: If you think about this code long enough it will stop working. Ignore it or suffer its wrath.
        function workaround()
        {
            liamMagic();
        }

        function liamMagic()
        {
            // The big one - this is the function that actually reworks all of the dates, runs the algorithm to split them into 2D arrays based on 7-day-max start and end dates, and then spits those into new HH request tabs.

            var headerList = document.getElementsByClassName('tako-dropdown__item');
            var HHLink = -1;
            var text = "";

            for (var i = 0; i < headerList.length; i ++)
            {
                if (headerList[i].outerHTML.includes("smartmeters/smets2/request-adhoc-profile-data-electricity/"))
                {
                    HHLink = i;
                    text = headerList[i].outerHTML
                    break;
                }
            }

            var final = text.split("/");
            console.log(final[4]);

            // All of the above is just a very lazy workaround to get the special magic number that Kraken uses to identify this smart meter device. It's not the GUID or the MSN, or the MPxN - it's some UUID that Kraken uses as an identifier in databases (I think?).

            var dates = [];
            dates = parseDatesFromString(document.getElementById("feedMeDates").value);
            // We grab all of the dates from the textbox and split them into an array.

            var dateRanges = generateDateRanges(dates);
            // We then take that array and feed it into this big function that decides the start + end dates for any given range, at a maximum of 7 days per range. If there are any 'loose', singlular days, it gives us that day of and the day after.
            // Technically Kraken only needs one day, as the HH requests from the DCC are inclusive, but it didn't want to hear about that during testing, so I gave in.

            var formattedRanges = "";

            formattedRanges = dateRanges.map(range => range.map(formatDate));
            // Finally, we take those dates and we strip out all of the useless time and timezone information, leaving us with the dates Kraken wants: YYYY-MM-DD.

            container.style.color = 'green';
            appTitle.nodeValue = "BlindDate - Hope you enjoyed your date!";

            formattedRanges.forEach((range, index) =>
            {
                window.open('https://kraken.octopus.energy/smartmeters/smets2/request-adhoc-profile-data-electricity/' + final[4] + "?from=" + range[0] + "&to=" + range[1] + "&LiamsMagic=true", '_blank').focus();
                // We loop over all of the new ranges we just made and we open the DCC HH reading request form for each of them.
                // Take note we add "from", "to" and "LiamsMagic" URL parameters to these - these are how we transfer this data into the forms. A second script looks for these values and, if they exist, populates the form automatically.
                // "LiamsMagic" could potentially be scrapped, but just in case they suddenly decide to use GET parameters for some reason, and to/from happen to be those, we safeguard against it by requiring "LiamsMagic."
            });
        }

        function isValidDate(d)
        {
            return d instanceof Date && !isNaN(d);
            // This is the only part of this code that I didn't write by hand, but I can confirm that it is secure, as it uses only native Javascript functions that do not send the data anywhere.
        }

        function parseDate(dateStr) // Kraken formats dates as "1 Apr 2023." Humans love this. JS screeches at this. We parse these to a Date format that JS does not screech at.
        {
            const [day, month, year] = dateStr.split(' ');
            const dayNum = parseInt(day, 10) + 1;
            const monthNum = new Date(`${month} 1, 2023`).getMonth(); // January is 0

            var returnValue = new Date(year, monthNum, dayNum);


            if (!isValidDate(returnValue))
            // We check to see if any of the dates we're trying to work with are invalid (I.E. Someone accidentally added some random text at the end of the textbox by mistake)
            {
                container.style.color = 'red';
                appTitle.nodeValue = "BlindDate - There is an error with your dates! Please make sure you are copying ONLY the dates (I.E. '1 Apr 2023, 2 Apr 2023'.";
                return "oof";
            }

            return returnValue
        }

        function formatDate(date) // JS > Human date converter.
        {
                return date.toISOString().split('T')[0];
        }

        function generateDateRanges(dates) // This is where the magic happens.
        {
            var dateObjects = dates.map(parseDate);
            var today = new Date();
            var thirteenMonthsAgo = new Date();
            thirteenMonthsAgo.setMonth(today.getMonth() - 13);


            const filteredDates = dateObjects;

            // I could, in theory, filter out dates older than 13 months and ignore today's date, as we know that we cannot pull

            const ranges = [];
            let start = filteredDates[0];
            let end = start;

            for (let i = 1; i <= filteredDates.length; i++)
            {
                const current = filteredDates[i];
                const nextDay = new Date(end);
                nextDay.setDate(end.getDate() + 1);

                if (i === filteredDates.length || current - nextDay > 0 || (current - start) / (1000 * 60 * 60 * 24) >= 7)
                    // If we're at the end of the list that's the final day for the current group, or if it's NOT just a single day, or if the current grouping is at or over 7 days:
                {
                    ranges.push([start, end]);
                    // Throw it onto the 2D 'ranges' array.
                    start = current;
                    end = current;
                }
                else
                {
                    end = current;
                    // Otherwise we keep going, because we haven't exceeded the 7 day span, and it doesn't fit any of the other criteria to be added to the 'range' array yet.
                }
            }

            // Ensure all """ranges""" of only a single day have the second element as the next day. Javascript is disgusting, but this works.
            return ranges.map(range =>
                {
                if (range[0].getTime() === range[1].getTime())
                {
                    const nextDay = new Date(range[1]);
                    nextDay.setDate(range[1].getDate() + 1);
                    return [range[0], nextDay];
                }
                return range;
            });
        }

        function parseDatesFromString(dateString)
        {
            return dateString.split(',').map(date => date.trim());
        }

        addUI()
    });


})();