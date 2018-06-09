
var keys = require("./keys");
var fs = require("fs");

const googleMapsClient = require("@google/maps").createClient({
  key: keys.GOOGLE_PLACES, // key should be in a .gitingored file
  Promise: Promise
});

//------------------------------

module.exports = main;

//------------------------------

var name = "";
var placAddress = "";
var phoneNumber = "";
var internationalPhoneNumber = "";
var openingHours = "";
var website = "";

function main(domain) {

  getPlaceID(domain)
    .then(function (response) {
      console.log("----googleAPI.js----");
      if (response.json.results[0] == undefined) {
        console.log("Error - no google place found for that email address");
        console.log("");
      }
      else {
        var result = response.json.results[0]; // Always assume first result is most relevant, not the best idea, but good enough
        runFullQuery(result.place_id) // RUN query on retrieved placeID
          .then(function (response) {

            // extract all information
            name = response.json.result.name;
            placeAddress = response.json.result.formatted_address;
            phoneNumber = response.json.result.formatted_phone_number;
            internationalPhoneNumber = response.json.result.international_phone_number;
            website = response.json.result.website
            openingHours = response.json.result.opening_hours.weekday_text;

            // print to console and write to file
            printInformationToConsole();
            writeInformationToFile(domain);

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

function printInformationToConsole() {
  console.log("Name: " + name);
  console.log("Address: " + placeAddress);
  console.log("Phone number: " + phoneNumber)
  console.log("International phone number: " + internationalPhoneNumber);
  console.log("Website: " + website);
  console.log("");
  for (var i = 0; i < openingHours.length; i++) {
    console.log(openingHours[i]);
  }
  console.log("");
}

function writeInformationToFile(address) {

  var base = "./information/";
  var dir = "./information/" + address;

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
  var stream = fs.createWriteStream("./information/" + address + "/google-information.txt");

  stream.once("open", function (fd) { // open file

    stream.write("Name: " + name + "\n");
    stream.write("Address: " + placeAddress + "\n");
    stream.write("Phone number: " + phoneNumber + "\n")
    stream.write("International phone number: " + internationalPhoneNumber + "\n");
    stream.write("Website: " + website + "\n");
    stream.write("\n");
    for (var i = 0; i < openingHours.length; i++) {
      stream.write(openingHours[i] + "\n");
    }

    stream.end(); // Close file
  });
}