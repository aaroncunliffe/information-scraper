# InformationScraper

Given an email address, this program takes the domain portion and runs 4 operations using that data:

### 1. Website cralwer:  
Attempts to crawl the domain page by page, looking for other email addresses and phone numbers.

### 2. Google Places API:   
performs a Places lookup using the Google API to attempt to gather various information if the domain is associated with a business, e.g. business address, opening hours etc.

### 3. Google News:  
Searches for google news articles about a company. Also uses the Google Places API to retrieve a companies postal town to hopefully narrow down the search, this doesn't guarantee that all articles found will be relevant though, human verification will be required. This module makes use of my fork of [my-google-news](https://github.com/Aaroncunliffe/my-google-news), the original is outdated and does not scrape all required information. 

### 4. Companies House (UK):  
Registrar of companies in the UK, has a public api, find out more information: https://developer.companieshouse.gov.uk/api/docs/index.html
This module performs a search of companies with the company name (also gathered from the Google Places API) and narrows down the search with the Google Places business address field and matches that to the registered address on companies house, once the unique company number has been retrieved, the module retrieves company data, 
persons with significant control over the company, and all appointed officers information.

All information is logged into textfiles inside the information folder. e.g. /information/example.co.uk/...

---

In order to make calls to the Google API and Companies House API, keys_blank.js needs to be renamed to keys.js and the strings `"INSERT KEY HERE"` need to be replaced with valid keys. My keys.js has been .gitignored to prevent misuse.

For companies house the basic auth requires that the original API key have a ':' appended and be base64 encoded. The Program Postman can be used for this.

---

## To setup:
```
git clone https://github.com/Aaroncunliffe/InformationScraper.git
cd InformationScraper
npm install
```
Prepare keys.js before running below command.
```
node main.js aaron@example.com
```

## Dependencies:
* [cheerio](https://github.com/cheeriojs/cheerio)
* [knwl.js](https://github.com/benhmoore/Knwl.js) 
* [request](https://github.com/request/request) 
* [request-promise](https://github.com/request/request-promise) 
* [google-maps-services](https://github.com/googlemaps/google-maps-services-js)
* [AaronCunliffe/my-google-news](https://github.com/Aaroncunliffe/my-google-news) - My own fork with some fixes / additions

## Learning outcomes:
1. NodeJS use.
2. Google maps API use.
3. companies house API.
4. Dealing with asynchronous Javascript - used promises.
