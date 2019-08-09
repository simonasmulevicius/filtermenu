const path = require('path');
const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const xlsx = require('node-xlsx');

const formatting = require('./util/formatting');
let config = require('./config');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

//-----------------For testing only---------------+
formatting.runAllTests();
//------------------------------------------------+

app.get('/', (req, res, next) => {
    res.render('home', { title: 'Welcome to Fasterliq' });
});

app.get('/filterapp', (req, res, next) => {
    res.render('filterapp', {
        title: 'Filter Clients',
        firstTime: true,
        foundErrors: false,
        responseMessage: []
    });
});

app.post('/filterapp', (req, res, next) => {
    let form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        let clientsFileName = files['clientsfile'].name;
        let unwantedClientsFileName = files['unwantedclientsfile'].name;

        if (!(clientsFileName.endsWith('.xlsx') ||
                clientsFileName.endsWith('.xls') ||
                unwantedClientsFileName.endsWith('.xlsx') ||
                unwantedClientsFileName.endsWith('.xls')
            )) {
            return res.redirect('/invalidFile');
        }
        console.log("clientsFileName is:" + clientsFileName);
        console.log("unwantedClientsFileName is:" + unwantedClientsFileName);

        const timePrefix = formatting.getTimePrefix();

        let oldClientsFilePath = files['clientsfile'].path;
        let newClientsFilePath = __dirname + '\\uploads' + timePrefix + clientsFileName;
        fs.rename(oldClientsFilePath, newClientsFilePath, (err) => {
            if (err) console.log(err);

            let oldUnwantedClientsFilePath = files['unwantedclientsfile'].path;
            let newUnwantedClientsFilePath = __dirname + '\\uploads' + timePrefix + unwantedClientsFileName;
            fs.rename(oldUnwantedClientsFilePath, newUnwantedClientsFilePath, (err) => {
                if (err) console.log(err);

                //1. Upload information from files
                let allClients = formatting.getAllClients(newClientsFilePath);
                let unWantedPhoneNumbers = formatting.getUnwantedPhoneNumbers(newUnwantedClientsFilePath);
                let logger = {};
                logger.responseMessage = [];
                logger.foundErrors = false;

                //2. Filter contacts
                let filteredClients = formatting.filterContacts(allClients, unWantedPhoneNumbers, logger);

                //3. Download
                let fileName = timePrefix + "sortedClients.xlsx";
                let filePath = __dirname + "\\sortedContacts\\" + fileName;
                let buffer = xlsx.build([{ name: "Sorted_Clients_Sheet", data: filteredClients }]);

                fs.writeFile(filePath, buffer, 'utf8', function(err) {
                    if (err) console.log(err);
                    console.log(fileName + " was saved in the current directory!");
                    res.download(filePath, fileName);
                    res.render('filterapp', {
                        title: 'Filter Clients',
                        firstTime: false,
                        foundErrors: logger.foundErrors,
                        responseMessage: logger.responseMessage
                    });
                });
            });
        });
    });
});


app.get('/invalidFile', (req, res, next) => {
    res.render('problemOccured', {
        description: 'Invalid file has been selected',
        title: 'Incorrect file format'
    });
});

app.use((req, res, next) => {
    res.status(404).render('problemOccured', { description: 'Ups, page not found. Check your URL', title: 'Page not found' });
});

app.listen(3000);