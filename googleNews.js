
var myGoogleNews = require('my-google-news');
var keys = require("./keys");
var fs = require("fs");

const googleMapsClient = require("@google/maps").createClient({
  key: keys.GOOGLE_PLACES, // key should be in a .gitingored file
  Promise: Promise
});

/* 
  Summary:
  Uses google places API to find a companies postal town, uses this and the company domain name to hopefully narrow down the search
  to relavent articles only from that company, in that city.

  Limitations: Can sometimes retrieve completely irrelevant articles, this will need human verification to identify their relavence.

*/

//------------------------------

module.exports = main; // export function pointer to crawler

//------------------------------

var googleQuery = ""; //search Query
var companyName = "";
var City = "";

myGoogleNews.resultsPerPage = 5; // max 100

/* 
* Similarly to googleAPI.js, this function fetches the company information using the Google Places API
* and takes this information to run a google news search - google news scrapes various news sites for articles
* the assumption is made that COMPANYNAME + CITY will make a good enough query string to return relevant articles
* this is not always the case and may return some completely irrelevant articles, further human verification is required.
*/
function main(domain) {

  getPlaceID(domain)
    .then(function (response) {
      
      if (response.json.results[0] == undefined) {
        console.log("----googleNews.js----");
        console.log("Error - no google place found for that email address");
        console.log("");
      }
      else {
        var result = response.json.results[0]; // Always assume first result is most relevant, not the best idea, but good enough
        runFullQuery(result.place_id) // RUN query on retrieved placeID
          .then(function (response) {

            companyName = response.json.result.name;

            // Retrieve postal town to hopefully improve the search drastically.
            var address_components = response.json.result.address_components;
            for (var i = 0; i < address_components.length; i++) {
              if (address_components[i].types[0].includes("postal_town")) {
                city = address_components[i].long_name;
              }
            }

            googleQuery = companyName + " " + city;

            myGoogleNews(googleQuery, function (err, res) {
              if (err) console.error(err)
              console.log("----googleNews.js----");
              console.log("Query URL: " + res.url);
              console.log("too much information to print to console. See associated google-news.txt")
              console.log("");

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

              var stream = fs.createWriteStream("./information/" + domain + "/google-news.txt");

              stream.once("open", function (fd) { // open file
                stream.write("Query URL: " + res.url + "\n\n");

                res.links.forEach(function (item) {
                  stream.write("Source: " + item.source + "\n");
                  stream.write("Date: " + item.date + "\n");
                  stream.write("Title: " + item.title + "\n");
                  stream.write("Description: " + item.description + "\n");
                  stream.write("Link: " + item.href + "\n");
                  stream.write("\n");
                });

                stream.end(); // Close file
              });

            });


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
