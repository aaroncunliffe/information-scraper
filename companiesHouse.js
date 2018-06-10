var keys = require("./keys");
var request = require("request-promise");
var fs = require("fs");

const googleMapsClient = require("@google/maps").createClient({
  key: keys.GOOGLE_PLACES, // key should be in a .gitingored file
  Promise: Promise
});


/* 
  Summary: Uses https://developer.companieshouse.gov.uk/api/docs/index.html
  There are libraries for this, but it is a very basic API to interact with, so I just used request-promise and manually retrieved the data

  Searches for the company on companies house, narrows down the registered business address ot the one found on google places
  (higher chance of getting the right company)
  Once retrieved the exact company, can fetch company info, persons with significant control and officers in the company,
  All will be stored to text file, too much information to print to the console window.
  
  Limitations: company may not be found on the google places API. Abbreviated names will fail.

 */

//------------------------------

module.exports = main; // export function pointer to crawler

//------------------------------

var baseAPIurl = "https://api.companieshouse.gov.uk/";

var companySearchQueryURL = "search/companies?q=";
var companyQueryURL = "company/";
var personsURL = "/persons-with-significant-control";
var officersURL = "/officers";

var companyName = "";
var postcode = "";
var companyNumber = "";

// Company info
var status = "";
var companyType = "";
var creationDate = "";
var jurisdiction = "";

//persons with significant control
var persons = [];
var officers = [];

var domain = "";

/* 
  Summary
  use google places API to retrieve name + postal code.
  search companies house for name, loop through each result to find one with a business address that matches google
  
 */
function main(address) {
  domain = address;
  getPlaceID(domain)
    .then(function (response) {

      if (response.json.results[0] == undefined) {
        console.log("----companiesHouse.js----");
        console.log("Error - no google place found for that email address");
        console.log("");
      } else {
        var result = response.json.results[0]; // Always assume first result is most relevant, not the best idea, but good enough
        runFullQuery(result.place_id) // RUN query on retrieved placeID
          .then(function (response) {

            companyName = response.json.result.name;

            // Retrieve postal town to hopefully improve the search drastically.
            var address_components = response.json.result.address_components;

            for (var i = 0; i < address_components.length; i++) {
              if (address_components[i].types[0].includes("postal_code")) {
                postcode = address_components[i].long_name;
              }
            }

            // Run Companies-house API query
            // This function then calls for company information by company number
            // then persons with significant control
            // then officers
            // then writes to file.
            companiesHouseQuery();

          }).catch(function (err) {
            console.log("placeID search error: " + err);
          });;
      }
    })
    .catch(function (err) {
      console.log("places search error: " + err);
    });

}

/*
* Run the query for general places, returns a list of potential places from the given query string
  @returns promise
*/
function getPlaceID(domain) {
  return googleMapsClient.places({
    query: domain
  }).asPromise();
}

/*
* Run the query for a unique place given its ID
  @returns promise
*/
function runFullQuery(id) {
  return googleMapsClient.place({
    placeid: id
  }).asPromise()
}

/* Searches for the company using the data gathered from the Google Places API
   Once the company name and company number has been retrieved calls retrieveCompany();
*/
function companiesHouseQuery() {
  params = {
    url: baseAPIurl + companySearchQueryURL + companyName,
    headers: {
      "Authorization": "Basic " + keys.COMAPNIES_HOUSE_BASE_64
    }
  }
  request(params, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var results = JSON.parse(body).items;
      var company = undefined;

      // O(n) - Linear is easiest with these search terms
      for (var i = 0; i < results.length; i++) {
        if (results[i].address.postal_code === postcode) {
          company = results[i];
        }
      }
      // if undefined at this point - company not found
      if (company === undefined) {
        console.log("----companiesHouse.js----");
        console.log("Error - company not found \n");
        return; // dynamically exit
      }
      companyNumber = company.company_number;

      retrieveCompany();
    }

  }).catch(function (err) {
    console.log("error fetching company search: " + err);
  });
}

/*
* Now that we have a unique company number (hopefully correct due to matching with google places postcode retrieval)
* We can retrieve exact details
*/
function retrieveCompany() {
  params.url = baseAPIurl + companyQueryURL + companyNumber;
  request(params, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var results = JSON.parse(body)
      //company name
      //comany number
      status = results.status;
      companyType = results.type;
      creationDate = results.date_of_creation;
      jurisdiction = results.jurisdiction;

      retrievePersonsWithSignificantControl();
    }

  }).catch(function (err) {
    console.log("error fetching company with number: " + err);
  });
}


/*
* Uses the CompanyNumber already gathered to retireve persons with significant control over the company
* and various information about them
* after competion calls retrieveOfficers() function
*/
function retrievePersonsWithSignificantControl() {
  params.url = baseAPIurl + companyQueryURL + companyNumber + personsURL;
  request(params, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var results = JSON.parse(body)
      // push all information to array for use later
      for (var i = 0; i < results.items.length; i++) {
        // There are probably more types that I've missed.
        if (results.items[i].kind === "individual-person-with-significant-control") {
          var person = {
            name: results.items[i].name,
            nationality: results.items[i].nationality,
            birthYear: results.items[i].date_of_birth.year,
            birthMonth: results.items[i].date_of_birth.month,
            countryOfResidence: results.items[i].country_of_residence,
            naturesOfControl: [],
            kind: results.items[i].kind
          }

          for (var j = 0; j < results.items[i].natures_of_control.length; j++) {
            person.naturesOfControl.push(results.items[i].natures_of_control[j]);
          }

          persons.push(person);
        }
        else if (results.items[i].kind === "corporate-entity-person-with-significant-control") {
          var person = {
            name: results.items[i].name,
            kind: results.items[i].kind,
            naturesOfControl: [],
            countryRegistered: results.items[i].identification.country_registered
          }
          for (var j = 0; j < results.items[i].natures_of_control.length; j++) {
            person.naturesOfControl.push(results.items[i].natures_of_control[j]);
          }
          persons.push(person);
        }
        

      }
    }
    retrieveOfficers();
  }).catch(function (err) {
    console.log("error fetching company persons with significant control: " + err);
  });
}

/*
* Uses the CompanyNumber already gathered to retireve officers of the company
* and various information about them
* after completion calls writeToFile() function
*/
function retrieveOfficers() {
  params.url = baseAPIurl + companyQueryURL + companyNumber + officersURL;
  request(params, function (error, response, html) {
    if (!error && response.statusCode == 200) {
      var results = JSON.parse(html);

      for (var i = 0; i < results.items.length; i++) {
        var officer = {
          name: results.items[i].name,
          officerRole: results.items[i].officer_role,
          occupation: results.items[i].occupation,
          appointedOn: results.items[i].appointed_on,
          nationality: results.items[i].nationality,
          birthYear: results.items[i].date_of_birth.year,
          birthMonth: results.items[i].date_of_birth.month,
          countryOfResidence: results.items[i].country_of_residence,
        }

        officers.push(officer);
      }
      writeToFile();
    }
  }).catch(function (err) {
    console.log("error fetching company officers: " + err);
  });

}

/*
* Logs all of the information gathered so far in the program to the text file
* Too much information to log to the console
*/
function writeToFile() {
  console.log("----companiesHouse.js----");

  var base = "./information/";
  var dir = "./information/" + domain;

  // Making directories have to be 2 different commands, cannot create both at once (on windows at least).
  // Make the base directory only if it doesnt exist
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base);
  }

  // create full directory if it doesnt exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  // default text file, could do CSV too
  var stream = fs.createWriteStream("./information/" + domain + "/companies-house.txt");

  stream.once('open', function (fd) { // open file

    stream.write("----Company Information----" + "\n")
    stream.write("Name: " + companyName + "\n");
    stream.write("Status: " + status + "\n");
    stream.write("Type: " + companyType + "\n");
    stream.write("Creation Date: " + creationDate + "\n");
    stream.write("Jurisdiction: " + jurisdiction + "\n");
    stream.write("\n");

    stream.write("----Persons With Significant Control----" + "\n")
    for (var i = 0; i < persons.length; i++) {
      if (persons[i].kind === "individual-person-with-significant-control") {
        stream.write("Name: " + persons[i].name + "\n");
        stream.write("kind:" + persons[i].kind + "\n");
        stream.write("Natures of control: ")
        for (var j = 0; j < persons[i].naturesOfControl.length; j++) {
          stream.write(persons[i].naturesOfControl[j] + ", ");
        }
        stream.write("\n");
        stream.write("Country of residence: " + persons[i].countryOfResidence + "\n");
        stream.write("Nationality: " + persons[i].nationality + "\n");
        stream.write("Birth Month/Year: " + persons[i].birthMonth + "/" + persons[i].birthYear + "\n");
        
      }
      else if (persons[i].kind === "corporate-entity-person-with-significant-control") {
        stream.write("Name: " + persons[i].name + "\n");
        stream.write("kind: " + persons[i].kind + "\n");
        stream.write("Natures of control: ")
        for (var j = 0; j < persons[i].naturesOfControl.length; j++) {
          stream.write(persons[i].naturesOfControl[j] + ", ");
        }
        stream.write("\n");
        stream.write("Country Registered: " + persons[i].countryRegistered + "\n");
      }
      stream.write("\n");
     
    }

    
    stream.write("\n");

    stream.write("----Officers----" + "\n")
    for (var i = 0; i < officers.length; i++) {

      stream.write("Name: " + officers[i].name + "\n");
      stream.write("Appointed on: " + officers[i].appointedOn + "\n");
      stream.write("Officer Role: " + officers[i].officerRole + "\n");
      stream.write("Occupation: " + officers[i].occupation + "\n");
      stream.write("Nationality: " + officers[i].nationality + "\n");
      stream.write("Country of residence: " + officers[i].countryOfResidence + "\n");
      stream.write("Birth Month/Year: " + officers[i].birthMonth + "/" + officers[i].birthYear + "\n");
      stream.write("\n");
    }

    stream.end(); // Close file
    console.log("Successfully written companies house data to file \n");
    return;
  })
}