# InformationScraper

Given an email address, this program takes the domain portion and attempts to crawl the site, page by page, looking for other email addresses and phone numbers. It also performs a Places lookup using the Google API to attempt to gather various information if the domain is associated with a business, e.g. business address, opening hours etc.

Data is printed to the console and also saved in a directory for each given domain. Inside that directory, 2 files will be generated, one for the crawler service and one for the Google Places API. 

In order to make calls to the Google API, keys_blank.js needs to be renamed to keys.js and the string `"INSERT KEY HERE"` needs to be replaced with a valid Google API key that has been activated for google places. My keys.js has been .gitignored to prevent misuse.

---

## To setup:
```
git clone https://github.com/Aaroncunliffe/InformationScraper.git
cd InformationScraper
npm install
```

```
node main.js aaron@example.com
```

## Dependencies:
* [cheerio](https://github.com/cheeriojs/cheerio)
* [knwl.js](https://github.com/benhmoore/Knwl.js) 
* [request](https://github.com/request/request) 
* [request-promise](https://github.com/request/request-promise) 
* [google-maps-services](https://github.com/googlemaps/google-maps-services-js)

## Learning outcomes:
1. NodeJS use.
2. Google maps API use.
3. Dealing with asynchronous Javascript - used promises.

The screenshots folder contains example output of both the CLI and .txt files produced.
