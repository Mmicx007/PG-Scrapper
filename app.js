const express = require("express");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const {executablePath} = require('puppeteer');
const userAgent = require('user-agents');

const args = [
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-accelerated-2d-canvas",
    "--disable-gpu",
    "--lang=en-US,en"
  ];

puppeteer.use(StealthPlugin());

async function launchBrowser() {
    try {
        const browser = await puppeteer.launch({
            headless: true, 
            executablePath: executablePath(),
            devtools: false,
            ignoreHTTPSErrors: true,
            args,
            ignoreDefaultArgs: ["--disable-extensions"],
        });
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
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
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
                waitUntil: 'networkidle0',
                timeout: 60000
            }),
            buttonElement.click()
        ]);
    } catch (error) {
        console.error('Error performing search:', error);
        throw error;
    }
}

async function scrapeListings(page, stratPage, searchUpto) {
    let hasNextPage = true;
    const listingsArray = [];
    let CheckPage = 1;
    while (hasNextPage) {
        try {
            const errorPage = await page.$(".errorPage");
            const modalSelector = '#multipage-takeover-modal';
            const modalElement = await page.$(modalSelector);
            if (modalElement) {
                const isModalVisible = await page.evaluate((modal) => {
                    const computedStyle = window.getComputedStyle(modal);
                    return computedStyle.getPropertyValue('display') !== 'none';
                }, modalElement);
                if (isModalVisible) {
                    const closeButtonSelector = '.close-button.pgicon.pgicon-cancel';
                    if (closeButtonSelector)
                    {
                        await page.click(closeButtonSelector);
                    }
                }
            }

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
            if(nextButton && (CheckPage <= searchUpto) && searchUpto != 1) {
                await Promise.all([page.waitForTimeout(1000), page.click('li.pagination-next a'),]);
                CheckPage++;
            } else {
                hasNextPage = false;
            }
        } catch (error) {
            console.error(error);
            throw error;
        }

    }
    return listingsArray;
}

async function start(searchText,stratPage, searchUpto) {
    try {

        const BaseURL  = "https://www.propertyguru.com.sg/";
        const NaviURL  = "property-for-sale/"+ stratPage +"?freetext="+ searchText +"&search=true";
        const FinalURL = BaseURL + NaviURL;
        const {browser, page} = await launchBrowser();
        await navigateToURL(page,FinalURL);
        // await performSearch(page, searchText );
        const listingsArray = await scrapeListings(page, stratPage, searchUpto);
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
