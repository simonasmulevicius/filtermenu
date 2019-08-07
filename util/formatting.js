const xlsx = require('node-xlsx');

var formating = {
    transformName: function(nominative) {
        if (nominative.endsWith("as")) {
            return nominative.substring(0, nominative.lastIndexOf("as")) + "ai";
        }
        if (nominative.endsWith("is")) {
            return nominative.substring(0, nominative.lastIndexOf("is")) + "i";
        }
        if (nominative.endsWith("us")) {
            return nominative.substring(0, nominative.lastIndexOf("us")) + "au";
        }
        if (nominative.endsWith("ys")) {
            return nominative.substring(0, nominative.lastIndexOf("ys")) + "y";
        }
        if (nominative.endsWith("ė")) {
            return nominative.substring(0, nominative.lastIndexOf("ė")) + "e";
        }
        return nominative;
    },

    getTimePrefix: function() {
        var d = new Date();
        var timePrefix = ("\\" +
            d.getFullYear() + "-" +
            ("00" + (d.getMonth() + 1)).slice(-2) + "-" +
            ("00" + d.getDate()).slice(-2) + "-[" +
            ("00" + d.getHours()).slice(-2) + "-" +
            ("00" + d.getMinutes()).slice(-2) + "-" +
            ("00" + d.getSeconds()).slice(-2) + "]_"
        );
        return timePrefix;
    },

    getUnwantedPhoneNumbers: function(unwantedPhoneNumbersFilePath) {
        var obj = xlsx.parse(unwantedPhoneNumbersFilePath); // parses a file
        var rows = [];

        //looping through all sheets
        for (var i = 0; i < obj.length; i++) {
            var sheet = obj[i];
            //loop through all rows in the sheet
            for (var j = 0; j < sheet['data'].length; j++) {
                //add the row to the rows array
                //rows.push(sheet['data'][j][0]);

                let rawNumber = String(sheet['data'][j][0]);
                let baseNumber = rawNumber;

                //console.log("rawNumber " + rawNumber);

                if (rawNumber.startsWith("86")) {
                    baseNumber = rawNumber.substring(2);
                } else if (rawNumber.startsWith("3706")) {
                    baseNumber = rawNumber.substring(4);
                } else if (rawNumber.startsWith("+3706")) {
                    baseNumber = rawNumber.substring(5);
                }

                // console.log("baseNumber: " + baseNumber);
                // console.log(baseNumber);
                // console.log("8" + baseNumber);
                // console.log("370" + baseNumber);
                // console.log("+370" + baseNumber);

                rows.push(String(baseNumber));
                rows.push(String("86" + baseNumber));
                rows.push(String("3706" + baseNumber));
                rows.push(String("+3706" + baseNumber));
            }
        }
        //console.log(rows);
        return rows;
    }
};

module.exports = formating;