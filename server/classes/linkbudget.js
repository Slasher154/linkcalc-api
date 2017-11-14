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

        // If default gateway is selected, add a single gatewway object
        if (this.useDefaultGateway) {
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
            // console.log(`Combining transponders with remote stations`)
            // this.remoteStations.forEach(station => {
            //     console.log(`Looping stations ${station.antenna.name}`)
            //     this.transponders.forEach(transponder => {
            //         console.log(`Looping transponders ${transponder.name}`)
            //         station.transponder = transponder
            //     })
            // })
            // console.log(this.remoteStations)
        }

        // Run the link budget
        this.linkBudgetResults = []
        console.log('Start running link budgets')
        //this.runLinkBudget()
    }

    async runLinkBudget() {

        // Start looping remote stations
        for (let station of this.remoteStations) {
            // console.log(station)

            this.remoteStation = new RemoteStation(station)
            // console.log(this.remoteStation)
            this.remoteStation.print()

            // Start looping gateway/hub stations
            for (let gateway of this.gatewayStations) {

                // Start looping platform
                for (let modem of this.modemsAndMcgs) {

                    this.modem = new Modem(modem)
                    this.modem.print()

                    // Run forward link
                    console.log('Running forward link')
                    let forwardLinkResult = {}
                    let returnLinkResult = {}

                    forwardLinkResult = await this.runLinkByPath('forward')
                    returnLinkResult = await this.runLinkByPath('return')
                        // Record cases
                        console.log('Recording results')
                        this.linkBudgetResults.push({
                            forwardLink: forwardLinkResult,
                            returnLink: returnLinkResult
                        })
                    // })
                    // this.runLinkByPath('forward').then(result => {
                    //     console.log(`Forward Result : ${result}`)
                    //     forwardLinkResult = result
                    //     console.log('Running return link')
                    //     return this.runLinkByPath('return')
                    // }).then(result => {
                    //     console.log(`Return Result : ${result}`)
                    //     returnLinkResult = result
                    //
                    //     // Record cases
                    //     console.log('Recording results')
                    //     this.linkBudgetResults.push({
                    //         forwardLink: forwardLinkResult,
                    //         returnLink: returnLinkResult
                    //     })
                    // })

                    // Run return link
                    // console.log('Running return link')
                    // let returnLinkResult
                    // this.runLinkByPath('return').then(result => {
                    //     returnLinkResult = result
                    // })


                }
            }

        }
    }

    async runLinkByPath(path) {

        let linkResult = {
            forwardResult: {},
            returnResult: {}
        }

        // Set uplink and downlink station
        // console.log(this.remoteStation)


        // console.log(this.downlinkStation)

        console.log()
        console.log()
        console.log()
        console.log('--------------------------------------------')
        console.log(`----------Start running ${path} link-----------`.toUpperCase())
        console.log('--------------------------------------------')
        console.log()
        console.log()
        console.log()


        this.path = path

        // Set bandwidth value and unit
        this.bandwidthValue = this.remoteStation.bandwidth[path]
        this.bandwidthUnit = this.remoteStation.bandwidth.unit

        // Find transponder by path
        console.log(`Searching the correct transponder for ${this.remoteStation.transponder.name} on ${this.remoteStation.transponder.satellite} for ${path}`)

        let tp = await this.findTransponderByPath(this.remoteStation.transponder, path)
        this.transponder = new Transponder(tp)
        console.log('TP Name = ' + tp.name)
        // console.log(this.transponder)

        // Find and set satellite
        let sat = this.findSatellite(this.transponder)
        this.satellite = new Satellite(sat)
        console.log(`Set satellite object to ${this.satellite.name}`)
        let gw = await this.findGateway(this.transponder)

        // Find appropriate gateway
        this.gateway = new GatewayStation(gw)
        // console.log(this.gateway)
        this.gateway.print()

        // Find application by path
        this.application = this.findApplicationByPath(this.modem, path)
        console.log(`Set application name to ${this.application.name}`)

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

        // Set default link availability and site diversity based on the given stations
        this.uplinkAvailability = this.uplinkStation.gateway_availability || 99.5
        this.downlinkAvailability = this.downlinkStation.remote_availability ||  99.5

        // Check if this platform is MCG fixed
        if (!this.modem.findBestMcg) {
            console.log(`This modem is MCG fixed`)


            // If yes, set MCGs = all MCG given in the modem application

            // Start looping MCG
            for (let mcg of this.application.mcgs) {

                // Set MCG
                this.mcg = mcg
                console.log(`Setting MCG to ${this.mcg.name}`)


                // Check if max contour is selected
                if (this.findMaxCoverage) {
                    console.log(`Max coverage selected, performing binary search`)

                    // If yes, perform a binary search over a minimum and maximum contour range (running clear sky link)
                    let contourRange = this.findContourRange()
                    console.log(`Contour range of this this transponder is ${contourRange.min} to ${contourRange.max} dB`)
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
                        console.log(`Setting contour to ${currentElement} dB`)
                        console.log(`Running clear sky link`)
                        result = await this.runClearSkyLink()

                        if (result.passed) { // pass
                            minIndex = currentIndex + 1
                            console.log(`Contour ${currentElement} dB passes the condition`)
                            answer = currentElement
                        } else { // not pass
                            maxIndex = currentIndex - 1
                            console.log(`Contour ${currentElement} dB doesn't pass the condition`)
                        }
                    }
                    console.log(`Searching for max contour finished, answer is ${currentElement} dB`)
                    console.log('Saving clear sky result')
                    linkResult[path + 'Result']['clearSky'] = result

                }

                // If no, set parameters and then run a clear sky link and record the result
                console.log(`Max contour option is not selected`)
                console.log(`Running clear sky link`)
                linkResult[path + 'Result']['clearSky'] = await this.runClearSkyLink()
            }
        } else {
            console.log(`Fixed MCG is not selected`)

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
                console.log(`Setting current MCG to ${this.mcg.name}`)
                console.log(`Running clear sky link`)

                try {
                    result = await this.runClearSkyLink()
                } catch (e) {
                    console.log(e)
                }

                if (result.passed) { // pass
                    minIndex = currentIndex + 1
                    console.log(`${currentElement} passes the condition`)
                    answer = currentElement
                    resultAnswer = result
                } else { // not pass
                    maxIndex = currentIndex - 1
                    console.log(`${currentElement} doesn't pass the condition`)
                }
            }
            console.log(`Searching for best MCG finished, answer is ${answer.name}`)
            console.log('Saving clear sky result')
            linkResult[path + 'Result']['clearSky'] = resultAnswer
        }

        // Set clear sky result to instance of an object so it can get referred in rain fade case
        this.currentClearSkyResult = linkResult[path + 'Result']['clearSky']

        console.log('--------')
        console.log('--------')
        console.log('--------')
        console.log('--------')
        console.log('--------')

        // Run a rain fade link
        try {
            linkResult[path + 'Result']['rainFade'] = await this.runRainFadeLink()
        } catch (e) {
            console.log(e)
        }

        // Concatenate both clear sky and rain fade link objects and return results
        return linkResult

    }


    async runClearSkyLink() {

        console.log('Setting conditions for CLEAR SKY')
        this.condition = 'clear'
        this.requiredMargin = this.application.link_margin
        console.log(`Setting link margin to ${this.requiredMargin}`)

        // Run link and return result
        try {
            let clearSkyResult = await this.runLink()
            return clearSkyResult
        } catch(e) {
            console.log(e)
        }


    }

    async runRainFadeLink() {

        console.log('Setting conditions for RAIN FADE')
        this.condition = 'rain'
        this.requiredMargin = 0
        console.log(`Setting link margin to ${this.requiredMargin}`)

        // TODO: Find the rain fade value here

        let rainFadeResult

        // Check MCG at clear sky result object
        let mcgClearSky = this.currentClearSkyResult.mcg
        console.log(`MCG at clear sky is ${mcgClearSky.name}`)

        // Check if modem has ACM function and dynamic channel function

        // If yes-yes, perform normal search over looping MCG and available symbol rates
        if (this.application.acm && this.application.dynamic_channels) {
            console.log('This app has ACM and dynamic channels')
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
                        console.log(e)
                    }


                }
            }

            // Filter result with 2 requirements, pass margin and max data rate
            rainFadeResult = _.max(results.find(result => result.passed), item => {
                return item.data_rate;
            })
        }

        // If yes-no, perform binary search over looping MCG
        else if (this.application.acm) {
            console.log('This app has ACM (no dynamic channels)')
            let lowerMcgs = this.findLowerMcgsThanClearSky(mcgClearSky)
            console.log(lowerMcgs)
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
                console.log(`Setting MCG to ${currentElement.name}`)
                try {
                    result = await this.runLink()
                } catch(e) {
                    console.log(e)
                }

                if (result.passed) { // pass
                    minIndex = currentIndex + 1
                    console.log(`${currentElement.name} passes the rain fade condition`)
                    answer = currentElement
                    resultAnswer = result
                } else { // not pass
                    maxIndex = currentIndex - 1
                    console.log(`${currentElement.name} doesn't pass the rain fade condition`)
                }
            }
            console.log(`Searching the best MCG for rain fade finished, answer is ${answer.name}`)
            rainFadeResult = resultAnswer
        } else {
            console.log(`This app has no ACM`)
            // If no-no, run link at the same code as clear sky case (there is no 'no-yes' case as dynamic channel always comes with ACM)
            this.mcg = mcgClearSky
            console.log(`Running rain fade link`)
            try {
                rainFadeResult = await this.runLink()

            } catch (e) {
                console.log(e)
            }

            // If the existing condition still does not pass, perform binary search over link availability to find max total link availability
            if (!rainFadeResult.passed) {
                console.log(`Link does not pass at rain fade, find maximum link availability`)
                let linkAvailabilityRange = _.range(95, 99.5, 0.1)
                let minIndex = 0
                let maxIndex = linkAvailabilityRange.length - 1
                let currentIndex
                let currentElement
                let answer = 0
                let result, resultAnswer

                while (minIndex <= maxIndex) {
                    currentIndex = (minIndex + maxIndex) / 2 | 0
                    currentElement = linkAvailabilityRange[currentIndex]

                    // Set uplink or downlink availability to new value (forward link changes downlink avail, return link changes uplink avail)
                    this.path === 'forward' ? this.downlinkAvailability = currentElement : this.uplinkAvailability = currentElement
                    console.log(`Setting uplink availability to ${this.uplinkAvailability}% and downlink availability to ${this.downlinkAvailability}%`)

                    try {
                        result = await this.runLink()
                    } catch(e) {
                        console.log(e)
                    }

                    if (result.passed) { // pass
                        minIndex = currentIndex + 1
                        console.log(`${currentElement}% passes the condition`)
                        answer = currentElement
                        resultAnswer = result
                    } else { // not pass
                        maxIndex = currentIndex - 1
                        console.log(`${currentElement}% doesn't pass the condition`)
                    }
                }
                console.log(`Searching the max link availability finished, answer is ${answer}%`)
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
        console.log('Seeking occupied bandwidth')

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
        console.log(`Calculating atmospheric loss`)
        let uplinkAtmLoss = await new Atmospheric().calculateLoss({
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
        if (this.satellite.name == "IPSTAR" && _.includes(["return"], transponder.type)) {
            if (_.includes(["328", "514", "608"], transponder.uplink_beam)) { // shape beam
                gainVariation = -0.0015 * Math.pow(uplinkContour, 3) - 0.0163 * Math.pow(uplinkContour, 2) + 0.1827 * uplinkContour - 0.1737;
            }
            else {
                gainVariation = -0.0019 * Math.pow(uplinkContour, 2) + 0.2085 * uplinkContour - 0.5026;
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
            console.log(backoffSettings)

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
            if (transponder.eirp_up_channel) {
                console.log(`EIRP Up channel = ${transponder.eirp_up_channel}, Num carriers in channel = ${numCarriersInChannel}`)
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
            if (_.has(uplinkStation, 'buc')) {
                console.log("This is BUC.")
                // check if eirp of this buc & antenna can reach the desired level
                let eirpUpFromBuc = uplinkStation.eirpUplink(uplinkFrequency);

                if (eirpUp > eirpUpFromBuc) {
                    console.log("EIRP Up of " + eirpUp + " dBW is more than EIRP up from BUC which is " + eirpUpFromBuc + " dBW");
                    eirpUp = eirpUpFromBuc;
                }
                else {
                    console.log("EIRP Up of " + eirpUp + " dBW is less than EIRP up from BUC which is " + eirpUpFromBuc + " dBW");
                }
            }
            else {
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
        console.log(`EIRP up = ${eirpUp}, Uplink Tx Gain = ${uplinkStation.antenna.txGain(uplinkFrequency)}`)
        // console.log(uplinkStation)
        let hpaType = _.has(uplinkStation, 'buc') ? 'buc' : 'hpa'
        console.log(`hpa type = ${hpaType}`)
        this.logTitle(`${hpaType} = ${uplinkStation[hpaType]['ifl']} ${hpaType} OBO = ${uplinkStation[hpaType]['obo']} dB`);
        this.logTitle('OP Power = ' + operatingPowerAtHpaOutput);
        let operatingHpaPower = Math.pow(10, (operatingPowerAtHpaOutput + uplinkStation[hpaType]['ifl']) / 10);

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
        let downlinkXpolLoss = Utils.xpolLoss(),
            downlinkPointingLoss = Utils.pointingLoss(downlinkFrequency, downlinkStation.antenna.size, skb);
        console.log('Calculating downlink atm loss')
        let downlinkAtmLoss = await new Atmospheric().calculateLoss({
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
        if (this.satellite.name == "IPSTAR" && _.includes(["forward", "broadcast"], transponder.type)) {
            if (_.includes(["328", "514", "608"], transponder.downlink_beam)) { // shape beam
                gainVariation = -0.0022 * Math.pow(downlinkContour, 3) - 0.0383 * Math.pow(downlinkContour, 2) - 0.0196 * downlinkContour - 0.2043;
            }
            else {
                gainVariation = -0.0006 * Math.pow(downlinkContour, 2) + 0.1999 * downlinkContour - 0.4185;
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
        let passed = linkMargin > this.requiredMargin;

        console.log('-------Total---------');
        console.log('C/N Total: ' + cnTotal + ' dB');
        console.log('Link margin ' + linkMargin + ' dB');
        console.log('Pass? ' + passed);
        console.log('Total link availability: ' + linkAvailability);

        // ---------------------------------- Data Rate ---------------------------------------------

        let dataRate = Utils.symbolRate(this.occupiedBandwidth, this.application) * this.mcg.spectral_efficiency;

        // For TOLL, data_rate is a little complicated....
        // if (this.application.name == "TOLL") {
        //     console.log('Find data rate for TOLL...');
        //     let bit_rate_channel_0 = 0;
        //     // if use code higher than QPSK 835, the bit rate channel 0 will be at most QPSK 835
        //     if (mcg.spectral_efficiency > 1.67) {
        //         bit_rate_channel_0 = _.where(application.mcgs, {name: "QPSK835"})[0].bit_rate_per_slot;
        //     }
        //     else {
        //         bit_rate_channel_0 = mcg.bit_rate_per_slot;
        //     }
        //     console.log("Bit rate channel 0 = " + bit_rate_channel_0);
        //
        //     let num_channels = Utils.symbolRate(bandwidth, this.application) / 3.375;
        //     console.log('Num of channels = ' + num_channels);
        //
        //     dataRate = ((num_channels - 1) * 252 * mcg.bit_rate_per_slot + 250 * bit_rate_channel_0) / 1000;
        //
        //     let data_rate_ipstar_channel = dataRate / num_channels;
        //     _.assign(result, {data_rate_ipstar_channel: data_rate_ipstar_channel.toFixed(2)});
        // }
        //
        // if (this.application.name == "STAR") {
        //     console.log('Find data rate for STAR....');
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
            system_temp: _.has(downlinkStation.antenna, 'gt') ? 'N/A' : Station.systemTemp(Antenna.temp(downlinkAtmLoss, this.condition).toFixed(2)),
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
            passed: passed,
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

        console.log('-----------')
        console.log('***********')
        console.log('-----------')

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

        //if the channel database specifies this value (IPSTAR Forward Ka uplink and IPSTAR Return Ka downlink)
        if (_.has(channel, 'ci_' + path + '_adj_sat')) {
            ci = channel['ci_' + path + '_adj_sat'];
            ci_objects.push({
                interference: false,
                name: "no interference",
                value: ci
            });
        }

        // ------------------------------ Separate by IPSTAR and Conventional --------------------------

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
                    console.log('eirp den = ' + data.eirp_density + ' eirp_den_sat = ' + channel['eirp_density_adjacent_satellite_' + path] + ' grr = ' + grr + ' gain improve = ' + gainImprovement);

                    ci_objects.push({
                        interference: true,
                        name: "Interference from slot " + channel.adjacent_satellite_orbital_slot,
                        value: ci.toFixed(2)
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

                        console.log('Finding interferences from satellite ' + intf.satellite + ' channel: ' + intf.name + ' at ' + intf_sat.orbital_slot + ' degrees');

                        // find the gain rejection ratio (relative gain)
                        var grr = data.station.antenna.gainRejectionRatio(channel[path + '_cf'], deg_diff);
                        console.log('GRR of ' + data.station.antenna.size + ' m. antenna at ' + deg_diff + ' degrees = ' + grr + ' dB');

                        // find the EIRP of the location on that satellite from the database
                        var loc = Locations.findOne({name: location.name});

                        // location is not found
                        if (!location) continue;

                        var loc_data = loc.data.find(l => l.beam === intf[path + '_beam' && l.satellite === intf.satellite && l.type === path])

                        // location is found, but this location is not under this beam contour
                        if (!loc_data) continue;

                        // compare with EIRP down of adjacent satellite channels
                        if (path === "downlink") {

                            console.log('The location ' + loc.name + ' has value on beam ' + loc_data.beam + ' = ' + loc_data.value);

                            // find the output backoff of the interfered channels
                            var intf_obo = intf.backoff_settings.find(s => s.num_carriers === intf.current_num_carriers).obo

                            // find EIRP density of interfered channels at that location
                            var intf_eirp_density = loc_data.value + intf_obo - 10 * Utils.log10(intf.bandwidth * Math.pow(10, 6));

                            console.log("EIRP density for " + intf.satellite + ' ' + intf.name + ' = ' + intf_eirp_density + ' dBW');

                            // return C/I = our eirp density - intf eirp density + GRR + polarization improvement
                            var c_intf = eirp_density - intf_eirp_density + grr + polImprovement(channel[path + '_pol'], intf[path + '_pol']);

                            console.log("C/I for " + channel.satellite + ' ' + channel.name + ' = ' + c_intf + ' dB');

                            ci_objects.push({
                                interference: true,
                                name: intf.satellite + " " + intf.name,
                                value: c_intf.toFixed(2),
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
            // For IPSTAR forward channels KA-uplink (or Ku for BC)
            if (channel.ci_uplink_adj_cell) {
                ci = channel.ci_uplink_adj_cell;
            }
            // For IPSTAR return channels Ku-uplink
            else if (channel.ci_uplink_adj_cell_50 && channel.ci_uplink_adj_cell_eoc) {
                // If location is between peak and 50%, C/I = C/I at 50% plus the distance between 50% and that location
                // (if closer to peak, C/I is better)
                console.log('This is IPSTAR Ku-Uplink return')
                if (station.contour >= channel.contour_50) {
                    console.log('Location is between peak and 50%')

                    ci = channel.ci_uplink_adj_cell_50 + (station.contour - channel.contour_50);
                }
                // If location is between 50% and EOC, C/I = linear interpolation of C/I at 50% and C/I at EOC
                else if (station.contour < channel.contour_50 && station.contour >= channel.contour_eoc) {
                    console.log('Location is between 50% and EOC')

                    ci = Utils.linearInterpolation(station.contour, channel.contour_50, channel.contour_eoc, channel.ci_uplink_adj_cell_50, channel.ci_uplink_adj_cell_eoc);
                }
                // If location is beyond EOC, C/I = C/I at EOC minus the distance between EOC and that location
                // (if farther from EOC, C/I is worse)
                else {
                    console.log('Location is farther than EOC')
                    ci = channel.ci_uplink_adj_cell_eoc - (station.contour - channel.contour_eoc);
                }
            }
            else {
            }
        }
        else { // downlink
            // For IPSTAR return channels KA-downlink
            if (channel.ci_downlink_adj_cell) {
                ci = channel.ci_downlink_adj_cell;
            }
            // For IPSTAR forward channels Ku-downlink
            else if (channel.ci_downlink_adj_cell_50 && channel.ci_downlink_adj_cell_eoc) {
                // If location is between peak and 50%, C/I = C/I at 50% plus the distance between 50% and that location
                // (if closer to peak, C/I is better)
                if (station.contour >= channel.contour_50) {
                    console.log('Location is between peak and 50%')
                    ci = channel.ci_downlink_adj_cell_50 + (station.contour - channel.contour_50);
                }
                // If location is between 50% and EOC, C/I = linear interpolation of C/I at 50% and C/I at EOC
                else if (station.contour < channel.contour_50 && station.contour >= channel.contour_eoc) {
                    console.log('Location is between 50% and EOC')
                    ci = Utils.linearInterpolation(station.contour, channel.contour_50, channel.contour_eoc, channel.ci_downlink_adj_cell_50, channel.ci_downlink_adj_cell_eoc);
                }
                // If location is beyond EOC, C/I = C/I at EOC minus the distance between EOC and that location
                // (if farther from EOC, C/I is worse)
                else {
                    console.log('Location is farther than EOC')
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
        console.log(`transponder default gateway is ${transponder.default_gateway}`)

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
            console.log("Cannot find list of available symbol rates.")
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

    findSatellite(transponder) {
        // return Satellites.findOne({name: transponder.satellite})
        try {
            let result = this.satellites.find(s => s.name === transponder.satellite)
            // console.log(result)
            return result;

        } catch (e) {
            console.log(e)
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
        //     console.log(err);
        // });
        // console.log(`Finding transponders for: ${transponder.name}, ${path}`)
        // // console.log(transponder)
        // try {
        //     let result = await Transponders.findOne({satellite: transponder.satellite, type: {$in: [path, 'broadcast']}, name: transponder.name})
        //     console.log(`Result transponder is ${result.name} at ${result.type}`)
        //     return result;
        //
        // } catch (e) {
        //     console.log(e)
        //     return null;
        // }
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
    seekOccupiedBandwidth() {

        let app = this.application, bt = this.application.roll_off_factor, unit = this.bandwidthUnit, value = this.bandwidthValue,
            mcg = this.mcg

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

        if (app.name == "TOLL") { // add one channel to get occupied bandwidth
            occ_bw = (sr_2 / 1000) + 3.375;
            console.log('TOLL. Add 1 channel from SR = ' + sr_2 + ' ksps to get bw = ' + occ_bw + ' MHz');
        }

        this.occupiedBandwidth = occ_bw;
    }
}


module.exports = LinkBudget