var request = require("request-promise");
var cheerio = require("cheerio");
var Knwl = require("knwl.js"); // had to install from github to get the international phones experimental plugins
var fs = require("fs");

// knwl setup
var knwlInstance = new Knwl("english");
knwlInstance.register("phones", require("knwl.js/experimental_plugins/internationalPhones"));
knwlInstance.register("emails", require("knwl.js/default_plugins/emails"));


var domain = "";
var finalEmails = [];
var finalPhones = [];

var promises = [];

/* 
  Summary:
  Given a domain portion from an email, goes to that website and retrieves all internal page links on the first page
  (links that start with '/' OR contain the domain name). and then crawls each of these pages individually for any relavent information.
  This is inefficient, but, with no default contact-us page for every site, this strategy is more likely to find relavent information.
  Duplicates are removed then logged to console / text file.

  Limitations: 
  - Websites can have anti-scraper measures in place, using a headless browser library like phantomJS or selenium might have more luck
  I just allow the pages to throw an erro that is caught and execution continues.
  - Innefficient
*/

//------------------------------

module.exports = crawler; // export function pointer to crawler

//------------------------------

function crawler(address) {

  domain = "http://www." + address;

  // index request as a promise
  indexScrape().then(function () { // after index request is fetched, promise array built up

    Promise.all(promises).then(function () {

      finalEmails = removeDuplicates("emails", finalEmails);
      finalPhones = removeDuplicates("phones", finalPhones);

      printInformationToConsole();
      writeInformationToFile(address);
    })

  });

}

/*
Scrapes the root page of any domain for href tags
*/
function indexScrape() {

  return request(domain, function (error, response, html) {

    $ = cheerio.load(html);
    links = $('a'); //jquery get links

    $(links).each(function (i, link) {
      if ($(link).attr('href') != undefined) {

        // Internal pages
        if ($(link).attr('href')[0] === '/') {  // links without the domain
          promises.push(scrapePage(domain + $(link).attr('href')));
        }
        if ($(link).attr('href').includes(domain)) { // links with domain
          promises.push(scrapePage($(link).attr('href')));
        }
        // external pages
        // if($(link).attr('href').startsWith("http")) // external pages
        // {
        //   console.log($(link).attr('href'));
        // }

      }
    });
  }).catch(function (err) {
    console.log("Error scraping page (index): " + err);
  });
}

/*
Scrapes data from a given url
@param url to load and scrape
@returns promise that is pushed to the promise array
*/
function scrapePage(urlString) {

  return request(urlString, function (error, response, html) {
    if (!error && response.statusCode == 200) {
      knwlInstance.init(html);

      var emails = knwlInstance.get('emails');
      var phones = knwlInstance.get('phones');

      for (var i = 0; i < emails.length; i++) {
        finalEmails.push(emails[i]);
      }

      for (var i = 0; i < phones.length; i++) {
        finalPhones.push(phones[i]);
      }
    }

  }).then(function (htmlString) {

  }).catch(function (err) {
    console.log("Error scraping page: " + urlString); // This can be thrown a lot with timeouts
  });
}

/*
Removes duplicate values from an array that knwl finds
@param string type of array. e.g. emails or phones.
@param the array to remove duplicates from
@returns a new array containing unique values OR an empty array if a non supported type is returned
NOTE: does not strip away unnecessary information e.g. email preview, or phone location
*/
function removeDuplicates(type, array) {
  var searchVal = "";

  switch (type) {
    case "emails":
      searchVal = "address";
      break;
    case "phones":
      searchVal = "number";
      break;
    default: // Not a supported type
      return [];
  }

  var newArray = [];

  // process duplicates, Slow: O(n^2) complexity.
  for (var i = 0; i < array.length; i++) {
    var value = array[i];
    if (!includes(value, searchVal, newArray)) {
      newArray.push(value);
    }
  }
  return newArray;
}

/*
A deep structure check of whether an array already contains a specific value
@param value to check
@param the string type to check for
@returns boolean
*/
function includes(value, type, array) {
  for (var i = 0; i < array.length; i++) {
    if (array[i][type] === value[type]) {
      return true;
    }
  }
  return false;
}


function printInformationToConsole() {
  console.log("----Crawler.js----");
  console.log("Emails:");
  for (var i = 0; i < finalEmails.length; i++) {
    console.log(finalEmails[i]['address']);
  }

  console.log("");

  console.log("Phone Numbers:");
  for (var i = 0; i < finalPhones.length; i++) {
    // Remove numbers that are too short (false detections in knwl)
    if (finalPhones[i]['number'].length > 8 && finalPhones[i]['number'].length < 15) {
      console.log(finalPhones[i]['number']);
    }
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
  var stream = fs.createWriteStream("./information/" + address + "/crawled-information.txt");

  stream.once('open', function (fd) { // open file

    stream.write("Emails:" + "\n")
    for (var i = 0; i < finalEmails.length; i++) {
      stream.write(finalEmails[i]['address'] + "\n")
    }

    stream.write("\n");

    stream.write("Phone Numbers:" + "\n");
    for (var i = 0; i < finalPhones.length; i++) {

      // Remove numbers that are too short or long (false detections from knwl)
      if (finalPhones[i]['number'].length > 8 && finalPhones[i]['number'].length < 15) {

        stream.write(finalPhones[i]['number'] + "\n");
      }
    }

    stream.end(); // Close file
  });
}