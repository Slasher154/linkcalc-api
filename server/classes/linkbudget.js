/**
 * Created by thanatv on 11/3/17.
 */

class LinkBudget {
    constructor (requestObject) {
        for (var field in requestObject) {
            this[field] = requestObject[field]
        }
        this.init()

    }

    // Prepare parameters for link budget
    init () {

        // ---- Mapping transponders with stations

        // If finding best transponder is selected, extract unique locations out of remote stations and find the their respective best transponders

        // Otherwise, combine selected transponders with remote stations into objects

        // Run the link budget
        this.runLinkBudget()
    }

    runLinkBudget () {

        // Start looping remote stations

        // Start looping gateway/hub stations

        // Start looping platform

        // Find appropriate gateway

        // Run forward link

        // Run return link

        // Record cases

    }

    runForwardLink () {

        // Find transponder by path

        // Find application by path

        // Check if this platform is MCG fixed

        // If yes, set MCGs = all MCG given in the modem application

        // Start looping MCG

        // Seek the bandwidth

        // Check if max contour is selected

        // If yes, perform a binary search over a minimum and maximum contour range (running clear sky link)

        // If no, set parameters and then run a clear sky link

        // If no, (not fix MCG), set MCGs = all MCG given in the modem application

        // Perform a binary search over a minimum and maximum available MCGs (running clear sky link)

        // Run a rain fade link

        // Concatenate both clear sky and rain fade link objects and return results
    }

    runReturnLink () {

        // Find transponder by path

        // Find application by path

        // Check if this platform is MCG fixed

        // If yes, set MCGs = all MCG given in the modem application

        // Start looping MCG

        // Seek the bandwidth

        // Check if max contour is selected

        // If yes, perform a binary search over a minimum and maximum contour range (running clear sky link)

        // If no, set parameters and then run a clear sky link

        // If no, (not fix MCG), set MCGs = all MCG given in the modem application

        // Perform a binary search over a minimum and maximum available MCGs (running clear sky link)

        // Run a rain fade link

        // Concatenate both clear sky and rain fade link objects and return results
    }

    runClearSkyLink () {

        // Set parameters for clear sky condition

        // Run link and return result
    }

    runRainFadeLink () {

        // Set parameters for rain fade condition

        // Check MCG at clear sky result object

        // Check if modem has ACM function and dynamic channel function

        // If yes-yes, perform binary search over looping MCG and available symbol rates

        // If yes-no, perform binary search over looping MCG

        // If no-no, run link at the same code as clear sky case (there is no 'no-yes' case as dynamic channel always comes with ACM)

        // If the existing condition still does not pass, perform binary search over link availability to find max total link availability

        // Return result
    }

    runLink () {

        // Check if the transponder is operating in FGM or ALC mode

        // If FGM, find operating PFD at 100% power utilization

        // If rain fade case, EIRPup = desired level - rain

        // Otherwise, EIRPup = desired

        // If ALC, find operating PFD at desired deep-in

        // If rain-fade case, EIRPup = desired level - rain + UPC (but not more than desired)

        // Otherwise, EIRPup = desired

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

    findBestTransponderFromLocation () {

    }

    findTransponderByPath () {
    }
}




module.exports = LinkBudget