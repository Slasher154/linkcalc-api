/**
 * Created by thanatv on 11/3/17.
 */

const _ = require('lodash')
const Antenna = require('./antenna')
const Atmospheric = require('./atmospheric')
const Bandwidth = require('./bandwidth')
const Buc = require('./buc')
const GatewayStation = require('./gatewayStation')
const Location = require('./location')
const Modem = require('./modem')
const RemoteStation = require('./remoteStation')
const Satellite = require('./satellite')
const Station = require('./station')
const Transponder = require('./transponder')
const Utils = require('./utils')

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
            let uniqueLocations = this.extractUniqueRemoteLocations()

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

            this.remoteStation = new RemoteStation(station)

            // Start looping gateway/hub stations
            this.gatewayStations.forEach(gateway => {

                // Start looping platform
                this.modemsAndMcgs.forEach(modem => {

                    this.modem = new Modem(modem)

                    // Find appropriate gateway
                    this.gateway = new GatewayStation(this.findGateway(gateway))

                    // Run forward link
                    let forwardLinkResult = this.runLinkByPath('forward')

                    // Run return link
                    let returnLinkResult = this.runLinkByPath('return')

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
        
        // Find and set satellite
        this.satellite = new Satellite(this.findSatellite(this.transponder))

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

        let linkResult = {}

        // Set uplink and downlink station
        if (path === 'forward') {
            this.uplinkStation = this.gateway
            this.downlinkStation = this.remoteStation
        } else if (path === 'return') {
            this.uplinkStation = this.remoteStation
            this.downlinkStation = this.gateway
        } else {
            console.log(`${path} is not a valid path`)
        }

        this.path = path

        // Set default link availability and site diversity
        this.uplinkAvailability = 99.5
        this.downlinkAvailability = 99.5

        // Find transponder by path
        this.transponder = new Transponder(this.findTransponderByPath(this.station.transponder, path))

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
        this.condition = 'clear'
        this.requiredMargin = this.application.link_margin

        // Run link and return result
        return this.runLink()
    }

    runRainFadeLink () {

        this.condition = 'rain'
        this.requiredMargin = 0

        let rainFadeResult

        // TODO: Set parameters for rain fade condition

        // Check MCG at clear sky result object
        let mcgClearSky = this.currentClearSkyResult.mcg

        // Check if modem has ACM function and dynamic channel function

        // If yes-yes, perform normal search over looping MCG and available symbol rates
        if (this.application.acm && this.application.dynamic_channels) {
            let lowerMcgs = this.findLowerMcgsThanClearSky(mcgClearSky)
            let lowerBandwidthPool = this.findLowerBandwidthPool()

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
            let lowerMcgs = this.findLowerMcgsThanClearSky(mcgClearSky)
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

        let result = {}
        this.overusedPower = 0

        // Seek the occupied bandwidth
        this.seekOccupiedBandwidth()
        
        // Setup parameters
        let orbitalSlot = this.satellite.orbitalSlot
        let skb = this.satellite.skb
        let noiseBandwidth = this.occupiedBandwidth / this.application.roll_off_factor
        let transponder = this.transponder
        let uplinkStation = this.uplinkStation
        let downlinkStation = this.downlinkStation

        let numCarriersInChannel = 10 * Utils.log10(transponder.bandwidth / this.occupiedBandwidth); // number of carriers in dB

        // ---------------------------------- Uplink ---------------------------------------------

        // Setup variables
        let uplinkFrequency = transponder.uplink_cf;
        let uplinkSlantRange = Utils.slantRange(uplinkStation.location, orbitalSlot);
        // let uplink_elevation_angle = elevationAngle(uplink_station.location, orbitalSlot);
        let uplinkXpolLoss = Utils.xpolLoss(), uplink_pointingLoss = Utils.pointingLoss(uplinkFrequency, uplinkStation.antenna.size, skb);
        let uplinkAtmLoss = Atmospheric.calculateLoss({
            condition: this.condition,
            location: uplinkStation.location,
            orbitalSlot: orbitalSlot,
            freq: uplinkFrequency,
            polarization: transponder.uplink_pol,
            diameter: uplinkStation.antenna.size,
            availability: this.uplinkAvailability
        });
        let uplinkOtherLoss = uplinkXpolLoss + uplink_pointingLoss;
        let uplinkSpreadingLoss = Utils.spreadingLoss(uplinkSlantRange);
        let uplinkContour = uplinkStation.contour;

        let gainVariation = 0;
        let gainVariationDiff = 0;

        let channelPfd, channelDeepin

        // For IPSTAR satellite, applies gain variation
        if(this.satellite.name == "IPSTAR" && _.includes(["return"],transponder.type)){
            if(_.includes(["328","514","608"],transponder.uplink_beam)){ // shape beam
                gainVariation = -0.0015 * Math.pow(uplinkContour,3) - 0.0163 * Math.pow(uplinkContour,2) + 0.1827 * uplinkContour - 0.1737;
            }
            else{
                gainVariation = -0.0019 * Math.pow(uplinkContour,2) + 0.2085 * uplinkContour - 0.5026;
            }
            gainVariationDiff = gainVariation > -1.4 ? 0 : 1.4 + gainVariation;
        }

        let uplinkGt = transponder.gt_peak + uplinkContour + gainVariationDiff;

        let operatingPfd = 0, operatingPfdPerCarrier = 0, eirpUp = 0, carrierPfd = 0, carrierOutputBackoff = 0;

        // If channel is FGM, find operating PFD at 100% utilization

        if (transponder.mode === 'FGM') {

            // Get the backoff settings (IBO, OBO, Intermod) from the database based on the default number of carriers ("One","Two","Multi") set in the database
            let numCarriers = transponder.current_num_carriers;
            let backoffSettings = transponder.backoff_settings.find(s => s.num_carriers === numCarriers);

            // SFD in the database is the -X value of -X-G/T (derived from -(X+G/T)
            // Operating PFD = -(X + G/T) - (Atten.Range - defaultAtten) + TransponderIBO - Backoff from bandwidth
            operatingPfd = transponder.sfd - uplinkGt - (transponder.atten_range - transponder.default_atten);
            operatingPfdPerCarrier = operatingPfd + backoffSettings.ibo - numCarriersInChannel;

            // Derive EIRP up (at ground station) needed to compensate spreading loss, pointing, xpol and atmospheric loss
            eirpUp = operatingPfdPerCarrier + uplinkSpreadingLoss + uplinkOtherLoss + uplinkAtmLoss

            // Apply overused power (for normal case, overused power = 0). It will be more than 0 when we're goal seeking
            // the amount of power-utilization to pass the margin
            eirpUp += this.overusedPower;

            // check if it's rain fade case and uplink station hpa has UPC (such as gateways), increase EIRP up by that UPC
            if (this.condition === "rain" && _.has(uplinkStation.hpa, 'upc')) {
                eirpUp += uplinkStation.hpa.upc;

            }

            // Check if the uplink HPA is BUC type. If yes, use the uplink power of that BUC (use 100% of BUC power instead of show the result of desired EIRP level)
            if (_.has(uplinkStation.hpa, 'category') && uplinkStation.hpa.category.toLowerCase() == 'buc') {
                // check if eirp of this buc & antenna can reach the desired level
                let eirpUpFromBuc = this.remoteStation.eirpUplink(uplinkStation.hpa, uplinkStation.antenna, uplinkFrequency);
                if (eirpUp > eirpUpFromBuc) {
                    eirpUp = eirpUpFromBuc;
                }
            }

            // Find carrier PFD. This may not equal to operating pfd in case of overused power
            carrierPfd = eirpUp - uplinkSpreadingLoss - uplinkOtherLoss - uplinkAtmLoss;

            // Find carrier output backoff = transponder obo + (carrier input backoff)
            //carrier_output_backoff = backoff_settings.obo + (carrier_pfd - operating_sfd);
            let opPfd = operatingPfd + backoffSettings.ibo;

            // if PFD of carrier is higher than operating PFD per transponder (such as too much overused)
            // return transponder obo (maximum backoff)

            if (carrierPfd > opPfd) {
                carrierOutputBackoff = backoffSettings.obo;
            }
            else {
                carrierOutputBackoff = backoffSettings.obo + (carrierPfd - opPfd);
            }

            _.assign(result, {
                channel_input_backoff: backoffSettings.ibo,
                channel_output_backoff: backoffSettings.obo
            })

        }

        // If channel is ALC, find operating PFD at desired deep-in
        else if (transponder.mode === 'ALC') {

            // Operating SFD is equal to SFD at uplink location (max)
            operatingPfd = transponder.sfd - uplinkGt;

            // For IPSTAR FWD Link, the data is stored in format fixed gateway EIRP Up
            if (_.has(transponder, 'eirp_up_channel')) {
                eirpUp = transponder.eirp_up_channel - numCarriersInChannel;
                operatingPfdPerCarrier = eirpUp - uplinkSpreadingLoss - uplinkOtherLoss;
            }

            // For other ALC transponders, the data is stored in desired deep-in value
            // so, we find PFD at designed deepin first, then derive for EIRP up
            // the derived EIRP up will need to compensate spreading loss, pointing, xpol and atmoshperic loss
            else {
                operatingPfdPerCarrier = operatingPfd - transponder.dynamic_range + transponder.designed_deepin - numCarriersInChannel;
                eirpUp = operatingPfdPerCarrier + uplinkSpreadingLoss + uplinkOtherLoss + uplinkAtmLoss;
            }

            // check if it's rain fade case and uplink station hpa has UPC (such as gateways), increase EIRP up by that UPC
            if (this.condition === "rain" && _.has(uplinkStation.hpa, 'upc')) {
                eirpUp += uplinkStation.hpa.upc;
            }

            // Apply overused power (for normal case, overused power = 0). It will be more than 0 when we're goal seeking
            // the amount of power-utilization to pass the margin
            eirpUp += this.overusedPower;

            // Check if the uplink HPA is BUC type. If yes, use the uplink power of that BUC (use 100% of BUC power instead of show the result of desired EIRP level)
            if (_.has(uplinkStation.hpa, 'category') && uplinkStation.hpa.category.toLowerCase() == 'buc') {
                console.log("This is BUC.")
                // check if eirp of this buc & antenna can reach the desired level
                let eirpUpFromBuc = uplinkStation.eirpUplink(uplinkFrequency);

                if (eirpUp > eirpUpFromBuc) {
                    console.log("EIRP Up of " + eirpUp + " dBW is more than EIRP up from BUC which is " + eirpUpFromBuc + " dBW");
                    eirpUp = eirpUpFromBuc;
                }
                else{
                    console.log("EIRP Up of " + eirpUp + " dBW is less than EIRP up from BUC which is " + eirpUpFromBuc + " dBW");
                }
            }
            else{
                console.log("This is not a BUC.")
            }

            // Find carrier PFD. This may not equal to operating pfd in case of overused power or the BUC power is not enough to get to designed point
            carrierPfd = eirpUp - uplinkSpreadingLoss - uplinkOtherLoss - uplinkAtmLoss;
            console.log('Uplink Spreading Loss = ' + uplinkSpreadingLoss + ' dB');
            console.log('Uplink Other Loss = ' + uplinkOtherLoss + ' dB');


            // For ALC transponders, assume the transponder is full-loaded (always reach deep-in)
            // Find deep-in per channel at full-load
            channelPfd = carrierPfd + numCarriersInChannel;
            channelDeepin = channelPfd - (operatingPfd - transponder.dynamic_range);

            // set carrier output backoff to the OBO at backoff settings based on current load
            // normally for Conventional Ku-ALC is single carrier and IPSTAR is multi carrier
            carrierOutputBackoff = transponder.backoff_settings.find(s => s.num_carriers === transponder.current_num_carriers).obo;

            // If the pfd not reach deep-in, output backoff is increased to that amount out of deepin
            carrierOutputBackoff += channelDeepin > 0 ? 0 : channelDeepin;
            carrierOutputBackoff -= numCarriersInChannel;

            _.assign(result, {
                channel_output_backoff: transponder.backoff_settings.find(s => s.num_carriers === transponder.current_num_carriers).obo,
                channel_deepin: channelDeepin.toFixed(2)
            });

        }

        else {
            this.logError("Transponder mode is not FGM or ALC.");
            return false;
        }

        // Calculate required HPA power
        let operatingPowerAtHpaOutput = eirpUp - uplinkStation.antenna.txGain(uplinkFrequency);
        this.logTitle('HPA IFL = ' + uplinkStation.hpa.ifl + ' HPA OBO = ' + uplinkStation.hpa.obo + ' dB');
        this.logTitle('OP Power = ' + operatingPowerAtHpaOutput);
        let operatingHpaPower = Math.pow(10, (operatingPowerAtHpaOutput + uplinkStation.hpa.ifl) / 10);

        // Calculate C/N Uplink

        let eirpUpAtSatellite = eirpUp - uplinkOtherLoss - uplinkAtmLoss;
        let uplinkPathLoss = Utils.pathLoss(uplinkSlantRange, uplinkFrequency);
        let cnUplink = Utils.carrierOverNoise(eirpUpAtSatellite, uplinkGt, uplinkPathLoss, noiseBandwidth);

        console.log('-------Power optimization---------');
        console.log('Operating SFD ' + operatingPfd + ' dBW/m^2');
        console.log('Operating PFD ' + operatingPfdPerCarrier + ' dBW/m^2');
        console.log('Channel PFD ' + channelPfd + ' dBW/m^2');
        console.log('Carrier OBO ' + carrierOutputBackoff + ' dB');
        console.log('Carrier PFD ' + carrierPfd + ' dBW/m^2');
        console.log('Channel deepin ' + channelDeepin + ' dB');

        console.log('----Uplink-----');
        console.log('Condition: ' + this.condition);
        console.log('Atmoshperic Loss: ' + uplinkAtmLoss + " dB");
        console.log('EIRP UP ' + eirpUp + ' dBW');
        console.log('G/T ' + uplinkGt + ' dB/K');
        console.log('Path Loss: ' + uplinkPathLoss + ' dB');
        console.log('Noise BW: ' + noiseBandwidth + ' dB');
        console.log('C/N uplink ' + cnUplink + ' dB');

        // ---------------------------------- Downlink ---------------------------------------------

        // Setup variables
        let downlinkFrequency = transponder.downlink_cf;
        let downlinkSlantRange = Utils.slantRange(downlinkStation.location, orbitalSlot);
        let downlinkXpolLoss = Utils.xpolLoss(), downlinkPointingLoss = Utils.pointingLoss(downlinkFrequency, downlinkStation.antenna.size, skb);
        let downlinkAtmLoss = Atmospheric.calculateLoss({
            condition: this.condition,
            location: downlinkStation.location,
            orbitalSlot: orbitalSlot,
            freq: downlinkFrequency,
            diameter: downlinkStation.antenna.size,
            polarization: transponder.downlink_pol,
            availability: this.downlinkAvailability
        });
        let downlinkOtherLoss = downlinkXpolLoss + downlinkPointingLoss;
        let downlinkContour = downlinkStation.contour;

        // Find saturated EIRP at location for debug purpose (no backoff per carrier)
        let saturatedEirpDownAtLocation = transponder.saturated_eirp_peak + downlinkContour;

        // For IPSTAR satellite, applies gain variation
        if(satellite.name == "IPSTAR" && _.includes(["forward","broadcast"],transponder.type)){
            if(_.includes(["328","514","608"],transponder.downlink_beam)){ // shape beam
                gainVariation = -0.0022 * Math.pow(downlinkContour,3) - 0.0383 * Math.pow(downlinkContour,2) - 0.0196 * downlinkContour - 0.2043;
            }
            else{
                gainVariation = -0.0006 * Math.pow(downlinkContour,2) + 0.1999 * downlinkContour - 0.4185;
            }
            gainVariationDiff = gainVariation > -1.1 ? 0 : 1.1 + gainVariation;
        }

        // Find driven EIRP at location = Saturated EIRP at peak + carrier OBO + Gain Variation + downlink relative contour
        let drivenEirpDownAtLocation = transponder.saturated_eirp_peak + carrierOutputBackoff + downlinkContour + gainVariationDiff;
        console.log('Driven EIRP at loc = ' + drivenEirpDownAtLocation);

        // Find EIRP Down at location = Saturated EIRP at peak + carrier OBO + downlink relative contour + other losses (pointing, xpol) + atm loss
        let carrierEirpDownAtLocation = transponder.saturated_eirp_peak + carrierOutputBackoff + downlinkContour + gainVariationDiff - downlinkOtherLoss - downlinkAtmLoss;

        // Find G/T of receive antenna
        let antGt = downlinkStation.gt(downlinkFrequency, downlinkAtmLoss, this.condition)
        
        // Calculate C/N Downlink
        let downlinkPathLoss = Utils.pathLoss(downlinkSlantRange, downlinkFrequency);
        let cnDownlink = Utils.carrierOverNoise(carrierEirpDownAtLocation, antGt, downlinkPathLoss, noiseBandwidth);

        console.log('------Downlink-----');
        console.log('Condition: ' + this.condition);
        console.log('Pointing loss = ' + downlinkPointingLoss + ' dB , Xpol loss = ' + downlinkXpolLoss + ' dB');
        console.log('Atmoshperic Loss: ' + downlinkAtmLoss + " dB");
        console.log('EIRP Down: ' + carrierEirpDownAtLocation + ' dBW');
        console.log('G/T ' + antGt + ' dB/K');
        console.log('Path Loss ' + downlinkPathLoss + ' dB');
        console.log('Noise BW ' + noiseBandwidth + ' dB');
        console.log('C/N Downlink ' + cnDownlink + ' dB');

        // ---------------------------------- Interferences ---------------------------------------------

        // -------------------------------Uplink Interferences ---------------------------------------------

        // C/I Intermod from HPA, C/I Adjacent satellite
        // If uplink HPA, do not have C/I intermod specified, assume it is 25
        let ciUplinkIntermod = _.has(uplinkStation.hpa, 'intermod') ? uplinkStation.hpa.intermod : 50;

        // If the HPA has data for rain_fade use that value. (for IPSTAR gateways, this value will become 19 dB at rain fade.
        if(this.condition == "rain" && _.has(uplinkStation.hpa, 'intermod_rain')){
            ciUplinkIntermod = uplinkStation.hpa.intermod_rain;
        }

        // Uplink adjacent satellite interferences
        let ciUplinkSatelliteObject = this.ciAdjacentSatellite({
            path: "uplink",
            channel: transponder,
            interference_channels: [],
            eirp_density: eirpUp - 10 * Utils.log10(this.occupiedBandwidth * Math.pow(10, 6)),
            location: uplinkStation.location,
            diameter: uplinkStation.antenna.size,
            orbitalSlot: orbitalSlot
        });
        let ciUplinkAdjacentSatellite = ciUplinkSatelliteObject.ci;

        // Uplink cross-polarization interferences
        let ciUplinkXpol = 30; // default, assume the antenna points correctly

        // Uplink cross cells interferences
        let ciUplinkXCells = this.ciCrossCells(transponder, "uplink", uplinkStation.location);

        // -------------------------------Downlink Interferences ---------------------------------------------

        // Downlink adjacent satellite interferences
        let downlink_adj_sat_interferences = {}
        let ciDownlinkAdjacentSatelliteObject = this.ciCrossCells({
            path: "downlink",
            channel: transponder,
            interference_channels: downlink_adj_sat_interferences,
            eirp_density: drivenEirpDownAtLocation - 10 * Utils.log10(this.occupiedBandwidth * Math.pow(10, 6)), // use driven eirp to find C/I
            location: downlinkStation.location,
            diameter: downlinkStation.antenna.size,
            orbitalSlot: orbitalSlot
        });

        // Find the start frequency, stop frequency and bandwidth of this interference range and add it to the C/I downlink object

        let ciDownlinkAdjacentSatellite = ciDownlinkAdjacentSatelliteObject.ci;

        // C/I Intermod from satellite
        let ciDownlinkIntermod = 20; // default

        // If the channel has the backoff settings property, use that value
        if (_.has(transponder, 'backoff_settings')) {
            ciDownlinkIntermod = transponder.backoff_settings.find(s => s.num_carriers === transponder.current_num_carriers).intermod
        }

        // Downlink cross-polarization interferences
        let ciDownlinkXpol = 30; // default, assume the antenna points correctly

        // Downlink cross cells interferences
        let ciDownlinkXcells = this.ciCrossCells(transponder, "downlink", downlinkStation.location);

        // Total C/I uplink
        let ciUplink = Utils.cnOperation(ciUplinkIntermod, ciUplinkAdjacentSatellite, ciUplinkXpol, ciUplinkXCells);

        // Total C/I downlink
        let ciDownlink = Utils.cnOperation(ciDownlinkIntermod, ciDownlinkAdjacentSatellite, ciDownlinkXpol, ciDownlinkXcells);

        console.log('------Interferences------');
        console.log('C/I Up X-pol = ' + ciUplinkXpol);
        console.log('C/I Up Intermod = ' + ciUplinkIntermod);
        console.log('C/I Up Adj. Sat = ' + ciUplinkAdjacentSatellite);
        console.log('C/I Up Adj. Cells = ' + ciUplinkXCells);
        console.log('C/I Down X-pol = ' + ciDownlinkXpol);
        console.log('C/I Down Intermod = ' + ciDownlinkIntermod);
        console.log('C/I Down Adj. Sat = ' + ciDownlinkAdjacentSatellite);
        console.log('C/I Down Cross Cells = ' + ciDownlinkXcells);

        // ---------------------------------- C/N Total ---------------------------------------------

        let cnTotal = Utils.cnOperation(cnUplink, cnDownlink, ciUplink, ciDownlink);

        // If this is TOLL platform, include warble loss
        // if(application.name == "TOLL"){
        //     let numChannels = symbolRate(bandwidth, application) / 3.375;
        //     let warbleLoss = 10 * log10((Math.pow(10,2.2/10) + numChannels - 1) / numChannels);
        //     console.log('This is TOLL. Warble loss = ' + warbleLoss + ' dB');
        //     console.log('C/N Total before warble loss = ' + cnTotal + ' dB');
        //     cnTotal -= warbleLoss;
        //     _.assign(result, {warble_loss: warbleLoss});
        // }

        let linkAvailability = Utils.totalAvailability(this.uplinkAvailability, uplinkStation.site_diversity, this.downlinkAvailability, downlinkStation.site_diversity);
        let linkMargin = cnTotal - this.mcg.es_no;
        let pass = linkMargin > this.requiredMargin;

        console.log('-------Total---------');
        console.log('C/N Total: ' + cnTotal + ' dB');
        console.log('Link margin ' + linkMargin + ' dB');
        console.log('Pass? ' + pass);
        console.log('Total link availability: ' + linkAvailability);

        // ---------------------------------- Data Rate ---------------------------------------------

        let dataRate = Utils.symbolRate(this.occupiedBandwidth, this.application) * mcg.spectral_efficiency;

        // For TOLL, data_rate is a little complicated....
        if(this.application.name == "TOLL"){
            console.log('Find data rate for TOLL...');
            let bit_rate_channel_0 = 0;
            // if use code higher than QPSK 835, the bit rate channel 0 will be at most QPSK 835
            if(mcg.spectral_efficiency > 1.67){
                bit_rate_channel_0 = _.where(application.mcgs,{name:"QPSK835"})[0].bit_rate_per_slot;
            }
            else{
                bit_rate_channel_0 = mcg.bit_rate_per_slot;
            }
            console.log("Bit rate channel 0 = " + bit_rate_channel_0);

            let num_channels = Utils.symbolRate(bandwidth, application) / 3.375;
            console.log('Num of channels = ' + num_channels);

            dataRate = ((num_channels - 1) * 252 * mcg.bit_rate_per_slot + 250 * bit_rate_channel_0) / 1000;

            let data_rate_ipstar_channel = dataRate / num_channels;
            _.assign(result,{data_rate_ipstar_channel: data_rate_ipstar_channel.toFixed(2)});
        }

        if(this.application.name == "STAR"){
            console.log('Find data rate for STAR....');
            // round down the normal data rate (from symbol rate x MBE) value to predefined values
            let bit_rates_without_header = [0,0.1168,0.1603,0.2513,0.3205,0.5026,0.6411,1.0052,1.2821,2.0105,2.5642,4.021];
            let temp = 0;
            _.each(bit_rates_without_header, function(item){
                if(item < dataRate && item > temp){
                    temp = item;
                }
            })
            dataRate = temp;
        }


        // ---------------------------------- Power utilization -------------------------------------

        // Calculate power utilization percentage by comparing real carrier PFD and operating PFD per carrier
        // PFD diff is positive if overused
        let pfdDiff = carrierPfd - operatingPfdPerCarrier;
        let powerUtilPercent = 100 * Math.pow(10, pfdDiff / 10);

        // Calculate guard band in percent for this carrier
        // Conventional result needs this as Sales team do not accept the bandwidth in decimal
        let roundupBandwidth = Math.ceil(this.occupiedBandwidth);
        let guardband = ((roundupBandwidth - this.occupiedBandwidth) * 100 / this.occupiedBandwidth).toFixed(2);


        // Store the letiables in the result object.
        // We will use this object to represent all parameters in the result.

        _.assign(result, {
            // satellite
            channel: transponder.name,
            operating_mode: transponder.mode,
            operating_sfd: operatingPfd.toFixed(2),
            operating_pfd_per_carrier: operatingPfdPerCarrier.toFixed(2),
            carrier_pfd: carrierPfd.toFixed(2),
            carrier_obo: carrierOutputBackoff.toFixed(2),
            gain_variation: gainVariation.toFixed(2),
            // uplink
            uplink_antenna: uplinkStation.antenna,
            uplink_hpa: uplinkStation.hpa,
            uplink_pointing_loss: uplink_pointingLoss.toFixed(2),
            uplink_xpol_loss: uplinkXpolLoss.toFixed(2),
            uplink_atmLoss: uplinkAtmLoss.toFixed(2),
            uplink_eirp: eirpUp.toFixed(2),
            uplink_gt: uplinkGt.toFixed(2),
            uplink_path_loss: uplinkPathLoss.toFixed(2),
            uplink_condition: this.condition,
            uplink_availability: this.uplinkAvailability.toFixed(2),
            uplink_location: uplinkStation.location,
            operating_hpa_power: operatingHpaPower.toFixed(2),
            cn_uplink: cnUplink.toFixed(2),
            // downlink
            downlink_antenna: downlinkStation.antenna,
            // Following 3 parameters are aAvailable only if G/T is not specified in the antenna spec
            antenna_temp: _.has(downlinkStation.antenna, 'gt') ? 'N/A' : Antenna.temp(downlinkAtmLoss, this.condition).toFixed(2),
            system_temp: _.has(downlinkStation.antenna, 'gt') ? 'N/A' : Station.systemTemp(Antenna.temp(downlinkAtmLoss, this.condition).toFixed(2)).toFixed(2),
            ant_gain: _.has(downlinkStation.antenna, 'gt') ? 'N/A' : downlinkStation.antenna.rxGain(downlinkFrequency).toFixed(2),
            downlink_pointing_loss: downlinkPointingLoss.toFixed(2),
            downlink_xpol_loss: downlinkXpolLoss.toFixed(2),
            downlink_atmLoss: downlinkAtmLoss.toFixed(2),
            downlink_eirp: carrierEirpDownAtLocation.toFixed(2),
            saturated_eirp_at_loc: saturatedEirpDownAtLocation.toFixed(2),
            downlink_gt: antGt.toFixed(2),
            downlink_path_loss: downlinkPathLoss.toFixed(2),
            downlink_condition: this.condition,
            downlink_availability: this.downlinkAvailability.toFixed(2),
            downlink_location: downlinkStation.location,
            cn_downlink: cnDownlink.toFixed(2),
            // interferences
            ci_uplink_intermod: ciUplinkIntermod.toFixed(2),
            ci_uplink_adj_sat: ciUplinkAdjacentSatellite.toFixed(2),
            ci_uplink_xpol: ciUplinkXpol.toFixed(2),
            ci_uplink_xcells: ciUplinkXCells.toFixed(2),
            ci_downlink_adj_sat: ciDownlinkAdjacentSatellite.toFixed(2),
            ci_downlink_adj_sat_obj: ciDownlinkAdjacentSatelliteObject,
            ci_downlink_intermod: ciDownlinkIntermod.toFixed(2),
            ci_downlink_xpol: ciDownlinkXpol.toFixed(2),
            ci_downlink_xcells: ciDownlinkXcells.toFixed(2),
            ci_uplink: ciUplink.toFixed(2),
            ci_downlink: ciDownlink.toFixed(2),
            // total
            cn_total: cnTotal.toFixed(2),
            link_margin: linkMargin.toFixed(2),
            required_margin: this.requiredMargin,
            pass: pass,
            link_availability: linkAvailability.toFixed(2),
            mcg: this.mcg,
            occupied_bandwidth: this.occupiedBandwidth.toFixed(2),
            noise_bandwidth: noiseBandwidth.toFixed(2),
            roundup_bandwidth: roundupBandwidth.toFixed(2),
            guardband: guardband,
            data_rate: dataRate.toFixed(2),
            power_util_percent: powerUtilPercent.toFixed(2),
            roll_off_factor: this.application.roll_off_factor
        });


        return result

        // // Check if the transponder is operating in FGM or ALC mode
        // if (this.transponder.mode === 'FGM') {
        //
        //     // If FGM, find operating PFD at 100% power utilization
        //
        //     // If rain fade case, EIRPup = desired level - rain
        //
        //     // Otherwise, EIRPup = desired
        // } else {
        //
        //     // If ALC, find operating PFD at desired deep-in
        //
        //     // If rain-fade case, EIRPup = desired level - rain + UPC (but not more than desired)
        //
        //     // Otherwise, EIRPup = desired
        // }
        //
        // // Calculate C/N up (need to check max mode)
        //
        // // Calculate EIRPdown (need to check max mode)
        //
        // // Calculate C/I
        //
        // // Calculate C/N Total
        //
        // // Calculate link margin and determine pass condition
        //
        // // Return result
    }

    // return C/I Adjacent satellites from the given channel, path and location
    // our_eirp_den is EIRP density of our satellite corresponding to the given location
    ciAdjacentSatellite(data) {

        var ci_objects = [];

        var path = data.path, channel = data.channel, interference_channels = data.interference_channels, location = data.location;
        var ci = 30; //default value

        //if the channel database specifies this value (IPSTAR Forward Ka uplink and IPSTAR Return Ka downlink)
        if(_.has(channel,'ci_' + path + '_adj_sat')){
            ci = channel['ci_' + path + '_adj_sat'];
            ci_objects.push({
                interference: false,
                name: "no interference",
                value: ci
            });
        }

        // ------------------------------ Separate by IPSTAR and Conventional --------------------------

        else if(Satellites.findOne({name:channel.satellite}).type == "Broadband"){
            if (_.has(channel,'eirp_density_adjacent_satellite_' + path)){

                if(channel['eirp_density_adjacent_satellite_' + path] == -100){
                    ci = 50;
                    ci_objects.push({
                        interference: false,
                        name: "no interference",
                        value: ci
                    });
                }
                else{
                    var deg_diff = Math.abs(data.orbital_slot - channel.adjacent_satellite_orbital_slot);
                    ci = data.eirp_density - channel['eirp_density_adjacent_satellite_' + path] + gain_rejection_ratio(channel[path + '_cf'],data.diameter,deg_diff) + gain_improvment(data.diameter, deg_diff);
                    console.log('eirp den = ' + data.eirp_density + ' eirp_den_sat = ' + channel['eirp_density_adjacent_satellite_'+ path] + ' grr = ' + gain_rejection_ratio(channel[path + '_cf'],data.diameter,deg_diff) + ' gain improve = ' + gain_improvment(data.diameter, deg_diff));

                    ci_objects.push({
                        interference: true,
                        name: "Interference from slot " + channel.adjacent_satellite_orbital_slot,
                        value: ci.toFixed(2)
                    });
                }


            }
        }

        else{
            // if the input interference channel is blank (no adj.sat intf), put the object to adj.
            if (interference_channels.length == 0) {
                ci_objects.push({
                    interference: false,
                    name: "no interference",
                    value: ci
                });
            }

            else {
                // loop through interfered channels
                // intf = interference in short
                for (var i = 0; i < interference_channels.length; i++) {
                    var intf = interference_channels[i];
                    if (_.isEmpty(intf)) {
                        ci_objects.push({
                            interference: false,
                            name: "no interference",
                            value: 50
                        });
                        continue;
                    }
                    else {
                        var eirp_density = data.eirp_density, diameter = data.diameter, orbital_slot = data.orbital_slot;

                        var intf_sat = Satellites.findOne({name: intf.satellite});
                        var deg_diff = (Math.abs((orbital_slot - intf_sat.orbital_slot)) - 0.15) * 1.1; // Topocentric Angle | from P'Oui, 8 July 2014

                        console.log('Finding interferences from satellite ' + intf.satellite + ' channel: ' + intf.name + ' at ' + intf_sat.orbital_slot + ' degrees');

                        // find the gain rejection ratio (relative gain)
                        var grr = gain_rejection_ratio(channel[path + '_cf'], diameter, deg_diff);
                        console.log('GRR of ' + diameter + ' m. antenna at ' + deg_diff + ' degrees = ' + grr + ' dB');

                        // find the EIRP of the location on that satellite from the database
                        var loc = Locations.findOne({name: location.name});

                        // location is not found
                        if (!location) continue;

                        var loc_data = _.where(loc.data, {beam: intf[path + '_beam'], satellite: intf.satellite, type: path})[0];

                        // location is found, but this location is not under this beam contour
                        if (!loc_data) continue;

                        // compare with EIRP down of adjacent satellite channels
                        if (path === "downlink") {

                            console.log('The location ' + loc.name + ' has value on beam ' + loc_data.beam + ' = ' + loc_data.value);

                            // find the output backoff of the interfered channels
                            var intf_obo = _.where(intf.backoff_settings, {num_carriers: intf.current_num_carriers})[0].obo;

                            // find EIRP density of interfered channels at that location
                            var intf_eirp_density = loc_data.value + intf_obo - 10 * log10(intf.bandwidth * Math.pow(10, 6));

                            console.log("EIRP density for " + intf.satellite + ' ' + intf.name + ' = ' + intf_eirp_density + ' dBW');

                            // return C/I = our eirp density - intf eirp density + GRR + polarization improvement
                            var c_intf = eirp_density - intf_eirp_density + grr + pol_improvement(channel[path + '_pol'], intf[path + '_pol']);

                            console.log("C/I for " + channel.satellite + ' ' + channel.name + ' = ' + c_intf + ' dB');

                            ci_objects.push({
                                interference: true,
                                name: intf.satellite + " " + intf.name,
                                value: c_intf.toFixed(2),
                                satellite: intf.satellite,
                                channel: intf.name
                            });

                            ci = cnOperation(ci, c_intf);

                        }


                    }
                }
            }
        }

        ci_objects.ci = ci;

        return ci_objects;

        function pol_improvement(our_pol, intf_pol) {
            var circular_pols = ["LHCP", "RHCP"];
            var linear_pols = ["H", "V"];

            // if our pol is linear and intf pol is circular, we gain +3
            if (_.contains(linear_pols, our_pol) && _.contains(circular_pols, intf_pol)) {
                return 3;
            }
            // and vice versa, we gain -3
            else if (_.contains(circular_pols, our_pol) && _.contains(linear_pols, intf_pol)) {
                return -3;
            }
            else return 0;
        }
    }


    // Return C/I cross cells from the given channel, path and location
    ciCrossCells(channel, path, location) {
        var ci = 50 // default value
        if (path == "uplink") {
            // For IPSTAR forward channels KA-uplink (or Ku for BC)
            if (_.has(channel, 'ci_uplink_adj_cell')) {
                ci = channel.ci_uplink_adj_cell;
            }
            // For IPSTAR return channels Ku-uplink
            else if (_.has(channel, 'ci_uplink_adj_cell_50') && _.has(channel, 'ci_uplink_adj_cell_eoc')) {
                // If location is between peak and 50%, C/I = C/I at 50% plus the distance between 50% and that location
                // (if closer to peak, C/I is better)
                if (location.contour >= channel.contour_50) {
                    ci = channel.ci_uplink_adj_cell_50 + (location.contour - channel.contour_50);
                }
                // If location is between 50% and EOC, C/I = linear interpolation of C/I at 50% and C/I at EOC
                else if (location.contour < channel.contour_50 && location.contour >= channel.contour_eoc) {
                    ci = linearInterpolation(location.contour, channel.contour_50, channel.contour_eoc, channel.ci_uplink_adj_cell_50, channel.ci_uplink_adj_cell_eoc);
                }
                // If location is beyond EOC, C/I = C/I at EOC minus the distance between EOC and that location
                // (if farther from EOC, C/I is worse)
                else {
                    ci = channel.ci_uplink_adj_cell_eoc - (location.contour - channel.contour_eoc);
                }
            }
            else {
            }
        }
        else { // downlink
            // For IPSTAR return channels KA-downlink
            if (_.has(channel, 'ci_downlink_adj_cell')) {
                ci = channel.ci_downlink_adj_cell;
            }
            // For IPSTAR forward channels Ku-downlink
            else if (_.has(channel, 'ci_downlink_adj_cell_50') && _.has(channel, 'ci_downlink_adj_cell_eoc')) {
                // If location is between peak and 50%, C/I = C/I at 50% plus the distance between 50% and that location
                // (if closer to peak, C/I is better)
                if (location.contour >= channel.contour_50) {
                    ci = channel.ci_downlink_adj_cell_50 + (location.contour - channel.contour_50);
                }
                // If location is between 50% and EOC, C/I = linear interpolation of C/I at 50% and C/I at EOC
                else if (location.contour < channel.contour_50 && location.contour >= channel.contour_eoc) {
                    ci = linearInterpolation(location.contour, channel.contour_50, channel.contour_eoc, channel.ci_downlink_adj_cell_50, channel.ci_downlink_adj_cell_eoc);
                }
                // If location is beyond EOC, C/I = C/I at EOC minus the distance between EOC and that location
                // (if farther from EOC, C/I is worse)
                else {
                    ci = channel.ci_downlink_adj_cell_eoc + (location.contour - channel.contour_eoc);
                }
            }
            else {
            }
        }

        return ci;
    }

    extractUniqueRemoteLocations () {
        return _.uniq(_.map(this.remoteStations, 'location'))
    }

    findApplicationByPath (path) {
        return this.modem.applications.find(app => app.type === path || app.type === 'SCPC' || app.type === 'broadcast')
    }

    findBestTransponderFromLocationAndSatellite ({ location, satellite }) {
        return {}
    }
    
    findContourRange () {
        return {
            max: 0,
            min: -15
        }
    }

    findGateway (gateway) {

    }

    findLowerBandwidthPool () {

        // Check the the application has array of available symbol rates
        if (!_.has(this.application, 'symbol_rates') || application.symbol_rates.length == 0) {
            console.log("Cannot find list of available symbol rates.")
            return false;
        }
        let symbolRate = _.filter(this.application.symbol_rates, sr => {
            return sr < this.occupiedBandwidth / this.application.roll_off_factor;
        })
        // Return array of bandwidth from symbol rate
        return _.map(symbolRate, item => {
            if(this.application.name == "TOLL"){
                return (item / 1000) + 3.375;
            }
            return (item / 1000) * this.application.roll_off_factor;
        })
    }

    findLowerMcgsThanClearSky (inputMcg) {
        // Assume the MCG in the application is sorted from lowest to highest efficiency
        let mcgs = _.filter(this.mcgs, mcg => {
            return mcg.spectral_efficiency <= inputMcg.spectral_efficiency;
        })
        // Return sorted mcg by spectral efficiency
        return _.sortBy(mcgs, num => {
            return -(num.spectral_efficiency);
        })
    }

    findSatellite (transponder) {
        return this.satellites.find(satellite => satellite.name === transponder.satellite)
    }

    findTransponderByPath () {
    }

    // Record the error message
    logError(message) {
        console.log(message);
        this.errorMessage = message;
    }

    logTitle(string) {
        console.log('---------------------- ' + string + ' ----------------------');
    }
    
    // Copied from old program
    seekOccupiedBandwidth (value) {
        
        let app = this.application, bt = this.application.roll_off_factor, unit = this.station.bandwidth.unit, mcg = this.mcg
        
        console.log('Calculate bandwidth from App ' + app.name + " mcg = " + mcg.name + " spec.eff = " + mcg.spectral_efficiency);
        console.log('Bandwidth input = ' + value + " " + unit + " | BT = " + bt);

        // if user input data rate, find the bandwidth from data rate / current mcg ebe
        var sr = 0;
        if (_.includes(["Mbps", "kbps"], unit)) {
            // if Mbps, convert to kbps
            var dr = unit === "Mbps" ? value * 1000 : value;
            sr = dr / mcg.spectral_efficiency; // calculate symbol rate in ksps
        }
        else if (_.includes(["MHz", "kHz"], unit)) {
            // convert to symbol rate in ksps
            var bw = unit === "MHz" ? value * 1000 : value;
            sr = bw / bt;
        }
        else if (_.includes(["Msps", "ksps"], unit)) {
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
            else if (_.includes(app.symbol_rates, sr)) {
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