const xlsx = require('node-xlsx');
const regex = require("regex");

let formatting = {
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

    transformEntireName: function(fullname) {
        let names = fullname.split(" ");
        let returnName = "";
        names.forEach(name => {
            returnName += formatting.transformName(name) + " ";
        });
        return returnName;
    },

    getTimePrefix: function() {
        let d = new Date();
        let timePrefix = ("\\" +
            d.getFullYear() + "-" +
            ("00" + (d.getMonth() + 1)).slice(-2) + "-" +
            ("00" + d.getDate()).slice(-2) + "-[" +
            ("00" + d.getHours()).slice(-2) + "-" +
            ("00" + d.getMinutes()).slice(-2) + "-" +
            ("00" + d.getSeconds()).slice(-2) + "]_"
        );
        return timePrefix;
    },

    getAllClients: function(clientsFilePath) {
        let clientsXlsx = xlsx.parse(clientsFilePath);
        const allClients = [];
        //looping through all sheets
        for (let i = 0; i < clientsXlsx.length; i++) {
            let sheet = clientsXlsx[i];
            //loop through all rows in the sheet
            for (let j = 0; j < sheet['data'].length; j++) {
                //add the row to the rows array
                if (sheet['data'][j].length >= 2) {
                    const client = {};
                    client.name = String(sheet['data'][j][0]);
                    client.nameTransformed = formatting.transformEntireName(String(sheet['data'][j][0]));
                    client.phoneNumberOriginal = String(sheet['data'][j][1]);
                    client.phoneNumberNormalized = String(formatting.normalizePhoneNumber(sheet['data'][j][1]));
                    console.log("CLIENT INFO:", client.name, client.nameTransformed, client.phoneNumberOriginal, client.phoneNumberNormalized);
                    allClients.push(client);
                }
            }
        }
        return allClients;
    },

    getUnwantedPhoneNumbers: function(unwantedPhoneNumbersFilePath) {
        let obj = xlsx.parse(unwantedPhoneNumbersFilePath);
        let phoneNumbers = [];

        for (let i = 0; i < obj.length; i++) {
            let sheet = obj[i];
            //loop through all rows in the sheet
            for (let j = 0; j < sheet['data'].length; j++) {
                if (sheet['data'][j].length >= 1) {
                    phoneNumber = [];
                    phoneNumber.phoneNumberOriginal = String(sheet['data'][j][0]);
                    phoneNumber.phoneNumberNormalized = String(formatting.normalizePhoneNumber(sheet['data'][j][0]))
                    phoneNumbers.push(phoneNumber);
                }
            }
        }
        return phoneNumbers;
    },

    normalizePhoneNumber: function(phoneNumber) {
        let trimmedPhoneNumber = String(phoneNumber).replace(/[^0-9]/g, '');
        return formatting.removePrefix(trimmedPhoneNumber);
    },

    removePrefix: function(phoneNumber) {
        let phoneNumberStr = String(phoneNumber);
        return phoneNumberStr.replace(/^(00)?(33|370|8)/, "");
    },

    isThisPhoneNumberUnwanted: function(client, unwantedPhoneNumbers) {
        let answer = false;
        if ("" == client.phoneNumberNormalized) answer = true;
        else {
            //console.log();
            unwantedPhoneNumbers.forEach((badphoneNumber) => {
                //console.log("COMPARING: " + client.phoneNumberNormalized + " and " + badphoneNumber.phoneNumberNormalized);
                if (client.phoneNumberNormalized == badphoneNumber.phoneNumberNormalized) {
                    //console.log("MISMATCH: " + client.phoneNumberNormalized + " and " + badphoneNumber.phoneNumberNormalized);
                    answer = true;
                }
            });
        }
        return answer;
    },

    filterContacts: function(allClients, unWantedPhoneNumbers, logger) {
        let filteredClients = [];
        allClients.forEach(client => {
            if (!formatting.isThisPhoneNumberUnwanted(client, unWantedPhoneNumbers)) {
                let newGoodClient = [client.name, client.nameTransformed, client.phoneNumberOriginal];
                filteredClients.push(newGoodClient);
            } else {
                logger.foundErrors = true;
                const text = "DETECTED: " + client.name + " " + client.nameTransformed + " " + client.phoneNumberOriginal;
                console.log(text);
                logger.responseMessage.push(text);
            }
        });
        return filteredClients;
    },

    test_removePrefix: function() {
        console.log("------------------------------------");
        console.log("Testing removePrefix");
        const testCases = [
            ['867883756', '67883756'],
            ['37067883756', '67883756'],
            ['00867883756', '67883756'],
            ['3367883756', '67883756'],
            ['003367883756', '67883756']
        ];

        testCases.forEach((row) => {
            if (formatting.normalizePhoneNumber(row[0]) != row[1]) {
                console.log("TEST FAILED: expected" + formatting.normalizePhoneNumber(row[0]) + " vs " + row[1]);
            }
        });
        console.log("------------------------------------");
    },

    test_normalizePhoneNumber: function() {
        console.log("------------------------------------");
        console.log("Testing normalizePhoneNumber");
        const testCases = [
            ['86788 3756', '67883756'],
            ['+37067  883756', '67883756'],
            [' 867883756', '67883756'],
            ['(370) 678 83756', '67883756'],
            ['8678837 56', '67883756'],
            ['370.678.83756 ', '67883756'],
            ['+370-67-883756 ', '67883756'],
            ['3301234567', '01234567']
        ];

        testCases.forEach((row) => {
            if (formatting.normalizePhoneNumber(row[0]) != row[1]) {
                console.log("TEST FAILED: " + row[0] + " ->" + formatting.normalizePhoneNumber(row[0]) + " vs " + row[1]);
            }
        });
        console.log("------------------------------------");
    },

    test_isThisPhoneNumberUnwanted: function() {
        console.log("------------------------------------");
        console.log("Testing isThisPhoneNumberUnwanted");
        const unwantedPhoneNumbers = ['861234567', '37067883756', '33 01 23 45 67'];

        let normalizedUnwantedPhoneNumbers = [];
        unwantedPhoneNumbers.forEach(phoneNumber => {
            let normalizedPhoneNumber = formatting.normalizePhoneNumber(phoneNumber);
            console.log("normalizedPhoneNumber: " + normalizedPhoneNumber);
            normalizedUnwantedPhoneNumbers.push(normalizedPhoneNumber);
        });

        console.log(normalizedUnwantedPhoneNumbers);

        const testCases = [
            ['861234567', true],
            ['861111111', false],
            ['37067883756', true],
            ['37067888888', false],
            ['cat', true],
            ['3301234567', true],
            ['123456789', false]
        ];

        testCases.forEach((test) => {
            console.log("WORKING with:" + test);
            let normalizedTest = formatting.normalizePhoneNumber(test[0]);
            if (formatting.isThisPhoneNumberUnwanted(normalizedTest, normalizedUnwantedPhoneNumbers) != test[1]) {
                console.log("TEST FAILED: " + test[0] + " -> " + formatting.isThisPhoneNumberUnwanted(normalizedTest, normalizedUnwantedPhoneNumbers) + " vs " + test[1]);
                console.log("NORMALIZED: " + normalizedTest);
            }
        });
        console.log("------------------------------------");
    },

    runAllTests: function() {
        formatting.test_removePrefix();
        formatting.test_normalizePhoneNumber();
        //formatting.test_isThisPhoneNumberUnwanted();
    }
};

module.exports = formatting;