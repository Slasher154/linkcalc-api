/**
 * Created by thanatv on 11/3/17.
 */

const _ = require('lodash')

class LinkBudget {
    constructor (requestObject) {
        for (var field in requestObject) {
            this[field] = requestObject[field]
        }
        this.init()

    }

    // Prepare parameters for link budget
    init () {

        // If default gateway is selected, add a single gatewway object
        if (this.useDeafultGateway) {
            this.gatewayStations.push({ name: 'defaultGateway' })
        }

        // If finding best transponder is selected, extract unique locations out of remote stations and find the their respective best transponders
        if (this.findBestTransponders) {
            let uniqueLocations = this.extractUniqueLocations()

            // Get the best transponders for each selected satellite
            let locationWithBestTransponders = []
            this.satellites.forEach(satellite => {
                uniqueLocations.forEach(location => {
                    let bestTransponder = this.findBestTransponderFromLocationAndSatellite({ location, satellite })
                    locationWithBestTransponders.push({ location, transponder: bestTransponder })
                })
            })

            // Adding transponders to every remote stations
            this.remoteStations.forEach(station => {
                let bestTransponder = locationWithBestTransponders.find(location => location.name === station.location.name).transponder
                station.transponder = bestTransponder
            })
        } else {
            // Otherwise, combine selected transponders with remote stations into objects
            this.remoteStations.forEach(station => {
                this.transponders.forEach(transponder => {
                    station.transponder = transponder
                })
            })
        }

        // Run the link budget
        this.linkBudgetResults = []
        this.runLinkBudget()
    }

    runLinkBudget () {

        // Start looping remote stations
        this.remoteStations.forEach(station => {

            this.station = station

            // Start looping gateway/hub stations
            this.gatewayStations.forEach(gateway => {

                // Start looping platform
                this.modemsAndMcgs.forEach(modem => {

                    this.modem = modem

                    // Find appropriate gateway
                    this.gateway = this.findGateway(gateway)

                    // Run forward link
                    let forwardLinkResult = this.runForwardLink()

                    // Run return link
                    let returnLinkResult = this.runReturnLink()

                    // Record cases
                    this.linkBudgetResults.push({
                        forwardLink: forwardLinkResult,
                        returnLink: returnLinkResult
                    })
                })
            })

        })
    }

    runForwardLink () {

        let linkResult = {}

        // Find transponder by path
        this.transponder = this.findTransponderByPath(this.station.transponder, 'forward')

        // Find application by path
        this.application = this.findApplicationByPath(this.modem, 'forward')

        // Check if this platform is MCG fixed
        if (!this.modem.findBestMcg) {

            // If yes, set MCGs = all MCG given in the modem application

            // Start looping MCG
            this.application.mcgs.forEach(mcg => {

                // Set MCG
                this.mcg = mcg

                // Check if max contour is selected
                if (this.findMaxCoverage) {

                    // If yes, perform a binary search over a minimum and maximum contour range (running clear sky link)
                    let contourRange = this.findContourRange()
                    let contourRangeArray = _.range(contourRange.min, contourRange.max, 0.1)

                    let minIndex = 0
                    let maxIndex = contourRangeArray.length - 1
                    let currentIndex
                    let currentElement
                    let answer = 0
                    let result

                    while (minIndex <= maxIndex) {
                        currentIndex = (minIndex + maxIndex) / 2 | 0
                        currentElement = contourRangeArray[currentIndex]

                        // Set station relative contour to this value
                        this.station.relativeContour = currentElement
                        result = this.runClearSkyLink()

                        if (result.passed) { // pass
                            minIndex = currentIndex + 1
                           console.log(`${currentElement} passes the condition`)
                            answer = currentElement
                        } else { // not pass
                            maxIndex = currentIndex - 1
                            console.log(`${currentElement} doesn't pass the condition`)
                        }
                    }
                    linkResult.forwardResult.clearSky = result

                }

                // If no, set parameters and then run a clear sky link and record the result
                linkResult.forwardResult.clearSky = this.runClearSkyLink()
            })
        } else {

            // If no, (not fix MCG), set MCGs = all MCG given in the modem application
            // Perform a binary search over a minimum and maximum available MCGs (running clear sky link)
            let minIndex = 0
            let maxIndex = this.application.mcgs.length - 1
            let currentIndex
            let currentElement
            let answer = 0
            let result

            while (minIndex <= maxIndex) {
                currentIndex = (minIndex + maxIndex) / 2 | 0
                currentElement = this.application.mcgs[currentIndex]

                // Set mcg to this value
                this.mcg = currentElement
                result = this.runClearSkyLink()

                if (linkResult.passed) { // pass
                    minIndex = currentIndex + 1
                    console.log(`${currentElement} passes the condition`)
                    answer = currentElement
                } else { // not pass
                    maxIndex = currentIndex - 1
                    console.log(`${currentElement} doesn't pass the condition`)
                }
            }

            linkResult.forwardResult.clearSky = result
        }

        // Run a rain fade link
        linkResult.forwardResult.rainFade = this.runRainFadeLink()

        // Concatenate both clear sky and rain fade link objects and return results
        return linkResult
    }

    runReturnLink () {

        let linkResult = {}

        // Find transponder by path
        this.transponder = this.findTransponderByPath(this.station.transponder, 'return')

        // Find application by path
        this.application = this.findApplicationByPath(this.modem, 'return')

        // Check if this platform is MCG fixed
        if (!this.modem.findBestMcg) {

            // If yes, set MCGs = all MCG given in the modem application

            // Start looping MCG
            this.application.mcgs.forEach(mcg => {

                // Set MCG
                this.mcg = mcg

                // Check if max contour is selected
                if (this.findMaxCoverage) {

                    // If yes, perform a binary search over a minimum and maximum contour range (running clear sky link)
                    let contourRange = this.findContourRange()
                    let contourRangeArray = _.range(contourRange.min, contourRange.max, 0.1)

                    let minIndex = 0
                    let maxIndex = contourRangeArray.length - 1
                    let currentIndex
                    let currentElement
                    let answer = 0
                    let result

                    while (minIndex <= maxIndex) {
                        currentIndex = (minIndex + maxIndex) / 2 | 0
                        currentElement = contourRangeArray[currentIndex]

                        // Set station relative contour to this value
                        this.station.relativeContour = currentElement
                        result = this.runClearSkyLink()

                        if (result.passed) { // pass
                            minIndex = currentIndex + 1
                            console.log(`${currentElement} passes the condition`)
                            answer = currentElement
                        } else { // not pass
                            maxIndex = currentIndex - 1
                            console.log(`${currentElement} doesn't pass the condition`)
                        }
                    }
                    linkResult.returnResult.clearSky = result

                }

                // If no, set parameters and then run a clear sky link and record the result
                linkResult.returnResult.clearSky = this.runClearSkyLink()
            })
        } else {

            // If no, (not fix MCG), set MCGs = all MCG given in the modem application
            // Perform a binary search over a minimum and maximum available MCGs (running clear sky link)
            let minIndex = 0
            let maxIndex = this.application.mcgs.length - 1
            let currentIndex
            let currentElement
            let answer = 0
            let result

            while (minIndex <= maxIndex) {
                currentIndex = (minIndex + maxIndex) / 2 | 0
                currentElement = this.application.mcgs[currentIndex]

                // Set mcg to this value
                this.mcg = currentElement
                result = this.runClearSkyLink()

                if (linkResult.passed) { // pass
                    minIndex = currentIndex + 1
                    console.log(`${currentElement} passes the condition`)
                    answer = currentElement
                } else { // not pass
                    maxIndex = currentIndex - 1
                    console.log(`${currentElement} doesn't pass the condition`)
                }
            }

            linkResult.returnResult.clearSky = result
        }

        // Run a rain fade link
        linkResult.returnResult.rainFade = this.runRainFadeLink()

        // Concatenate both clear sky and rain fade link objects and return results
        return linkResult
    }

    runLinkByPath (path) {

        this.path = path

        let linkResult = {}

        // Find transponder by path
        this.transponder = this.findTransponderByPath(this.station.transponder, path)

        // Find application by path
        this.application = this.findApplicationByPath(this.modem, path)

        // Check if this platform is MCG fixed
        if (!this.modem.findBestMcg) {

            // If yes, set MCGs = all MCG given in the modem application

            // Start looping MCG
            this.application.mcgs.forEach(mcg => {

                // Set MCG
                this.mcg = mcg

                // Check if max contour is selected
                if (this.findMaxCoverage) {

                    // If yes, perform a binary search over a minimum and maximum contour range (running clear sky link)
                    let contourRange = this.findContourRange()
                    let contourRangeArray = _.range(contourRange.min, contourRange.max, 0.1)

                    let minIndex = 0
                    let maxIndex = contourRangeArray.length - 1
                    let currentIndex
                    let currentElement
                    let answer = 0
                    let result

                    while (minIndex <= maxIndex) {
                        currentIndex = (minIndex + maxIndex) / 2 | 0
                        currentElement = contourRangeArray[currentIndex]

                        // Set station relative contour to this value
                        this.station.relativeContour = currentElement
                        result = this.runClearSkyLink()

                        if (result.passed) { // pass
                            minIndex = currentIndex + 1
                            console.log(`${currentElement} passes the condition`)
                            answer = currentElement
                        } else { // not pass
                            maxIndex = currentIndex - 1
                            console.log(`${currentElement} doesn't pass the condition`)
                        }
                    }
                    linkResult[path + 'Result']['clearSky'] = result

                }

                // If no, set parameters and then run a clear sky link and record the result
                linkResult[path + 'Result']['clearSky'] = this.runClearSkyLink()
            })
        } else {

            // If no, (not fix MCG), set MCGs = all MCG given in the modem application
            // Perform a binary search over a minimum and maximum available MCGs (running clear sky link)
            let minIndex = 0
            let maxIndex = this.application.mcgs.length - 1
            let currentIndex
            let currentElement
            let answer = 0
            let result

            while (minIndex <= maxIndex) {
                currentIndex = (minIndex + maxIndex) / 2 | 0
                currentElement = this.application.mcgs[currentIndex]

                // Set mcg to this value
                this.mcg = currentElement
                result = this.runClearSkyLink()

                if (result.passed) { // pass
                    minIndex = currentIndex + 1
                    console.log(`${currentElement} passes the condition`)
                    answer = currentElement
                } else { // not pass
                    maxIndex = currentIndex - 1
                    console.log(`${currentElement} doesn't pass the condition`)
                }
            }

            linkResult[path + 'Result']['clearSky'] = result
        }

        // Set clear sky result to instance of an object so it can get referred in rain fade case
        this.currentClearSkyResult = linkResult[path + 'Result']['clearSky']

        // Run a rain fade link
        linkResult[path + 'Result']['rainFade'] = this.runRainFadeLink()

        // Concatenate both clear sky and rain fade link objects and return results
        return linkResult
    }

    runClearSkyLink () {

        // TODO: Set parameters for clear sky condition such atmospheric

        // Run link and return result
        return this.runLink()
    }

    runRainFadeLink () {

        let rainFadeResult

        // TODO: Set parameters for rain fade condition

        // Check MCG at clear sky result object
        let mcgClearSky = this.currentClearSkyResult.mcg

        // Check if modem has ACM function and dynamic channel function

        // If yes-yes, perform normal search over looping MCG and available symbol rates
        if (this.application.acm && this.application.dynamic_channels) {
            let lowerMcgs = findLowerMcgsThanClearSky(mcgClearSky)
            let lowerBandwidthPool = findLowerBandwidthPool()

            let results = []
            lowerMcgs.forEach(mcg => {
                this.mcg = mcg
                lowerBandwidthPool.forEach(bandwidth => {
                    this.occupiedBandwidth = bandwidth
                    results.push(this.runLink())
                })
            })
            // Filter result with 2 requirements, pass margin and max data rate
            rainFadeResult = _.max(results.find(result => result.passed), item => {
                return item.data_rate;
            })
        }

        // If yes-no, perform binary search over looping MCG
        else if (this.application.acm) {
            let lowerMcgs = findLowerMcgsThanClearSky(mcgClearSky)
            let minIndex = 0
            let maxIndex = lowerMcgs.length - 1
            let currentIndex
            let currentElement
            let answer = 0
            let result

            while (minIndex <= maxIndex) {
                currentIndex = (minIndex + maxIndex) / 2 | 0
                currentElement = lowerMcgs[currentIndex]

                // Set mcg to this value
                this.mcg = currentElement
                result = this.runLink()

                if (result.passed) { // pass
                    minIndex = currentIndex + 1
                    console.log(`${currentElement} passes the condition`)
                    answer = currentElement
                } else { // not pass
                    maxIndex = currentIndex - 1
                    console.log(`${currentElement} doesn't pass the condition`)
                }
            }

            rainFadeResult = result
        } else {

            // If no-no, run link at the same code as clear sky case (there is no 'no-yes' case as dynamic channel always comes with ACM)
            this.mcg = mcgClearSky
            rainFadeResult = this.runLink()

            // If the existing condition still does not pass, perform binary search over link availability to find max total link availability
            let linkAvailabilityRange = _.range(95, 99.5, 0.1)
            let minIndex = 0
            let maxIndex = linkAvailabilityRange.length - 1
            let currentIndex
            let currentElement
            let answer = 0
            let result

            while (minIndex <= maxIndex) {
                currentIndex = (minIndex + maxIndex) / 2 | 0
                currentElement = linkAvailabilityRange[currentIndex]

                // Set uplink or downlink availability to new value (forward link changes downlink avail, return link changes uplink avail)
                this.path === 'forward' ? this.downlinkAvailability = currentElement : this.uplinkAvailability = currentElement
                result = this.runLink()

                if (result.passed) { // pass
                    minIndex = currentIndex + 1
                    console.log(`${currentElement} passes the condition`)
                    answer = currentElement
                } else { // not pass
                    maxIndex = currentIndex - 1
                    console.log(`${currentElement} doesn't pass the condition`)
                }
            }

            rainFadeResult = result
        }

        // Return result
        return rainFadeResult
    }

    runLink () {

        // Seek the occupied bandwidth
        this.seekOccupiedBandwidth()

        // Check if the transponder is operating in FGM or ALC mode
        if (this.transponder.mode === 'FGM') {

            // If FGM, find operating PFD at 100% power utilization

            // If rain fade case, EIRPup = desired level - rain

            // Otherwise, EIRPup = desired
        } else {

            // If ALC, find operating PFD at desired deep-in

            // If rain-fade case, EIRPup = desired level - rain + UPC (but not more than desired)

            // Otherwise, EIRPup = desired
        }

        // Calculate C/N up (need to check max mode)

        // Calculate EIRPdown (need to check max mode)

        // Calculate C/I

        // Calculate C/N Total

        // Calculate link margin and determine pass condition

        // Return result
    }

    extractUniqueLocations () {

    }

    findApplicationByPath () {

    }

    findBestTransponderFromLocationAndSatellite ({ location, satellite }) {
        return {}
    }
    
    fincContourRange () {
        return {
            max: 0,
            min: -15
        }
    }

    findGateway (gateway) {

    }

    findLowerBandwidthPool () {

    }

    findLowerMcgsThanClearSky (mcg) {

    }

    findTransponderByPath () {
    }
    
    // Copied from old program
    seekOccupiedBandwidth (value) {
        
        let app = this.application, bt = this.application.roll_off_factor, unit = this.station.bandwidth.unit, mcg = this.mcg
        
        console.log('Calculate bandwidth from App ' + app.name + " mcg = " + mcg.name + " spec.eff = " + mcg.spectral_efficiency);
        console.log('Bandwidth input = ' + value + " " + unit + " | BT = " + bt);

        // if user input data rate, find the bandwidth from data rate / current mcg ebe
        var sr = 0;
        if (_.contains(["Mbps", "kbps"], unit)) {
            // if Mbps, convert to kbps
            var dr = unit === "Mbps" ? value * 1000 : value;
            sr = dr / mcg.spectral_efficiency; // calculate symbol rate in ksps
        }
        else if (_.contains(["MHz", "kHz"], unit)) {
            // convert to symbol rate in ksps
            var bw = unit === "MHz" ? value * 1000 : value;
            sr = bw / bt;
        }
        else if (_.contains(["Msps", "ksps"], unit)) {
            sr = unit === "Msps" ? value * 1000 : value;
        }
        else {
            console.log("Unit of bandwidth error.");
            return false;
        }
        console.log("Symbol rate = " + sr + " ksps");

        // check if symbol rate is higher than the max symbol rate
        var sr_2 = 0;
        if (_.has(app, 'maximum_symbol_rate') && sr > app.maximum_symbol_rate) {
            console.log('Symbol rate of ' + sr + ' ksps is higher than max symbol rate of this app (' + app.maximum_symbol_rate + ' ksps)');
            sr_2 = app.maximum_symbol_rate;
        }

        // check if symbol rate is lower than the min symbol rate
        else if (_.has(app, 'minimum_symbol_rate') && sr < app.minimum_symbol_rate) {
            console.log('Symbol rate of ' + sr + ' ksps is lower than minimum symbol rate of this app (' + app.minimum_symbol_rate + ' ksps)');
            sr_2 = app.minimum_symbol_rate;
        }

        // check if symbol rate is among the list of available symbol rates in the app
        else {
            // if the app does not contain the symbol rate property or symbol rate array has no elements, it means the symbol can be any value (between min and max)
            if (!(_.has(app, 'symbol_rates')) || app.symbol_rates.length == 0) {
                sr_2 = sr;
            }
            else if (_.contains(app.symbol_rates, sr)) {
                console.log('The app contains symbol rate of ' + sr + " ksps");
                sr_2 = sr;
            }
            else {
                // find the lowest symbol rate available in the app which is higher than that value
                sr_2 = _.min(_.filter(app.symbol_rates, function (num) {
                    return num > sr;
                }));
                console.log('Symbol rate of ' + sr + ' ksps is not in the symbol rate pools of this app, so we find the closest one.')
            }
        }
        console.log("Symbol rate after app limitation = " + sr_2 + " ksps");

        // return the occupied bandwidth in MHz

        // for TOLL, the noise bandwidth to occupied bandwidth will use different formula

        var occ_bw = (sr_2 / 1000) * bt;

        if(app.name == "TOLL"){ // add one channel to get occupied bandwidth
            occ_bw = (sr_2 / 1000) + 3.375;
            console.log('TOLL. Add 1 channel from SR = ' + sr_2 + ' ksps to get bw = ' + occ_bw + ' MHz');
        }

        this.bandwidth = occ_bw;
    }
}




module.exports = LinkBudget