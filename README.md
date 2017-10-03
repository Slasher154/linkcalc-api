**All satellites**
----
  Returns all satellites in the database.

* **URL**

  /satellites

* **Method:**

  `GET`
 
* **Success Response:**

  * **Code:** 200 <br />
    **Content:** 
    
    ```
    {
        "satellites": [
            {
                "_id": "24dvCxchHHKYHdoh4",
                "name": "Express-AM4",
                "orbital_slot": 80,
                "type": "Conventional",
                "isThaicom": false,
                "isActive": true
            },
            .....
            // remaining satellites
            ]
    }
    ```
 
* **Error Response:**

  * **Code:** 404 NOT FOUND <br />

**Single satellite by ID**
----
  Returns a satellite from a given ID.

* **URL**

  /satellites/:id

* **Method:**

  `GET`
  
*  **URL Params**

   **Required:**
 
   `id=String`
 
* **Success Response:**

  * **Code:** 200 <br />
    **Content:** 
    
    ```
    {
        "satellite": {
            "_id": "Q962ttEf4266TwTB4",
            "name": "IPSTAR",
            "orbital_slot": 119.5,
            "skb": 0.05,
            "type": "Broadband",
            "isThaicom": true,
            "isActive": true
        }
    }
    ```
 
* **Error Response:**

  * **Code:** 404 NOT FOUND <br />

* **Sample Call:**

  ```javascript
    $.ajax({
      url: "/satellites/Q962ttEf4266TwTB4",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```
  
**Beams by satellite ID**
----
  Returns all beams from given satellite ID. Returns result are alphabetically sorted.
  
  * **URL**
  
    /beams/:satelliteId
  
  * **Method:**
  
    `GET`
    
  *  **URL Params**
  
     **Required:**
   
     `satelliteId=String`
   
  * **Success Response:**
  
    * **Code:** 200 <br />
      **Content:** 
      
      ```
      {
          "beams": [
              "C1",
              "C2",
              "Ku"
          ]
      }
      ```
   
  * **Error Response:**
  
    * **Code:** 404 NOT FOUND <br />
  
  * **Sample Call:**
  
    ```javascript
      $.ajax({
        url: "/beams/CKpWDd5tYjvWYRGmJ", // Thaicom 6
        dataType: "json",
        type : "GET",
        success : function(r) {
          console.log(r);
        }
      });
    ```
    
**Beams by satellite name**
----
  Returns all beams from given satellite name. Returns results are alphabetically sorted.
  
  * **URL**
  
    /beams
  
  * **Method:**
  
    `POST`
    
  * **Data Params**

    `{ satellite: <satellite name> }`
   
  * **Success Response:**
  
    * **Code:** 200 <br />
      **Content:** 
      
      ```
      {
          "beams": [
              "Extended C",
              "Global C",
              "Standard C",
              "Steerable KU",
              "Thailand KU"
          ]
      }
      ```
   
  * **Error Response:**
  
    * **Code:** 404 NOT FOUND <br />
  
  * **Sample Call:**
  
    ```javascript
      $.ajax({
        url: "/beams", 
        data: { satellite: 'Thaicom 5' },
        dataType: "json",
        type : "POST",
        success : function(r) {
          console.log(r);
        }
      });
    ```
    
**Beams by satellite ID**
----
  Returns all beams from given satellite ID. Returns results are alphabetically sorted.
  
  * **URL**
  
    /beams/:satelliteId
  
  * **Method:**
  
    `GET`
    
  *  **URL Params**
  
     **Required:**
   
     `satelliteId=String`
   
  * **Success Response:**
  
    * **Code:** 200 <br />
      **Content:** 
      
      ```
      {
          "beams": [
              "C1",
              "C2",
              "Ku"
          ]
      }
      ```
   
  * **Error Response:**
  
    * **Code:** 404 NOT FOUND <br />
  
  * **Sample Call:**
  
    ```javascript
      $.ajax({
        url: "/beams/CKpWDd5tYjvWYRGmJ", // Thaicom 6
        dataType: "json",
        type : "GET",
        success : function(r) {
          console.log(r);
        }
      });

**All transponders**
----
  Returns all transponders in the database.

* **URL**

  /transponders

* **Method:**

  `GET`
 
* **Success Response:**

  * **Code:** 200 <br />
    **Content:** 
    
    ```
    
    "transponders": [
        {
            "_id": "3yuXhekavq24mRRrW",
            "name": "1B",
            "satellite": "Apstar-7",
            "uplink_cf": 5.885,
            "downlink_cf": 3.66,
            "bandwidth": 36,
            "type": "broadcast", ]
            ....
    }              
    ```
 
* **Error Response:**

  * **Code:** 404 NOT FOUND <br />
 
 * **Sample Call:**
   
     ```javascript
       $.ajax({
         url: "/allTransponders",
         dataType: "json",
         type : "GET",
         success : function(r) {
           console.log(r);
         }
       });

**Transponders by beam name**
----
  Returns all transponder from a given beam name
  
  * **URL**
  
    /transponders
  
  * **Method:**
  
    `POST`
    
  * **Data Params**
  
      `{ beam: <beam name> }`

   
  * **Success Response:**
  
    * **Code:** 200 <br />
      **Content:** 
      
      ```
      {
          "transponders": [
              {
                  "_id": "MioNfmH6HoirTKT2o",
                  "name": "1E",
                  "satellite": "Thaicom 5",
                  ...
              },
              {
                ...
              },
              ...
          ]
      }
      ```
   
  * **Error Response:**
  
    * **Code:** 404 NOT FOUND <br />
  
  * **Sample Call:**
  
    ```javascript
      $.ajax({
        url: "/transponders",
        dataType: "json",
        type : "POST",
        data: { "beam": "Extended C" },
        success : function(r) {
          console.log(r);
        }
      });

**All modems**
----
  Returns all modems in the database.

* **URL**

  /modems

* **Method:**

  `GET`
 
* **Success Response:**

  * **Code:** 200 <br />
    **Content:** 
    
    ```
    {
        "modems": [
            {
                "_id": "7LxgNPpxpBXvg8b7o",
                "name": "Hughes Jupiter",
                "vendor": "Hughes",
                ...
            },
            {
                ...
            },
            ...
        ]
    }              
    ```
 
* **Error Response:**

  * **Code:** 404 NOT FOUND <br />
 
 * **Sample Call:**
   
     ```javascript
       $.ajax({
         url: "/modems",
         dataType: "json",
         type : "GET",
         success : function(r) {
           console.log(r);
         }
       });

**All modem names**
----
  Returns all modems' name only in the database. Returned results are alphabetically sorted.

* **URL**

  /modems/name

* **Method:**

  `GET`
 
* **Success Response:**

  * **Code:** 200 <br />
    **Content:** 
    
    ```
    {
        "modems": [
            "CDM 760 Roll-off 5%",
            "Comtech 570L",
            "Comtech CDM 625 LDPC",
            "Comtech CDM750,
            ...
        ]
    }                   
    ```
 
* **Error Response:**

  * **Code:** 404 NOT FOUND <br />
 
 * **Sample Call:**
   
     ```javascript
       $.ajax({
         url: "/modems/name",
         dataType: "json",
         type : "GET",
         success : function(r) {
           console.log(r);
         }
       });

**Modem by name**
----
  Returns a modem object from a given modem name.

* **URL**

  /modems/findByName

* **Method:**

  `POST`

* **Data Params**

    `{ modem: <modem name> }`
 
* **Success Response:**

  * **Code:** 200 <br />
    **Content:** 
    
    ```
    {
        "modem": {
            "_id": "XhE636kDD9YvE7p4i",
            "name": "Comtech 570L",
            "vendor": "Comtech",
            "applications": [
                {
                    "mcgs": [
                        {
                            "es_no": 3.71,
                            "spectral_efficiency": 1.15,
                            "name": "QPSK 21/44 TPC"
                        },
                        {
                            "es_no": 6.65,
                            "spectral_efficiency": 1.8,
                            "name": "QPSK 3/4 TPC"
                        },
                        {
                            "es_no": 7.62,
                            "spectral_efficiency": 2.1,
                            "name": "QPSK 7/8 TPC"
                        },
                        {
                            "es_no": 10.28,
                            "spectral_efficiency": 2.28,
                            "name": "QPSK 0.95 TPC"
                        },
                        {
                            "es_no": 10.71,
                            "spectral_efficiency": 2.7,
                            "name": "8-PSK 3/4 TPC"
                        },
                        {
                            "es_no": 12.07,
                            "spectral_efficiency": 3.14,
                            "name": "8-PSK 7/8 TPC"
                        },
                        {
                            "es_no": 14.74,
                            "spectral_efficiency": 3.42,
                            "name": "8-PSK 0.95 TPC"
                        }
                    ],
                    "roll_off_factor": 1.3,
                    "symbol_rates": [],
                    "maximum_symbol_rate": 3000,
                    "minimum_symbol_rate": 5,
                    "link_margin": 4,
                    "acm": false,
                    "type": "SCPC",
                    "name": "SCPC"
                }
            ],
            "warning_messages": []
        }
    }                  
    ```
 
* **Error Response:**

  * **Code:** 404 NOT FOUND <br />
 
 * **Sample Call:**
   
     ```javascript
       $.ajax({
         url: "/modems/findByName",
         data: { "modem": "Comtech 570L" },
         dataType: "json",
         type : "POST",
         success : function(r) {
           console.log(r);
         }
       });

**All locations**
----
  Returns all locations in the database. This will return all data such as EIRP on each beam so it's quite a huge amount of data returned. 
  
  *There are 1083 locations in the database* 

* **URL**

  /locations

* **Method:**

  `GET`
 
* **Success Response:**

  * **Code:** 200 <br />
    **Content:** 
    
    ```
    {
        "locations": [
            {
                "_id": "2ERFuKaqAr6SDjYg3",
                "name": "TAIWAN, TAIPEI",
                "country": "TAIWAN",
                "city": "TAIPEI",
                "lon": 121.53,
                "lat": 25.08,
                "data": [
                    {
                        "value": 32,
                        "type": "downlink",
                        "beam": "Standard C",
                        "satellite": "Thaicom 5"
                    },
                    .... // more EIRP,G/T of this locaton on other beams
                ]
            },
            { ... },
        ]
    }
    ```
 
* **Error Response:**

  * **Code:** 404 NOT FOUND <br />
 
 * **Sample Call:**
   
     ```javascript
       $.ajax({
         url: "/locations",
         dataType: "json",
         type : "GET",
         success : function(r) {
           console.log(r);
         }
       });

**All locations name**
----
  Returns all locations' name only in the database. 

* **URL**

  /locations/name

* **Method:**

  `GET`
 
* **Success Response:**

  * **Code:** 200 <br />
    **Content:** 
    
    ```
    {
        "locations": [
            "AFGHANISTAN, Baghlan",
            "AFGHANISTAN, Ghazni",
            "AFGHANISTAN, Herat",
            "AFGHANISTAN, Jalalabad",
            "AFGHANISTAN, KABUL",
        ]
    }
    ```
 
* **Error Response:**

  * **Code:** 404 NOT FOUND <br />
 
 * **Sample Call:**
   
     ```javascript
       $.ajax({
         url: "/locations/name",
         dataType: "json",
         type : "GET",
         success : function(r) {
           console.log(r);
         }
       });

**Single location by name**
----
  Return a location object from given location name
    
  * **URL**
  
    /singleLocationByName
  
  * **Method:**
  
    `POST`
    
  * **Data Params**

    `{ location: <location name> }`
   
  * **Success Response:**
  
    * **Code:** 200 <br />
      **Content:** 
      
      ```
      {
          "location": {
              "_id": "2ERFuKaqAr6SDjYg3",
              "name": "TAIWAN, TAIPEI",
              "country": "TAIWAN",
              "city": "TAIPEI",
              "lon": 121.53,
              "lat": 25.08,
              "data": [
                  {
                      "value": 32,
                      "type": "downlink",
                      "beam": "Standard C",
                      "satellite": "Thaicom 5"
                  },
                  ...
              ]
          }
      }
      ```
   
  * **Error Response:**
  
    * **Code:** 404 NOT FOUND <br />
  
  * **Sample Call:**
  
    ```javascript
      $.ajax({
        url: "/singleLocationByName", 
        data: { location: "TAIWAN, TAIPEI" },
        dataType: "json",
        type : "POST",
        success : function(r) {
          console.log(r);
        }
      });
    ```
    
**Multiple locations by name**
----
  Return array of locations object from given location names
    
  * **URL**
  
    /multipleLocationsByNames
  
  * **Method:**
  
    `POST`
    
  * **Data Params**

    `"locations": <Array of location names (String)>`
   
  * **Success Response:**
  
    * **Code:** 200 <br />
      **Content:** 
      
      ```
      {
          "location": [{
              "_id": "2ERFuKaqAr6SDjYg3",
              "name": "TAIWAN, TAIPEI",
              "country": "TAIWAN",
              "city": "TAIPEI",
              "lon": 121.53,
              "lat": 25.08,
              "data": [
                  {
                      "value": 32,
                      "type": "downlink",
                      "beam": "Standard C",
                      "satellite": "Thaicom 5"
                  },
                  ...
              ]
          },
          {
              "_id": "2HqrXhvzbCd4t6FbC",
              "name": "THAILAND, Chainat",
              "country": "THAILAND",
              "city": "Chainat",
              "lon": 100.2,
              "lat": 15.2,
              "data": [
                  {
                      "value": 40.5,
                      "type": "downlink",
                      "beam": "Standard C",
                      "satellite": "Thaicom 5"
                  },
                  ...
              ]
          },
          ... // more location objects
          ]
      }
      ```
   
  * **Error Response:**
  
    * **Code:** 404 NOT FOUND <br />
  
  * **Sample Call:**
  
    ```javascript
      $.ajax({
        url: "/multipleLocationByNames", 
        data: { "locations": ["TAIWAN, TAIPEI", "THAILAND, Chainat", "JORDAN, Tafila" ] },
        dataType: "json",
        type : "POST",
        success : function(r) {
          console.log(r);
        }
      });
    ```

**Rain value**
----
  Return rain rate from given location based on ITU 1999 model
    
  * **URL**
  
    /rainValue
  
  * **Method:**
  
    `POST`
    
  * **Data Params**

    `"lat": <latitude>, "lon": <longitude>`
   
  * **Success Response:**
  
    * **Code:** 200 <br />
      **Content:** 
      
      ```
      {
          "rainValue": 107.37076810546863
      }
      ```
   
  * **Error Response:**
  
    * **Code:** 404 NOT FOUND <br />
  
  * **Sample Call:**
  
    ```javascript
      $.ajax({
        url: "/rainValue", 
        data: { "lat": 13.532, "lon": 105.67 },              
        dataType: "json",
        type : "POST",
        success : function(r) {
          console.log(r);
        }
      });
    ```
