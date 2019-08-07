const path = require('path');
const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const xlsx = require('node-xlsx');

const formatting = require('./util/formatting');
var config = require('./config');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/filterapp', (req, res, next) => {
    res.render('filterapp');
});

app.post('/fileuploaded', (req, res) => {
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        //1. Store files in memory
        var clientsFileName = files['clientsfile'].name;
        var unwantedClientsFileName = files['unwantedclientsfile'].name;

        console.log("Clientsfile name is:" + clientsFileName);
        console.log("Unwantedclientsfile name is:" + unwantedClientsFileName);

        if (!(clientsFileName.endsWith('.xlsx') ||
                clientsFileName.endsWith('.xls') ||
                unwantedClientsFileName.endsWith('.xlsx') ||
                unwantedClientsFileName.endsWith('.xls')
            )) {
            res.redirect('/invalidFile');
            return;
        }

        const timePrefix = formatting.getTimePrefix();

        var oldClientsFilePath = files['clientsfile'].path;
        var newClientsFilePath = __dirname + '\\uploads' + timePrefix + clientsFileName;
        fs.rename(oldClientsFilePath, newClientsFilePath, (err) => {
            if (err) console.log(err);

            var oldUnwantedClientsFilePath = files['unwantedclientsfile'].path;
            var newUnwantedClientsFilePath = __dirname + '\\uploads' + timePrefix + unwantedClientsFileName;
            fs.rename(oldUnwantedClientsFilePath, newUnwantedClientsFilePath, (err) => {
                if (err) console.log(err);

                // //2. Parse files
                var clientsXlsx = xlsx.parse(newClientsFilePath);

                //Unwanted clients:
                var unWantedPhoneNumbers = formatting.getUnwantedPhoneNumbers(newUnwantedClientsFilePath);
                console.log("List of unwanted phone numbers:");
                for (var i = 0; i < unWantedPhoneNumbers.length; i++) {
                    console.log(unWantedPhoneNumbers[i]);
                }
                console.log("THE END of the list of unwanted phone numbers:");
                console.log(unWantedPhoneNumbers);

                var phoneNumberRows = [];
                //looping through all sheets
                for (var i = 0; i < clientsXlsx.length; i++) {
                    var sheet = clientsXlsx[i];
                    //loop through all rows in the sheet
                    for (var j = 0; j < sheet['data'].length; j++) {
                        //add the row to the rows array
                        if (sheet['data'][j].length >= 2) {
                            var pair = [];
                            pair.push(String(sheet['data'][j][0]));
                            pair.push(String(sheet['data'][j][1]));
                            phoneNumberRows.push(pair);
                        }
                    }
                }
                console.log(phoneNumberRows);

                //creates the csv or xlsx string to write it to a file
                var writeStr = "";
                let errorsFound = '<ol>';
                for (var i = 0; i < phoneNumberRows.length; i++) {
                    if (phoneNumberRows[i].length >= 2) {
                        if (!unWantedPhoneNumbers.includes(phoneNumberRows[i][1])) {
                            let text = phoneNumberRows[i][0] + ";" + formatting.transformName(phoneNumberRows[i][0]) + ";" + phoneNumberRows[i][1];
                            writeStr += text + "\n";
                            console.log("CORRECT: " + text);
                        } else {
                            //Unwanted phone number is detected
                            let text = phoneNumberRows[i][0] + ', ' + phoneNumberRows[i][1];
                            errorsFound += ('<li>' + text + '</li>');
                            console.log("DETECTED: " + text);
                        }
                    }
                }
                errorsFound += '</ol>';

                // if (errorsFound.length > 0) {
                //     res.write(errorsFound);
                // } else {
                //     res.write('<p> No errors were found </p>');
                // }

                //writes to a file, but you will presumably send the csv as a      
                //response instead
                var fileName = timePrefix + "sortedClients.csv";
                var filePath = __dirname + "\\sortedContacts\\" + fileName;

                fs.writeFile(filePath, writeStr, function(err) {
                    if (err) console.log(err);
                    console.log(writeStr);
                    console.log("sortedClients.csv was saved in the current directory!");
                    return res.download(filePath, fileName);
                });

                // //res.download(filePath, fileName);
                // //return res.end();
                // //return;
            });
        });
    });
});

app.use((req, res, next) => {
    res.status(404).render('404');
});

app.listen(3000);