/**
 * Created by thanatv on 11/3/17.
 */

const _ = require('lodash')
const Antenna = require('./antenna')
const Atmospheric = require('./atmospheric')
const Bandwidth = require('./bandwidth')
const Buc = require('./buc')
const Contour = require('./contour')
const GatewayStation = require('./gatewayStation')
const Location = require('./location')
const Modem = require('./modem')
const RemoteStation = require('./remoteStation')
const Satellite = require('./satellite')
const Station = require('./station')
const Transponder = require('./transponder')
const Utils = require('./utils')

// Mongoose Models
const {Gateways} = require('../models/gateways')
const {Locations} = require('../models/locations')
const {Satellites} = require('../models/satellites');
const {Transponders} = require('../models/transponders')

class LinkBudget {
    constructor(requestObject) {
        for (var field in requestObject) {
            this[field] = requestObject[field]
        }
        this.init()

    }

    // Prepare parameters for link budget
    init() {

        this.debugLevel = 3

        // If default gateway is selected, add a single gatewway object
        if (this.useDefaultGateway) {
            this.logMessage(`This app is using defualt gateway`, 1)
            this.gatewayStations.push({name: 'defaultGateway'})
        }

        // If finding best transponder is selected, extract unique locations out of remote stations and find the their respective best transponders
        if (this.findBestTransponders) {
            let uniqueLocations = this.extractUniqueRemoteLocations()

            // Get the best transponders for each selected satellite
            let locationWithBestTransponders = []
            this.satellites.forEach(satellite => {
                uniqueLocations.forEach(location => {
                    let bestTransponder = this.findBestTransponderFromLocationAndSatellite({location, satellite})
                    locationWithBestTransponders.push({location, transponder: bestTransponder})
                })
            })

            // Adding transponders to every remote stations
            this.remoteStations.forEach(station => {
                let bestTransponder = locationWithBestTransponders.find(location => location.name === station.location.name).transponder
                station.transponder = bestTransponder
            })
        } else {
            // Otherwise, combine selected transponders with remote stations into objects
            this.logMessage(`Combining transponders with remote stations`, 1)
            let stations = []
            this.remoteStations.forEach(station => {
                this.logMessage(`Looping stations with antenna =  ${station.antenna.name}, BUC = ${station.buc.name}, Location = ${station.location.name}, Bandwidth = ${station.bandwidth.forward}/${station.bandwidth.return} ${station.bandwidth.unit}`, 1)
                this.transponders.forEach(transponder => {
                    this.logMessage(`Looping transponders ${transponder.name}`, 1)
                    station.transponder = transponder
                    stations.push(_.cloneDeep(station))
                })
            })
            // Set the combined array back to remote stations object
            this.remoteStations = stations
            this.logMessage(`Remote Stations total length = ${this.remoteStations.length}`, 1)


            // this.logMessage(this.remoteStations)
        }

        // Run the link budget
        this.forwardLinkResults = []
        this.returnLinkResults = []
        this.linkBudgetResults = []
        this.logMessage('Start running link budgets', 1)
        //this.runLinkBudget()
    }

    async runLinkBudget() {

        // Start looping remote stations
        // this.logMessage(this.remoteStations.length)
        for (let [index, station] of this.remoteStations.entries()) {
            // this.logMessage(station)

            this.remoteStation = new RemoteStation(station)
            this.remoteStation.print()


            this.remoteStation.id = index

            // Start looping gateway/ hub stations
            for (let gateway of this.gatewayStations) {

                // Start looping platform
                for (let modem of this.modemsAndMcgs) {

                    this.modem = new Modem(modem)
                    this.modem.print()

                    let targetedForwardLinkMargins = []
                    let targetedReturnLinkMargins = []
                    if (this.findMaxCoverage) {
                        targetedForwardLinkMargins = this.forwardLinkMargins
                    } else {
                        targetedForwardLinkMargins.push(0)
                    }
                    if (this.findMaxCoverage && !this.findMatchingReturnCoverage) {
                        targetedReturnLinkMargins = this.returnLinkMargins
                    } else {
                        targetedReturnLinkMargins.push(0)
                    }

                    // Start looping forward link margin if any
                    for (let forwardLinkMargin of targetedForwardLinkMargins) {

                        this.forwardLinkMargin = forwardLinkMargin
                        this.logMessage(`Looping forward link margin = ${forwardLinkMargin} dB`, 1)

                        for (let returnLinkMargin of targetedReturnLinkMargins) {

                            this.returnLinkMargin = returnLinkMargin
                            this.logMessage(`Looping return link margin = ${returnLinkMargin} dB`, 1)


                            let forwardLinkResult = {}
                            let returnLinkResult = {}

                            this.logMessage('Running forward link', 1)
                            await this.runLinkByPath('forward')

                            this.logMessage('Running return link', 1)
                            await this.runLinkByPath('return')
                            this.logMessage('----------------------------', 1)
                        }

                    }

                    // forwardLinkResult = await this.runLinkByPath('forward')
                    // returnLinkResult = await this.runLinkByPath('return')
                    // // Record cases
                    // this.logMessage('Recording results')
                    // this.linkBudgetResults.push({
                    //     forwardLink: forwardLinkResult,
                    //     returnLink: returnLinkResult
                    // })
                    // })
                    // this.runLinkByPath('forward').then(result => {
                    //     this.logMessage(`Forward Result : ${result}`)
                    //     forwardLinkResult = result
                    //     this.logMessage('Running return link')
                    //     return this.runLinkByPath('return')
                    // }).then(result => {
                    //     this.logMessage(`Return Result : ${result}`)
                    //     returnLinkResult = result
                    //
                    //     // Record cases
                    //     this.logMessage('Recording results')
                    //     this.linkBudgetResults.push({
                    //         forwardLink: forwardLinkResult,
                    //         returnLink: returnLinkResult
                    //     })
                    // })

                    // Run return link
                    // this.logMessage('Running return link')
                    // let returnLinkResult
                    // this.runLinkByPath('return').then(result => {
                    //     returnLinkResult = result
                    // })


                }
            }
        }
        // return this.linkBudgetResults
        // this.logMessage(JSON.stringify(this.forwardLinkResults, undefined, 2))
        return {
            forwardLinkResults: this.forwardLinkResults,
            returnLinkResults: this.returnLinkResults
        }
    }

    async runLinkByPath(path) {

        // let linkResult = {
        //     forwardResult: {},
        //     returnResult: {}
        // }
        let linkResult = {}

        // Set uplink and downlink station
        // this.logMessage(this.remoteStation)


        // this.logMessage(this.downlinkStation)
        this.path = path


        this.logMessage('--------------------------------------------')
        this.logMessage(`----------Start running a ${path} link-----------`.toUpperCase())
        this.logMessage('--------------------------------------------')


        // Set bandwidth value and unit
        this.bandwidthValue = this.remoteStation.bandwidth[path]
        this.bandwidthUnit = this.remoteStation.bandwidth.unit

        // If path = return, find the correct transponder for this station. (the remote station is equipped with forward transponder by default)
        if (path === 'return') {
            // Find transponder by path
            this.logMessage(`Searching the return transponder for ${this.remoteStation.forwardTransponder.name} on ${this.remoteStation.forwardTransponder.satellite}`, 2)
            let tp = await this.findTransponderByPath(this.remoteStation.forwardTransponder, path)
            this.remoteStation.setTransponder('return', tp)
        }

        this.transponder = this.remoteStation[`${path}Transponder`]

        this.logMessage(`Transponder = ${this.transponder.name} - ${path}`, 1)

        // Seek the contour for this remote station
        this.remoteStation.seekDefinedContoursAndCoordinates(this.transponder)

        // Find and set satellite
        let sat = this.findSatellite(this.transponder)
        this.satellite = new Satellite(sat)
        this.logMessage(`Set satellite object to ${this.satellite.name}`, 2)
        let gw = await this.findGateway(this.transponder)

        // Find appropriate gateway
        this.gateway = new GatewayStation(gw)
        // this.logMessage(this.gateway)
        this.gateway.print()

        // Set uplink contour of gateway if default gateway is used
        if (this.useDefaultGateway) {
            this.gateway.contour = -1
        }

        // Find application by path
        this.application = this.findApplicationByPath(path)
        this.logMessage(`Set application name to ${this.application.name}`, 2)

        // Set uplink and downlink station
        if (path === 'forward') {
            this.uplinkStation = this.gateway
            this.downlinkStation = this.remoteStation

        } else if (path === 'return') {
            this.uplinkStation = this.remoteStation
            this.downlinkStation = this.gateway
        } else {
            this.logMessage(`${path} is not a valid path`, 2)
        }

        // Set default link availability and site diversity based on the given stations
        this.uplinkAvailability = this.uplinkStation.gateway_availability || 99.5
        this.downlinkAvailability = this.downlinkStation.gateway_availability || 99.5

        // Check if this platform is MCG fixed
        if (!this.modem.findBestMcg) {
            ``
            this.logMessage(`This modem is MCG fixed`, 2)


            // If yes, set MCGs = all MCG given in the modem application

            // Start looping MCG
            for (let mcg of this.application.mcgs) {

                // Set MCG
                this.mcg = mcg
                this.logMessage(`Setting MCG to ${this.mcg.name}`, 2)


                // Check if max contour is selected, find the the max contour if, this is forward link or return with auto find return contour is not selected
                if (this.findMaxCoverage && (path === 'forward' || !this.findMatchingReturnCoverage)) {
                    this.logMessage(`Max coverage selected, performing binary search`, 2)

                    // If yes, perform a binary search over a minimum and maximum contour range (running clear sky link)
                    let contourRange = this.findContourRange()
                    this.logMessage(`Contour range of this this transponder is ${contourRange.min} to ${contourRange.max} dB`, 2)
                    let contourRangeArray = _.range(contourRange.min, contourRange.max, 0.1)

                    let minIndex = 0
                    let maxIndex = contourRangeArray.length - 1
                    let currentIndex
                    let currentElement
                    let answer = 0
                    let result

                    while (minIndex <= maxIndex) {
                        currentIndex = (minIndex + maxIndex) / 2 | 0
                        currentElement = Utils.round(contourRangeArray[currentIndex], 1)

                        // Set station relative contour to this value
                        // If this forward link, change the downlink station, if this is return link, change the uplink station
                        if (path === 'forward') {
                            this.downlinkStation.contour = currentElement
                        } else {
                            this.uplinkStation.contour = currentElement
                        }
                        this.logMessage(`Setting contour to ${currentElement} dB`, 3)
                        this.logMessage(`Running clear sky link`, 3)
                        result = await this.runClearSkyLink()

                        if (!result.passed) { // not pass => step to higher index of array (= narrower contour)
                            minIndex = currentIndex + 1
                            this.logMessage(`Contour ${currentElement} dB doesn't passes the condition`, 3)
                            answer = currentElement
                        } else { // pass => step to lower index of array (= wider contour)
                            maxIndex = currentIndex - 1
                            this.logMessage(`Contour ${currentElement} dB pass the condition`, 3)
                        }
                    }
                    this.logMessage(`Searching for max contour finished, answer is ${currentElement} dB`, 2)
                    this.maxContour = currentElement

                    this.logMessage('Saving clear sky result', 2)
                    linkResult.clearSky = result

                    // If this is forward link and find matching contour is selected, find the match contour for return link here
                    if (path === 'forward' && this.findMatchingReturnCoverage) {
                        let matchedContourObject = await this.findMatchingReturnContour(this.satellite.name, this.transponder.name, currentElement)
                        this.logMessage(`Matched contour is ${JSON.stringify(matchedContourObject)}`, 3)
                        this.matchingContour = matchedContourObject.bestMatch
                        this.logMessage(`Searching for matching return contour of ${this.transponder.name}-FWD ${currentElement} dB, which is ${this.matchingContour} dB`)
                    }

                } else {
                    // If no, set parameters and then run a clear sky link and record the result
                    this.logMessage(`Max contour option is not selected`, 2)
                    this.logMessage(`Running clear sky link`, 2)
                    // linkResult[path + 'Result']['clearSky'] = await this.runClearSkyLink()
                    linkResult.clearSky = await this.runClearSkyLink()
                }

                // Run the rain fade link
                // Set clear sky result to instance of an object so it can get referred in rain fade case
                this.currentClearSkyResult = linkResult.clearSky

                // If max contour is selected, do not run the rain fade link since we don't care the result at rain fade
                if (!this.findMaxCoverage) {
                    try {
                        linkResult.rainFade = await this.runRainFadeLink()
                    } catch (e) {
                        this.logMessage(e)
                    }
                }

                // Push the result into link results instance
                // this.logMessage(`Link result clearsky shows MCG as ${linkResult.clearSky.mcg.name}`)
                // this.logMessage(`Link result rainfade shows MCG as ${linkResult.rainFade.mcg.name}`)
                // this[path + 'LinkResults'].push({ linkResult })
                this.pushResult(linkResult, path)
                // this.forwardLinkResults.push(`${linkResult.clearSky.mcg.name}`)

            }
        } else {
            this.logMessage(`Fixed MCG is not selected`, 2)

            // If no, (not fix MCG), set MCGs = all MCG given in the modem application
            // Perform a binary search over a minimum and maximum available MCGs (running clear sky link)
            let minIndex = 0
            let maxIndex = this.application.mcgs.length - 1
            let currentIndex
            let currentElement
            let answer = 0
            let result, resultAnswer

            while (minIndex <= maxIndex) {
                currentIndex = (minIndex + maxIndex) / 2 | 0
                currentElement = this.application.mcgs[currentIndex]

                // Set mcg to this value
                this.mcg = currentElement
                this.logMessage(`Setting current MCG to ${this.mcg.name}`, 3)
                this.logMessage(`Running clear sky link`, 3)

                try {
                    result = await this.runClearSkyLink()
                } catch (e) {
                    this.logMessage(e)
                }

                if (result.passed) { // pass
                    minIndex = currentIndex + 1
                    this.logMessage(`${currentElement} passes the condition`, 3)
                    answer = currentElement
                    resultAnswer = result
                } else { // not pass
                    maxIndex = currentIndex - 1
                    this.logMessage(`${currentElement} doesn't pass the condition`, 3)
                }
            }
            this.logMessage(`Searching for best MCG finished, answer is ${answer.name}`, 2)
            this.logMessage('Saving clear sky result')
            // linkResult[path + 'Result']['clearSky'] = resultAnswer
            linkResult.clearSky = resultAnswer

            // Run the rain fade link
            // Set clear sky result to instance of an object so it can get referred in rain fade case
            // this.currentClearSkyResult = linkResult[path + 'Result']['clearSky']
            this.currentClearSkyResult = linkResult.clearSky

            if (!this.findMaxCoverage) {
                try {
                    linkResult.rainFade = await this.runRainFadeLink()
                } catch (e) {
                    this.logMessage(e)
                }
            }

            // Push the result into link results instance
            this.pushResult(linkResult, path)

        }

        this.logMessage('--------')
        this.logMessage('--------')
        this.logMessage('--------')
        this.logMessage('--------')
        this.logMessage('--------')

        // Return results
        return linkResult

    }


    async runClearSkyLink() {

        this.logMessage('Setting conditions for CLEAR SKY')
        this.condition = 'clear'

        // if finding max coverage, set link margin to the custom one
        if (this.findMaxCoverage && this.path === 'forward') {
            this.logMessage(`Finding max coverage on forward link`, 1)
            this.requiredMargin = this.forwardLinkMargin
        } else if (this.findMaxCoverage && !this.findMatchingReturnCoverage && this.path === 'return') {
            this.logMessage(`Finding max coverage on return link using given link margin from user (not auto find matching contour with forward max contour`)
            this.requiredMargin = this.returnLinkMargin
        } else {
            this.logMessage(`Set link margin to modem value`)
            this.requiredMargin = this.application.link_margin
        }

        this.logMessage(`Setting link margin to ${this.requiredMargin} dB`, 1)

        // Run link and return result
        try {
            let clearSkyResult = await this.runLink()
            this.logMessage(`Clear sky result shows MCG = ${clearSkyResult.mcg.name}`, 2)
            return clearSkyResult
        } catch (e) {
            this.logMessage(e)
        }


    }

    async runRainFadeLink() {

        this.logMessage('Setting conditions for RAIN FADE', 2)
        this.condition = 'rain'
        this.requiredMargin = 0
        this.logMessage(`Setting link margin to ${this.requiredMargin}`, 2)

        // TODO: Find the rain fade value here

        let rainFadeResult

        // Check MCG at clear sky result object
        let mcgClearSky = this.currentClearSkyResult.mcg
        this.logMessage(`MCG at clear sky is ${mcgClearSky.name}`, 2)

        // Check if modem has ACM function and dynamic channel function and also user selects finding best MCG (utilizing the ACM feature)

        // If yes-yes, perform normal search over looping MCG and available symbol rates
        if (this.application.acm && this.application.dynamic_channels && this.modem.findBestMcg) {
            this.logMessage('This app has ACM and dynamic channels', 2)
            let lowerMcgs = this.findLowerMcgsThanClearSky(mcgClearSky)
            let lowerBandwidthPool = this.findLowerBandwidthPool()

            let results = []

            // await does not work with forEach
            for (let mcg of lowerMcgs) {
                this.mcg = mcg
                for (let bandwidth of lowerBandwidthPool) {
                    this.bandwidthValue = bandwidth
                    this.bandwidthUnit = 'ksps'

                    try {
                        let result = await this.runLink()
                        results.push(result)
                    } catch (e) {
                        this.logMessage(e)
                    }


                }
            }

            // Filter result with 2 requirements, pass margin and max data rate
            rainFadeResult = _.max(results.find(result => result.passed), item => {
                return item.data_rate;
            })
        }

        // If yes-no, perform binary search over looping MCG
        else if (this.application.acm && this.modem.findBestMcg) {
            this.logMessage('This app has ACM (no dynamic channels)', 2)
            let lowerMcgs = this.findLowerMcgsThanClearSky(mcgClearSky)
            this.logMessage(lowerMcgs)
            let minIndex = 0
            let maxIndex = lowerMcgs.length - 1
            let currentIndex
            let currentElement
            let answer = 0
            let result, resultAnswer

            while (minIndex <= maxIndex) {
                currentIndex = (minIndex + maxIndex) / 2 | 0
                currentElement = lowerMcgs[currentIndex]

                // Set mcg to this value
                this.mcg = currentElement
                this.logMessage(`Setting MCG to ${currentElement.name}`, 3)
                try {
                    result = await this.runLink()
                } catch (e) {
                    this.logMessage(e)
                }

                if (result.passed) { // pass
                    minIndex = currentIndex + 1
                    this.logMessage(`${currentElement.name} passes the rain fade condition`, 3)
                    answer = currentElement
                    resultAnswer = result
                } else { // not pass
                    maxIndex = currentIndex - 1
                    this.logMessage(`${currentElement.name} doesn't pass the rain fade condition`, 3)
                }
            }
            this.logMessage(`Searching the best MCG for rain fade finished, answer is ${answer.name}`, 2)
            rainFadeResult = resultAnswer
        } else {
            this.logMessage(`This app has no ACM`, 2)
            // If no-no, run link at the same code as clear sky case (there is no 'no-yes' case as dynamic channel always comes with ACM)
            this.mcg = mcgClearSky
            this.logMessage(`Running rain fade link`, 2)
            try {
                rainFadeResult = await this.runLink()

            } catch (e) {
                this.logMessage(e)
            }

            // If the existing condition still does not pass, perform binary search over link availability to find max total link availability
            if (!rainFadeResult.passed) {
                this.logMessage(`Link does not pass at rain fade, find maximum link availability`, 2)
                let linkAvailabilityRange = _.range(95, 99.5, 0.1)
                let minIndex = 0
                let maxIndex = linkAvailabilityRange.length - 1
                let currentIndex
                let currentElement
                let answer = 0
                let result, resultAnswer

                while (minIndex <= maxIndex) {
                    currentIndex = (minIndex + maxIndex) / 2 | 0
                    currentElement = Utils.round(linkAvailabilityRange[currentIndex],1)

                    // Set uplink or downlink availability to new value (forward link changes downlink avail, return link changes uplink avail)
                    this.path === 'forward' ? this.downlinkAvailability = currentElement : this.uplinkAvailability = currentElement
                    this.logMessage(`Setting uplink availability to ${this.uplinkAvailability}% and downlink availability to ${this.downlinkAvailability}%`, 3)

                    try {
                        result = await this.runLink()
                    } catch (e) {
                        this.logMessage(e)
                    }

                    if (result.passed) { // pass
                        minIndex = currentIndex + 1
                        this.logMessage(`${currentElement}% passes the condition`, 3)
                        answer = currentElement
                        resultAnswer = result
                    } else { // not pass
                        maxIndex = currentIndex - 1
                        this.logMessage(`${currentElement}% doesn't pass the condition`, 3)
                    }
                }
                this.logMessage(`Searching the max link availability finished, answer is ${answer}%`, 2)
                rainFadeResult = resultAnswer
            }

        }

        // Return result
        return rainFadeResult
    }

    async runLink() {

        let result = {}
        this.overusedPower = 0

        // Seek the occupied bandwidth
        this.seekOccupiedBandwidth()
        this.logMessage('Seeking occupied bandwidth')

        // Setup parameters
        let orbitalSlot = this.satellite.orbital_slot
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
        let uplinkXpolLoss = Utils.xpolLoss(),
            uplink_pointingLoss = Utils.pointingLoss(uplinkFrequency, uplinkStation.antenna.size, skb);
        this.logMessage(`Calculating atmospheric loss`)
        let uplinkAtmLoss = await new Atmospheric({debugLevel: this.debugLevel}).calculateLoss({
            condition: this.condition,
            location: uplinkStation.location,
            orbitalSlot: orbitalSlot,
            freq: uplinkFrequency,
            polarization: transponder.uplink_pol,
            diameter: uplinkStation.antenna.size,
            availability: this.uplinkAvailability,
            debugLevel: this.debugLevel
        });
        let uplinkOtherLoss = uplinkXpolLoss + uplink_pointingLoss;
        let uplinkSpreadingLoss = Utils.spreadingLoss(uplinkSlantRange);

        // Uplink contour can be set if this is find max coverage at return link with finding matching return contour enabled
        let uplinkContour = 0
        if (this.path === 'return' && this.findMaxCoverage && this.findMatchingReturnCoverage) {
            uplinkContour = this.matchingContour
            this.logMessage(`This is max mode, return with auto-find return contour. Setting return uplink contour to ${uplinkContour} dB`)
        } else {
            uplinkContour = uplinkStation.contour
            this.logMessage(`Uplink contour = ${uplinkContour} dB`)
        }

        let gainVariation = 0;
        let gainVariationDiff = 0;

        let channelPfd, channelDeepin

        // For Thaicom 4 satellite, applies gain variation, except it's Max Mode
        if (this.satellite.name == "Thaicom 4" && _.includes(["return"], transponder.type) && !this.maxMode) {
            if (_.includes(["328", "514", "608"], transponder.uplink_beam)) { // shape beam
                gainVariation = -0.0015 * Math.pow(uplinkContour, 3) - 0.0163 * Math.pow(uplinkContour, 2) + 0.1827 * uplinkContour - 0.1737;
            }
            else {
                gainVariation = -0.0019 * Math.pow(uplinkContour, 2) + 0.2085 * uplinkContour - 0.5026;
            }
            gainVariationDiff = gainVariation > -1.4 ? 0 : 1.4 + gainVariation;
        }

        let uplinkGt = transponder.gt_peak + uplinkContour + gainVariationDiff;

        // If this is Max Mode for Thaicom 4 satellite, add 1.7 dB constantly (from P'Nong 17 Nov 2017)
        if (this.satellite.name == "Thaicom 4" && this.maxMode) {
            this.logMessage(`Max mode is activated, increase uplink G/T by 1.7 dB`)
            uplinkGt += 1.7
        }

        let operatingPfd = 0, operatingPfdPerCarrier = 0, eirpUp = 0, carrierPfd = 0, carrierOutputBackoff = 0;

        // If channel is FGM, find operating PFD at 100% utilization

        if (transponder.mode === 'FGM') {

            // Get the backoff settings (IBO, OBO, Intermod) from the database based on the default number of carriers ("One","Two","Multi") set in the database
            let numCarriers = transponder.current_num_carriers;
            let backoffSettings = transponder.backoff_settings.find(s => s.num_carriers === numCarriers);
            this.logMessage(backoffSettings)

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

            // For Thaicom 4 FWD Link, the data is stored in format fixed gateway EIRP Up
            if (transponder.eirp_up_channel) {
                this.logMessage(`EIRP Up channel = ${transponder.eirp_up_channel}, Num carriers in channel = ${numCarriersInChannel}`)
                eirpUp = transponder.eirp_up_channel - numCarriersInChannel;
                operatingPfdPerCarrier = eirpUp - uplinkSpreadingLoss - uplinkOtherLoss;
            }

            // For other ALC transponders, the data is stored in desired deep-in value
            // so, we find PFD at designed deepin first, then derive for EIRP up
            // the derived EIRP up will need to compensate spreading loss, pointing, xpol and atmoshperic loss
            else {
                this.logMessage(`Number of carriers in channel = ${numCarriersInChannel}`)
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
            if (_.has(uplinkStation, 'buc')) {
                this.logMessage("This is BUC.")
                // check if eirp of this buc & antenna can reach the desired level
                let eirpUpFromBuc = uplinkStation.eirpUplink(uplinkFrequency);

                if (eirpUp > eirpUpFromBuc) {
                    this.logMessage("EIRP Up of " + eirpUp + " dBW is more than EIRP up from BUC which is " + eirpUpFromBuc + " dBW");
                    eirpUp = eirpUpFromBuc;
                }
                else {
                    this.logMessage("EIRP Up of " + eirpUp + " dBW is less than EIRP up from BUC which is " + eirpUpFromBuc + " dBW");
                }
            }
            else {
                this.logMessage("This is not a BUC.")
            }

            // Find carrier PFD. This may not equal to operating pfd in case of overused power or the BUC power is not enough to get to designed point
            carrierPfd = eirpUp - uplinkSpreadingLoss - uplinkOtherLoss - uplinkAtmLoss;
            this.logMessage('Uplink Spreading Loss = ' + uplinkSpreadingLoss + ' dB');
            this.logMessage('Uplink Other Loss = ' + uplinkOtherLoss + ' dB');


            // For ALC transponders, assume the transponder is full-loaded (always reach deep-in)
            // Find deep-in per channel at full-load
            channelPfd = carrierPfd + numCarriersInChannel;
            channelDeepin = channelPfd - (operatingPfd - transponder.dynamic_range);

            // set carrier output backoff to the OBO at backoff settings based on current load
            // normally for Conventional Ku-ALC is single carrier and Thaicom 4 is multi carrier
            carrierOutputBackoff = transponder.backoff_settings.find(s => s.num_carriers === transponder.current_num_carriers).obo;

            // If the pfd not reach deep-in, output backoff is increased to that amount out of deepin
            carrierOutputBackoff += channelDeepin > 0 ? 0 : channelDeepin;
            carrierOutputBackoff -= numCarriersInChannel;

            _.assign(result, {
                channelOutputBackoff: transponder.backoff_settings.find(s => s.num_carriers === transponder.current_num_carriers).obo,
                channelDeepin: Utils.round(channelDeepin, 2)
            });

        }

        else {
            this.logError("Transponder mode is not FGM or ALC.");
            return false;
        }

        // Calculate required HPA power
        let operatingPowerAtHpaOutput = eirpUp - uplinkStation.antenna.txGain(uplinkFrequency);
        this.logMessage(`EIRP up = ${eirpUp}, Uplink Tx Gain = ${uplinkStation.antenna.txGain(uplinkFrequency)}`)
        // this.logMessage(uplinkStation)
        let hpaType = _.has(uplinkStation, 'buc') ? 'buc' : 'hpa'
        this.logMessage(`hpa type = ${hpaType}`)
        this.logMessage(`${hpaType} = ${uplinkStation[hpaType]['ifl']} ${hpaType} OBO = ${uplinkStation[hpaType]['obo']} dB`);
        this.logMessage('OP Power = ' + operatingPowerAtHpaOutput + ' dB');
        let operatingHpaPower = Math.pow(10, (operatingPowerAtHpaOutput + uplinkStation[hpaType]['ifl']) / 10);

        // Calculate C/N Uplink

        let eirpUpAtSatellite = eirpUp - uplinkOtherLoss - uplinkAtmLoss;
        let uplinkPathLoss = Utils.pathLoss(uplinkSlantRange, uplinkFrequency);
        let cnUplink = Utils.carrierOverNoise(eirpUpAtSatellite, uplinkGt, uplinkPathLoss, noiseBandwidth);

        this.logMessage('-------Power optimization---------');
        this.logMessage('Operating SFD ' + operatingPfd + ' dBW/m^2');
        this.logMessage('Operating PFD ' + operatingPfdPerCarrier + ' dBW/m^2');
        this.logMessage('Channel PFD ' + channelPfd + ' dBW/m^2');
        this.logMessage('Carrier OBO ' + carrierOutputBackoff + ' dB');
        this.logMessage('Carrier PFD ' + carrierPfd + ' dBW/m^2');
        this.logMessage('Channel deepin ' + channelDeepin + ' dB');

        this.logMessage('----Uplink-----');
        this.logMessage('Condition: ' + this.condition);
        this.logMessage('Atmoshperic Loss: ' + uplinkAtmLoss + " dB");
        this.logMessage('EIRP UP ' + eirpUp + ' dBW');
        this.logMessage('G/T ' + uplinkGt + ' dB/K');
        this.logMessage('Path Loss: ' + uplinkPathLoss + ' dB');
        this.logMessage('Noise BW: ' + noiseBandwidth + ' dB');
        this.logMessage('C/N uplink ' + cnUplink + ' dB');

        // ---------------------------------- Downlink ---------------------------------------------

        // Setup variables
        let downlinkFrequency = transponder.downlink_cf;
        let downlinkSlantRange = Utils.slantRange(downlinkStation.location, orbitalSlot);
        let downlinkXpolLoss = Utils.xpolLoss(),
            downlinkPointingLoss = Utils.pointingLoss(downlinkFrequency, downlinkStation.antenna.size, skb);
        this.logMessage('Calculating downlink atm loss')
        let downlinkAtmLoss = await new Atmospheric({debugLevel: this.debugLevel}).calculateLoss({
            condition: this.condition,
            location: downlinkStation.location,
            orbitalSlot: orbitalSlot,
            freq: downlinkFrequency,
            diameter: downlinkStation.antenna.size,
            polarization: transponder.downlink_pol,
            availability: this.downlinkAvailability,
        });
        let downlinkOtherLoss = downlinkXpolLoss + downlinkPointingLoss;
        let downlinkContour = downlinkStation.contour;
        this.logMessage('Downlink contour = ' + downlinkContour + ' dB')

        // Find saturated EIRP at location for debug purpose (no backoff per carrier)
        let saturatedEirpDownAtLocation = transponder.saturated_eirp_peak + downlinkContour;
        this.logMessage(`Saturated EIRP down at location = ${saturatedEirpDownAtLocation} dBW`)

        // If max mode is used, the saturated EIRP is increased by Delta to Max (it is reduced before due to thermal distortion and stuff)
        // In addition, add a constant 1.4 dB to EIRP down (from P'Nong 17 Nov 2017)
        if (this.maxMode && transponder.delta_eirp_down) {
            this.logMessage(`Max mode is activated, increase downlink EIRP by 1.4 dB plus the Delta EIRP down data (see the PSR Payload Excel file`)
            saturatedEirpDownAtLocation += transponder.delta_eirp_down
            saturatedEirpDownAtLocation += 1.4
        }

        // For Thaicom 4 satellite, applies gain variation, except it's Max Mode
        if (this.satellite.name == "Thaicom 4" && _.includes(["forward", "broadcast"], transponder.type) && !this.maxMode) {
            if (_.includes(["328", "514", "608"], transponder.downlink_beam)) { // shape beam
                gainVariation = -0.0022 * Math.pow(downlinkContour, 3) - 0.0383 * Math.pow(downlinkContour, 2) - 0.0196 * downlinkContour - 0.2043;
            }
            else {
                gainVariation = -0.0006 * Math.pow(downlinkContour, 2) + 0.1999 * downlinkContour - 0.4185;
            }
            gainVariationDiff = gainVariation > -1.1 ? 0 : 1.1 + gainVariation;
        }
        this.logMessage(`Gain vairation diff = ${gainVariationDiff}`)

        // Find driven EIRP at location = Saturated EIRP at peak + carrier OBO + Gain Variation + downlink relative contour
        let drivenEirpDownAtLocation = transponder.saturated_eirp_peak + carrierOutputBackoff + downlinkContour + gainVariationDiff;
        this.logMessage('Driven EIRP at loc = ' + drivenEirpDownAtLocation);

        // Find EIRP Down at location = Saturated EIRP at peak + carrier OBO + downlink relative contour + other losses (pointing, xpol) + atm loss
        let carrierEirpDownAtLocation = transponder.saturated_eirp_peak + carrierOutputBackoff + downlinkContour + gainVariationDiff - downlinkOtherLoss - downlinkAtmLoss;

        // Find G/T of receive antenna
        let antGt = downlinkStation.gt(downlinkFrequency, downlinkAtmLoss, this.condition)

        // Calculate C/N Downlink
        let downlinkPathLoss = Utils.pathLoss(downlinkSlantRange, downlinkFrequency);
        let cnDownlink = Utils.carrierOverNoise(carrierEirpDownAtLocation, antGt, downlinkPathLoss, noiseBandwidth);

        this.logMessage('------Downlink-----');
        this.logMessage('Condition: ' + this.condition);
        this.logMessage('Pointing loss = ' + downlinkPointingLoss + ' dB , Xpol loss = ' + downlinkXpolLoss + ' dB');
        this.logMessage('Atmoshperic Loss: ' + downlinkAtmLoss + " dB");
        this.logMessage('EIRP Down: ' + carrierEirpDownAtLocation + ' dBW');
        this.logMessage('G/T ' + antGt + ' dB/K');
        this.logMessage('Path Loss ' + downlinkPathLoss + ' dB');
        this.logMessage('Noise BW ' + noiseBandwidth + ' dB');
        this.logMessage('C/N Downlink ' + cnDownlink + ' dB');

        // ---------------------------------- Interferences ---------------------------------------------

        // -------------------------------Uplink Interferences ---------------------------------------------

        // C/I Intermod from HPA, C/I Adjacent satellite
        // If uplink HPA, do not have C/I intermod specified, assume it is 25
        let ciUplinkIntermod = _.has(uplinkStation.hpa, 'intermod') ? uplinkStation.hpa.intermod : 50;

        // If the HPA has data for rain_fade use that value. (for Thaicom 4 gateways, this value will become 19 dB at rain fade.
        if (this.condition == "rain" && _.has(uplinkStation.hpa, 'intermod_rain')) {
            ciUplinkIntermod = uplinkStation.hpa.intermod_rain;
        }

        // Uplink adjacent satellite interferences
        let ciUplinkSatelliteObject = this.ciAdjacentSatellite({
            path: "uplink",
            channel: transponder,
            interference_channels: [],
            eirp_density: eirpUp - 10 * Utils.log10(this.occupiedBandwidth * Math.pow(10, 6)),
            location: uplinkStation.location,
            station: uplinkStation,
            orbitalSlot: orbitalSlot
        });
        let ciUplinkAdjacentSatellite = ciUplinkSatelliteObject.ci;

        // Uplink cross-polarization interferences
        let ciUplinkXpol = 30; // default, assume the antenna points correctly

        // Uplink cross cells interferences
        let ciUplinkXCells = this.ciCrossCells(transponder, "uplink", uplinkStation);

        // -------------------------------Downlink Interferences ---------------------------------------------

        // Downlink adjacent satellite interferences
        let downlink_adj_sat_interferences = {}
        let ciDownlinkAdjacentSatelliteObject = this.ciAdjacentSatellite({
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
        let ciDownlinkXcells = this.ciCrossCells(transponder, "downlink", downlinkStation);

        // Total C/I uplink
        let ciUplink = Utils.cnOperation(ciUplinkIntermod, ciUplinkAdjacentSatellite, ciUplinkXpol, ciUplinkXCells);

        // Total C/I downlink
        let ciDownlink = Utils.cnOperation(ciDownlinkIntermod, ciDownlinkAdjacentSatellite, ciDownlinkXpol, ciDownlinkXcells);

        this.logMessage('------Interferences------');
        this.logMessage('C/I Up X-pol = ' + ciUplinkXpol);
        this.logMessage('C/I Up Intermod = ' + ciUplinkIntermod);
        this.logMessage('C/I Up Adj. Sat = ' + ciUplinkAdjacentSatellite);
        this.logMessage('C/I Up Adj. Cells = ' + ciUplinkXCells);
        this.logMessage('C/I Down X-pol = ' + ciDownlinkXpol);
        this.logMessage('C/I Down Intermod = ' + ciDownlinkIntermod);
        this.logMessage('C/I Down Adj. Sat = ' + ciDownlinkAdjacentSatellite);
        this.logMessage('C/I Down Cross Cells = ' + ciDownlinkXcells);
        this.logMessage(`C/I Up Total = ${ciUplink} dB`)
        this.logMessage(`C/I Down Total = ${ciDownlink} dB`)

        // ---------------------------------- C/N Total ---------------------------------------------

        let cnTotal = Utils.cnOperation(cnUplink, cnDownlink, ciUplink, ciDownlink);

        // If this is TOLL platform, include warble loss
        // if(application.name == "TOLL"){
        //     let numChannels = symbolRate(bandwidth, application) / 3.375;
        //     let warbleLoss = 10 * log10((Math.pow(10,2.2/10) + numChannels - 1) / numChannels);
        //     this.logMessage('This is TOLL. Warble loss = ' + warbleLoss + ' dB');
        //     this.logMessage('C/N Total before warble loss = ' + cnTotal + ' dB');
        //     cnTotal -= warbleLoss;
        //     _.assign(result, {warble_loss: warbleLoss});
        // }

        let linkAvailability = Utils.totalAvailability(this.uplinkAvailability, uplinkStation.site_diversity, this.downlinkAvailability, downlinkStation.site_diversity);
        let linkMargin = cnTotal - this.mcg.es_no;
        let passed = linkMargin > this.requiredMargin;

        this.logMessage('-------Total---------');
        this.logMessage('C/N Total: ' + cnTotal + ' dB');
        this.logMessage('Link margin ' + linkMargin + ' dB');
        this.logMessage('Pass? ' + passed);
        this.logMessage('Total link availability: ' + linkAvailability);

        // ---------------------------------- Data Rate ---------------------------------------------

        let dataRate = Utils.symbolRate(this.occupiedBandwidth, this.application) * this.mcg.spectral_efficiency;
        this.logMessage(`Data rate = ${dataRate} Mbps`)
        this.logMessage(`MCG = ${this.mcg.name}`)
        this.logMessage(`Occupied bandwidth = ${this.occupiedBandwidth} MHz`)

        // For TOLL, data_rate is a little complicated....
        // if (this.application.name == "TOLL") {
        //     this.logMessage('Find data rate for TOLL...');
        //     let bit_rate_channel_0 = 0;
        //     // if use code higher than QPSK 835, the bit rate channel 0 will be at most QPSK 835
        //     if (mcg.spectral_efficiency > 1.67) {
        //         bit_rate_channel_0 = _.where(application.mcgs, {name: "QPSK835"})[0].bit_rate_per_slot;
        //     }
        //     else {
        //         bit_rate_channel_0 = mcg.bit_rate_per_slot;
        //     }
        //     this.logMessage("Bit rate channel 0 = " + bit_rate_channel_0);
        //
        //     let num_channels = Utils.symbolRate(bandwidth, this.application) / 3.375;
        //     this.logMessage('Num of channels = ' + num_channels);
        //
        //     dataRate = ((num_channels - 1) * 252 * mcg.bit_rate_per_slot + 250 * bit_rate_channel_0) / 1000;
        //
        //     let data_rate_ipstar_channel = dataRate / num_channels;
        //     _.assign(result, {data_rate_ipstar_channel: Utils.round(data_rate_ipstar_channel, 2) });
        // }
        //
        // if (this.application.name == "STAR") {
        //     this.logMessage('Find data rate for STAR....');
        //     // round down the normal data rate (from symbol rate x MBE) value to predefined values
        //     let bit_rates_without_header = [0, 0.1168, 0.1603, 0.2513, 0.3205, 0.5026, 0.6411, 1.0052, 1.2821, 2.0105, 2.5642, 4.021];
        //     let temp = 0;
        //     _.each(bit_rates_without_header, function (item) {
        //         if (item < dataRate && item > temp) {
        //             temp = item;
        //         }
        //     })
        //     dataRate = temp;
        // }


        // ---------------------------------- Power utilization -------------------------------------

        // Calculate power utilization percentage by comparing real carrier PFD and operating PFD per carrier
        // PFD diff is positive if overused
        let pfdDiff = carrierPfd - operatingPfdPerCarrier;
        let powerUtilPercent = 100 * Math.pow(10, pfdDiff / 10);

        // Calculate guard band in percent for this carrier
        // Conventional result needs this as Sales team do not accept the bandwidth in decimal
        let roundupBandwidth = Math.ceil(this.occupiedBandwidth);
        let guardband = Utils.round(((roundupBandwidth - this.occupiedBandwidth) * 100 / this.occupiedBandwidth), 2);


        // Store the letiables in the result object.
        // We will use this object to represent all parameters in the result.

        _.assign(result, {
            // satellite
            channel: transponder.name,
            operatingMode: transponder.mode,
            operatingSfd: Utils.round(operatingPfd, 2),
            operatingPfdPerCarrier: Utils.round(operatingPfdPerCarrier, 2),
            carrierPfd: Utils.round(carrierPfd, 2),
            carrierObo: Utils.round(carrierOutputBackoff, 2),
            gainVariation: Utils.round(gainVariation, 2),
            // uplink
            uplinkAntenna: uplinkStation.antenna,
            uplinkHpa: uplinkStation.hpa,
            uplinkPointingLoss: Utils.round(uplink_pointingLoss, 2),
            uplinkXpolLoss: Utils.round(uplinkXpolLoss, 2),
            uplinkAtmLoss: Utils.round(uplinkAtmLoss, 2),
            uplinkEirp: Utils.round(eirpUp, 2),
            uplinkGt: Utils.round(uplinkGt, 2),
            uplinkPathLoss: Utils.round(uplinkPathLoss, 2),
            uplinkCondition: this.condition,
            uplinkAvailability: Utils.round(this.uplinkAvailability, 2),
            uplinkLocation: uplinkStation.location,
            uplinkContour: uplinkContour,
            operatingHpaPower: Utils.round(operatingHpaPower, 2),
            cnUplink: Utils.round(cnUplink, 2),
            // downlink
            downlinkAntenna: downlinkStation.antenna,
            // Following 3 parameters are aAvailable only if G/T is not specified in the antenna spec
            antennaTemp: _.has(downlinkStation.antenna, 'gt') ? 'N/A' : Utils.round(Antenna.temp(downlinkAtmLoss, this.condition), 2),
            systemTemp: _.has(downlinkStation.antenna, 'gt') ? 'N/A' : Utils.round(Station.systemTemp(Antenna.temp(downlinkAtmLoss, this.condition)), 2),
            antGain: _.has(downlinkStation.antenna, 'gt') ? 'N/A' : Utils.round(downlinkStation.antenna.rxGain(downlinkFrequency), 2),
            downlinkPointingLoss: Utils.round(downlinkPointingLoss, 2),
            downlinkXpolLoss: Utils.round(downlinkXpolLoss, 2),
            downlinkAtmLoss: Utils.round(downlinkAtmLoss, 2),
            downlinkEirp: Utils.round(carrierEirpDownAtLocation, 2),
            saturatedEirpAtLoc: Utils.round(saturatedEirpDownAtLocation, 2),
            downlinkGt: Utils.round(antGt, 2),
            downlinkPathLoss: Utils.round(downlinkPathLoss, 2),
            downlinkCondition: this.condition,
            downlinkAvailability: Utils.round(this.downlinkAvailability, 2),
            downlinkContour: downlinkContour,
            downlinkLocation: downlinkStation.location,
            cnDownlink: Utils.round(cnDownlink, 2),
            // interferences
            ciUplinkIntermod: Utils.round(ciUplinkIntermod, 2),
            ciUplinkAdjSat: Utils.round(ciUplinkAdjacentSatellite, 2),
            ciUplinkXpol: Utils.round(ciUplinkXpol, 2),
            ciUplinkXcells: Utils.round(ciUplinkXCells, 2),
            ciDownlinkAdjSat: Utils.round(ciDownlinkAdjacentSatellite, 2),
            ciDownlinkAdjSatObj: ciDownlinkAdjacentSatelliteObject,
            ciDownlinkIntermod: Utils.round(ciDownlinkIntermod, 2),
            ciDownlinkXpol: Utils.round(ciDownlinkXpol, 2),
            ciDownlinkXcells: Utils.round(ciDownlinkXcells, 2),
            ciUplink: Utils.round(ciUplink, 2),
            ciDownlink: Utils.round(ciDownlink, 2),
            // total
            cnTotal: Utils.round(cnTotal, 2),
            linkMargin: Utils.round(linkMargin, 2),
            requiredMargin: this.requiredMargin,
            passed: passed,
            passedText: passed ? 'Yes' : 'No',
            linkAvailability: Utils.round(linkAvailability, 2),
            mcg: this.mcg,
            occupiedBandwidth: Utils.round(this.occupiedBandwidth, 2),
            noiseBandwidth: Utils.round(noiseBandwidth, 2),
            roundupBandwidth: Utils.round(roundupBandwidth, 2),
            guardband: guardband,
            dataRate: Utils.round(dataRate, 2),
            powerUtilPercent: Utils.round(powerUtilPercent, 2),
            rollOffFactor: this.application.roll_off_factor
        });

        if (this.findMaxCoverage) {
            _.assign(result, {
                maxContour: this.maxContour
            })
        }

        this.logMessage('-----------')
        this.logMessage('***********')
        this.logMessage('-----------')

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

        var path = data.path, channel = data.channel, interference_channels = data.interference_channels,
            location = data.location;
        var ci = 30; //default value

        //if the channel database specifies this value (Thaicom 4 Forward Ka uplink and Thaicom 4 Return Ka downlink)
        if (_.has(channel, 'ci_' + path + '_adj_sat')) {
            ci = channel['ci_' + path + '_adj_sat'];
            ci_objects.push({
                interference: false,
                name: "no interference",
                value: ci
            });
        }

        // ------------------------------ Separate by Thaicom 4 and Conventional --------------------------

        else if (this.satellite.isBroadband) {
            if (_.has(channel, 'eirp_density_adjacent_satellite_' + path)) {

                if (channel['eirp_density_adjacent_satellite_' + path] == -100) {
                    ci = 50;
                    ci_objects.push({
                        interference: false,
                        name: "no interference",
                        value: ci
                    });
                }
                else {
                    var deg_diff = Math.abs(data.orbital_slot - channel.adjacent_satellite_orbital_slot);
                    let grr = data.station.antenna.gainRejectionRatio(channel[path + '_cf'], deg_diff)
                    let gainImprovement = data.station.antenna.gainImprovment(deg_diff)
                    ci = data.eirp_density - channel['eirp_density_adjacent_satellite_' + path] + grr + gainImprovement;
                    this.logMessage('eirp den = ' + data.eirp_density + ' eirp_den_sat = ' + channel['eirp_density_adjacent_satellite_' + path] + ' grr = ' + grr + ' gain improve = ' + gainImprovement);

                    ci_objects.push({
                        interference: true,
                        name: "Interference from slot " + channel.adjacent_satellite_orbital_slot,
                        value: Utils.round(ci, 2)
                    });
                }


            }
        }

        else {
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
                        var eirp_density = data.eirp_density, diameter = data.diameter,
                            orbital_slot = data.orbital_slot;

                        var intf_sat = Satellites.findOne({name: intf.satellite});
                        var deg_diff = (Math.abs((orbital_slot - intf_sat.orbital_slot)) - 0.15) * 1.1; // Topocentric Angle | from P'Oui, 8 July 2014

                        this.logMessage('Finding interferences from satellite ' + intf.satellite + ' channel: ' + intf.name + ' at ' + intf_sat.orbital_slot + ' degrees');

                        // find the gain rejection ratio (relative gain)
                        var grr = data.station.antenna.gainRejectionRatio(channel[path + '_cf'], deg_diff);
                        this.logMessage('GRR of ' + data.station.antenna.size + ' m. antenna at ' + deg_diff + ' degrees = ' + grr + ' dB');

                        // find the EIRP of the location on that satellite from the database
                        var loc = Locations.findOne({name: location.name});

                        // location is not found
                        if (!location) continue;

                        var loc_data = loc.data.find(l => l.beam === intf[path + '_beam' && l.satellite === intf.satellite && l.type === path])

                        // location is found, but this location is not under this beam contour
                        if (!loc_data) continue;

                        // compare with EIRP down of adjacent satellite channels
                        if (path === "downlink") {

                            this.logMessage('The location ' + loc.name + ' has value on beam ' + loc_data.beam + ' = ' + loc_data.value);

                            // find the output backoff of the interfered channels
                            var intf_obo = intf.backoff_settings.find(s => s.num_carriers === intf.current_num_carriers).obo

                            // find EIRP density of interfered channels at that location
                            var intf_eirp_density = loc_data.value + intf_obo - 10 * Utils.log10(intf.bandwidth * Math.pow(10, 6));

                            this.logMessage("EIRP density for " + intf.satellite + ' ' + intf.name + ' = ' + intf_eirp_density + ' dBW');

                            // return C/I = our eirp density - intf eirp density + GRR + polarization improvement
                            var c_intf = eirp_density - intf_eirp_density + grr + polImprovement(channel[path + '_pol'], intf[path + '_pol']);

                            this.logMessage("C/I for " + channel.satellite + ' ' + channel.name + ' = ' + c_intf + ' dB');

                            ci_objects.push({
                                interference: true,
                                name: intf.satellite + " " + intf.name,
                                value: Utils.round(c_intf, 2),
                                satellite: intf.satellite,
                                channel: intf.name
                            });

                            ci = Utils.cnOperation(ci, c_intf);

                        }


                    }
                }
            }
        }

        ci_objects.ci = ci;

        return ci_objects;

        function polImprovement(our_pol, intf_pol) {
            var circular_pols = ["LHCP", "RHCP"];
            var linear_pols = ["H", "V"];

            // if our pol is linear and intf pol is circular, we gain +3
            if (_.includes(linear_pols, our_pol) && _.includes(circular_pols, intf_pol)) {
                return 3;
            }
            // and vice versa, we gain -3
            else if (_.includes(circular_pols, our_pol) && _.includes(linear_pols, intf_pol)) {
                return -3;
            }
            else return 0;
        }
    }


    // Return C/I cross cells from the given channel, path and location
    ciCrossCells(channel, path, station) {
        var ci = 50 // default value for C/I
        if (path == "uplink") {
            // For Thaicom 4 forward channels KA-uplink (or Ku for BC)
            if (channel.ci_uplink_adj_cell) {
                ci = channel.ci_uplink_adj_cell;
            }
            // For Thaicom 4 return channels Ku-uplink
            else if (channel.ci_uplink_adj_cell_50 && channel.ci_uplink_adj_cell_eoc) {
                // If location is between peak and 50%, C/I = C/I at 50% plus the distance between 50% and that location
                // (if closer to peak, C/I is better)
                this.logMessage('This is Thaicom 4 Ku-Uplink return')
                if (station.contour >= channel.contour_50) {
                    this.logMessage('Location is between peak and 50%')

                    ci = channel.ci_uplink_adj_cell_50 + (station.contour - channel.contour_50);
                }
                // If location is between 50% and EOC, C/I = linear interpolation of C/I at 50% and C/I at EOC
                else if (station.contour < channel.contour_50 && station.contour >= channel.contour_eoc) {
                    this.logMessage('Location is between 50% and EOC')

                    ci = Utils.linearInterpolation(station.contour, channel.contour_50, channel.contour_eoc, channel.ci_uplink_adj_cell_50, channel.ci_uplink_adj_cell_eoc);
                }
                // If location is beyond EOC, C/I = C/I at EOC minus the distance between EOC and that location
                // (if farther from EOC, C/I is worse)
                else {
                    this.logMessage('Location is farther than EOC')
                    ci = channel.ci_uplink_adj_cell_eoc + (station.contour - channel.contour_eoc);
                }
            }
            else {
            }
        }
        else { // downlink
            // For Thaicom 4 return channels KA-downlink
            if (channel.ci_downlink_adj_cell) {
                ci = channel.ci_downlink_adj_cell;
            }
            // For Thaicom 4 forward channels Ku-downlink
            else if (channel.ci_downlink_adj_cell_50 && channel.ci_downlink_adj_cell_eoc) {
                // If location is between peak and 50%, C/I = C/I at 50% plus the distance between 50% and that location
                // (if closer to peak, C/I is better)
                if (station.contour >= channel.contour_50) {
                    this.logMessage('Location is between peak and 50%')
                    ci = channel.ci_downlink_adj_cell_50 + (station.contour - channel.contour_50);
                }
                // If location is between 50% and EOC, C/I = linear interpolation of C/I at 50% and C/I at EOC
                else if (station.contour < channel.contour_50 && station.contour >= channel.contour_eoc) {
                    this.logMessage('Location is between 50% and EOC')
                    ci = Utils.linearInterpolation(station.contour, channel.contour_50, channel.contour_eoc, channel.ci_downlink_adj_cell_50, channel.ci_downlink_adj_cell_eoc);
                }
                // If location is beyond EOC, C/I = C/I at EOC minus the distance between EOC and that location
                // (if farther from EOC, C/I is worse)
                else {
                    this.logMessage('Location is farther than EOC')
                    ci = channel.ci_downlink_adj_cell_eoc + (station.contour - channel.contour_eoc);
                }
            }
            else {
            }
        }

        return ci;
    }

    extractUniqueRemoteLocations() {
        return _.uniq(_.map(this.remoteStations, 'location'))
    }

    findApplicationByPath(path) {
        return this.modem.applications.find(app => app.type === path || app.type === 'SCPC' || app.type === 'broadcast')
    }

    findBestTransponderFromLocationAndSatellite({location, satellite}) {
        return {}
    }

    findContourRange() {
        return {
            max: 0,
            min: -15
        }
    }

    // If default gateway is selected, get the gateway from the database
    async findGateway(transponder) {
        //return Gateways.findOne({ name: this.transponder.default_gateway })
        this.logMessage(`transponder default gateway is ${transponder.default_gateway}`)

        if (this.useDefaultGateway) {
            let gw = await Gateways.findOne({name: transponder.default_gateway})
            return gw
        } else {
            return {}
        }

    }

    findLowerBandwidthPool() {

        // Check the the application has array of available symbol rates
        if (!_.has(this.application, 'symbol_rates') || application.symbol_rates.length == 0) {
            this.logMessage("Cannot find list of available symbol rates.")
            return false;
        }
        let symbolRate = _.filter(this.application.symbol_rates, sr => {
            return sr < this.occupiedBandwidth / this.application.roll_off_factor;
        })
        // Return array of bandwidth from symbol rate
        return _.map(symbolRate, item => {
            if (this.application.name == "TOLL") {
                return (item / 1000) + 3.375;
            }
            return (item / 1000) * this.application.roll_off_factor;
        })
    }

    findLowerMcgsThanClearSky(inputMcg) {
        // Assume the MCG in the application is sorted from lowest to highest efficiency
        let mcgs = this.application.mcgs.filter(mcg => mcg.spectral_efficiency <= inputMcg.spectral_efficiency)
        // Return sorted mcg by spectral efficiency
        return _.sortBy(mcgs, num => {
            return num.spectral_efficiency;
        })
    }

    async findMatchingReturnContour(satellite, beam, contourValue) {
        return await Contour.getMatchingReturnContour({satellite, beam, contourValue})
    }

    findSatellite(transponder) {
        // return Satellites.findOne({name: transponder.satellite})
        try {
            let result = this.satellites.find(s => s.name === transponder.satellite)
            // this.logMessage(result)
            return result;

        } catch (e) {
            this.logMessage(e)
            return null;
        }
    }

    async findTransponderByPath(transponder, path) {
        return await Transponders.findOne({
            satellite: transponder.satellite,
            type: {$in: [path, 'broadcast']},
            name: transponder.name
        })
        // return Transponders.findOne({satellite: transponder.satellite, type: {$in: [path, 'broadcast']}, name: transponder.name}).then(result => {
        //     return result
        // }).catch(err => {
        //     this.logMessage(err);
        // });
        // this.logMessage(`Finding transponders for: ${transponder.name}, ${path}`)
        // // this.logMessage(transponder)
        // try {
        //     let result = await Transponders.findOne({satellite: transponder.satellite, type: {$in: [path, 'broadcast']}, name: transponder.name})
        //     this.logMessage(`Result transponder is ${result.name} at ${result.type}`)
        //     return result;
        //
        // } catch (e) {
        //     this.logMessage(e)
        //     return null;
        // }
    }

    logMessage(message, level = 5) {
        if (this.debugLevel >= level) {
            console.log(message)
        }
    }

    logTitle(string) {
        console.log('---------------------- ' + string + ' ----------------------');
    }

    pushResult(result, path) {
        let assumptions = {
            remoteStation: this.remoteStation,
            gateway: this.gateway,
            satellite: this.satellite,
            findBestTransponders: this.findBestTransponders,
            findMaxCoverage: this.findMaxCoverage,
            maxMode: this.maxMode
        };
        this[path + 'LinkResults'].push({
            assumptions,
            clearSky: result.clearSky,
            rainFade: result.rainFade
        })
    }

    // Copied from old program
    seekOccupiedBandwidth() {

        let app = this.application, bt = this.application.roll_off_factor, unit = this.bandwidthUnit,
            value = this.bandwidthValue,
            mcg = this.mcg

        this.logMessage('Calculate bandwidth from App ' + app.name + " mcg = " + mcg.name + " spec.eff = " + mcg.spectral_efficiency);
        this.logMessage('Bandwidth input = ' + value + " " + unit + " | BT = " + bt);

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
            this.logMessage("Unit of bandwidth error.");
            return false;
        }
        this.logMessage("Symbol rate = " + sr + " ksps");

        // check if symbol rate is higher than the max symbol rate
        var sr_2 = 0;
        if (_.has(app, 'maximum_symbol_rate') && sr > app.maximum_symbol_rate) {
            this.logMessage('Symbol rate of ' + sr + ' ksps is higher than max symbol rate of this app (' + app.maximum_symbol_rate + ' ksps)');
            sr_2 = app.maximum_symbol_rate;
        }

        // check if symbol rate is lower than the min symbol rate
        else if (_.has(app, 'minimum_symbol_rate') && sr < app.minimum_symbol_rate) {
            this.logMessage('Symbol rate of ' + sr + ' ksps is lower than minimum symbol rate of this app (' + app.minimum_symbol_rate + ' ksps)');
            sr_2 = app.minimum_symbol_rate;
        }

        // check if symbol rate is among the list of available symbol rates in the app
        else {
            // if the app does not contain the symbol rate property or symbol rate array has no elements, it means the symbol can be any value (between min and max)
            if (!(_.has(app, 'symbol_rates')) || app.symbol_rates.length == 0) {
                sr_2 = sr;
            }
            else if (_.includes(app.symbol_rates, sr)) {
                this.logMessage('The app contains symbol rate of ' + sr + " ksps");
                sr_2 = sr;
            }
            else {
                // find the lowest symbol rate available in the app which is higher than that value
                sr_2 = _.min(_.filter(app.symbol_rates, function (num) {
                    return num > sr;
                }));
                this.logMessage('Symbol rate of ' + sr + ' ksps is not in the symbol rate pools of this app, so we find the closest one.')
            }
        }
        this.logMessage("Symbol rate after app limitation = " + sr_2 + " ksps");

        // return the occupied bandwidth in MHz

        // for TOLL, the noise bandwidth to occupied bandwidth will use different formula

        var occ_bw = (sr_2 / 1000) * bt;

        if (app.name == "TOLL") { // add one channel to get occupied bandwidth
            occ_bw = (sr_2 / 1000) + 3.375;
            this.logMessage('TOLL. Add 1 channel from SR = ' + sr_2 + ' ksps to get bw = ' + occ_bw + ' MHz');
        }

        this.occupiedBandwidth = occ_bw;
    }
}


module.exports = LinkBudget