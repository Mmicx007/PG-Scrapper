const express = require("express");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const {executablePath} = require('puppeteer');
const userAgent = require('user-agents');

puppeteer.use(StealthPlugin());

async function launchBrowser() {
    try {
        const browser = await puppeteer.launch({headless: false, executablePath: executablePath()});
        const page = await browser.newPage();
        await page.setViewport({width: 1280, height: 800});
        await page.setUserAgent(userAgent.random().toString());
        return {browser, page};
    } catch (error) {
        console.error('Error launching browser:', error);
        throw error;
    }
}

async function navigateToURL(page, url) {
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        const errorPage = await page.$(".errorPage");
        if (errorPage) {
            throw new Error('Error page encountered');
        }
    } catch (error) {
        console.error('Error navigating to URL:', error);
        throw error;
    }
}

async function performSearch(page,SearchText) {
    try {
        const button = await page.$('button > i.pgicon-search');
        await page.focus('.rbt-input-main');
        await page.type('.rbt-input-main', SearchText);
        const buttonElement = (await button.$x('ancestor::button'))[0];
        const [response] = await Promise.all([
            page.waitForNavigation({ 
                waitUntil: 'load', 
                timeout: 60000 
            }),
            buttonElement.click()
        ]);
    } catch (error) {
        console.error('Error performing search:', error);
        throw error;
    }
}

async function scrapeListings(page) {
    let hasNextPage = true;
    const listingsArray = [];

    while (hasNextPage) {
        try {
            const errorPage = await page.$(".errorPage");
            const listingsData = await page.evaluate(() => {
                const listings = document.querySelectorAll('.listing-description');
                    const listingsArray = [];
                    listings.forEach(listing => {
                        try {
                                const data = {};
                                const headerWrapper = listing.querySelector('.header-wrapper');
                                if (headerWrapper) {
                                    data.title = headerWrapper.querySelector('h3 a').innerText;
                                    data.url = headerWrapper.querySelector('h3 a').href;
                                    data.address = headerWrapper.querySelector('[itemprop="streetAddress"]').innerText;
                                }

                                const priceElement = listing.querySelector('.list-price span.price');
                                if (priceElement) {
                                    data.price = priceElement.innerText;
                                }

                                const roomsElement = listing.querySelector('.listing-rooms');
                                if (roomsElement) {
                                    data.beds = roomsElement.querySelector('.bed').innerText;
                                    data.baths = roomsElement.querySelector('.bath').innerText;
                                }

                                const areaElements = listing.querySelectorAll('.listing-floorarea');
                                if (areaElements.length > 1) {
                                    data.area = areaElements[0].innerText.split(' ')[0];
                                    data.pricePerSqft = areaElements[1].innerText.split(' ')[0];
                                }

                                const walkElement = listing.querySelector('.listing-features[data-automation-id="listing-card-features-walk"] li');
                                if (walkElement) {
                                    data.walkDistanceToMRT = walkElement.innerText;
                                }

                                const propertyTypeElements = listing.querySelectorAll('.listing-property-type li span');
                                data.properites = [];
                                for (let i = 0; i < propertyTypeElements.length; i++) {
                                    data.properites.push(propertyTypeElements[i].innerText)
                                }
                                listingsArray.push(data);

                            } catch(error) {
                                console.error(error);
                            }}
                    );
                    return listingsArray;
                }
            );
            listingsArray.push(... listingsData);
            const nextButton = await page.$('li.pagination-next a');
            if(nextButton) {
                await Promise.all([page.waitForTimeout(1000), page.click('li.pagination-next a'),]);
            } else {
                hasNextPage = false;
            }
        } catch (error) {
            console.error(error);
            throw error;
        }

    }
    const filListing = listingsArray.filter(elem => {
        return elem.title.toUpperCase().includes("Bishan Street".toUpperCase()) || elem.address.toUpperCase().includes("Bishan Street".toUpperCase());
    })
    return filListing;
}

async function start(SearchText) {
    try {
        const {browser, page} = await launchBrowser();
        await navigateToURL(page,'https://www.propertyguru.com.sg/');
        await performSearch(page, SearchText );
        const listingsArray = await scrapeListings(page);
        console.log(listingsArray);
        await browser.close();
        return listingsArray;
    } catch (error) {
        console.error('Error in start:', error);
    }
}

module.exports = {
    start,
};
