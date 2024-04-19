const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const readlineSync = require('readline-sync');
var readline = require('readline');

// Load proto files for air, water, and weather services
const airProtoPath = __dirname + "/protos/air.proto";
const airPackageDefinition = protoLoader.loadSync(airProtoPath);
const air = grpc.loadPackageDefinition(airPackageDefinition).air;

const waterProtoPath = __dirname + "/protos/water.proto";
const waterPackageDefinition = protoLoader.loadSync(waterProtoPath);
const water = grpc.loadPackageDefinition(waterPackageDefinition).water;

const supportProtoPath = __dirname + "/protos/support.proto";
const supportPackageDefinition = protoLoader.loadSync(supportProtoPath);
const support = grpc.loadPackageDefinition(supportPackageDefinition).support;

// Create gRPC clients for air, water, and weather services
const airClient = new air.AirQualityService("localhost:40000", grpc.credentials.createInsecure());
const waterClient = new water.WaterQualityService("localhost:40000", grpc.credentials.createInsecure());
const supportClient = new support.CustomerSupportService("localhost:40000", grpc.credentials.createInsecure());

// Function to display initial menu options
function displayInitialMenu() {
  console.log("*** STARTING AIR/WATER POLLUTION TRACKING SYSTEM ***");
  console.log("Menu:");
  console.log("1. Air Pollution Tracking System");
  console.log("2. Water Pollution Tracking System");
  console.log("3. Contact Customer Support");
}

//*************** AIR ***********************
// Function to display air menu options
function displayAirMenu() {
  console.log("\n*** AIR POLLUTION TRACKING SYSTEM ***");
  console.log("1. Get Air Quality in Dublin Districts");
}
// Function to handle user's choice for air menu
function handleAirMenu() {
  displayAirMenu();
  const choice = parseInt(readlineSync.question("Choose an option: "));
  switch (choice) {
    case 1:
      getAirQuality();
      break;
    default:
      console.log("Error. Please select among the available options.");
      handleAirMenu();
  }
}
// Function to get air quality for a specific district
function getAirQuality(){
  let district = 0;
  while (district < 1 || district > 24) {
    district = parseInt(readlineSync.question("Enter the Dublin district you want to check (1-24): "));
    if (district < 1 || district > 24) {
      console.log("Sorry, the district inserted does not exist. Please, try again.");
    }
  }
  airClient.getAirQuality({ district: district }, function(error, response){
  if (error){
    console.error("Error: " + error.message);
  }else{
    console.log("\nCO2: " + response.co2Level + " ppm");
    console.log("Temperature: " + response.temperature + " °C");
    console.log("Humidity: " + response.humidity + "%");
    console.log("The air quality in district " + district + " is: " + response.airQuality);
  }
  });
}

//*************** WATER ***********************
// Function to display water menu options
function displayWaterMenu() {
  console.log("\n*** WATER POLLUTION TRACKING SYSTEM ***");
  console.log("1. Get River Liffey Water Quality Forecast");
  console.log("2. Upload Water Quality Sample");
}

// Function to handle user's choice for water menu
function handleWaterMenu() {
  displayWaterMenu();
  const choice = parseInt(readlineSync.question('Choose an option: '));
  switch (choice) {
    case 1:
      getWaterQualityForecast();
      break;
    case 2:
      uploadWaterQualitySample();
      break;
    default:
      console.log("Error. Please select among the available options.");
      handleWaterMenu();
  }
}

// Function to get River Liffey water quality forecast
function getWaterQualityForecast() {
  console.log("Receiving water quality forecast for River Liffey...\n");

  const call = waterClient.getWaterQualityForecast({});

  call.on('data', function(response) {
    console.log("\nWater quality forecast data for River Liffey:");
    console.log("- pH Level: " + response.pHLevel);
    console.log("- Temperature: " + response.temperature + " °C");
    console.log("- Dissolved Oxygen: " + response.dissolvedOxygen + " mg/L");
    console.log("The water quality in River Liffey is: " + response.waterQuality);
    console.log();
  });

  call.on('end', function() {
    console.log('Water quality forecast stream ended');
  });

  call.on('error', function(error) {
    console.error('Error:', error.message);
  });
}

// Function to upload water quality samples
function uploadWaterQualitySample() {
  console.log("Uploading water quality samples...");

  const samples = [];
  let sampleCount = 0;

  function promptSample() {
    console.log("Sample " + (sampleCount + 1) + ":");
    const pHLevel = readlineSync.question("Enter pH level - press 'q' to quit: ");
    if (pHLevel.toLowerCase() === 'q') {
      if (samples.length > 0) {
        sendSamples();
      } else {
        console.log("No samples to upload.");
      }
      return;
    }
    const temperature = readlineSync.question("Enter temperature (°C): ");
    const dissolvedOxygen = readlineSync.question("Enter dissolved oxygen (mg/L): ");
    samples.push({
      pHLevel: parseFloat(pHLevel),
      temperature: parseFloat(temperature),
      dissolvedOxygen: parseFloat(dissolvedOxygen)
    });
    sampleCount++;
    promptSample();
  }

  function sendSamples() {
  const call = waterClient.uploadWaterQualitySample(function (error, response) {
    if (error) {
      console.error("Error:", error.message);
    } else {
      console.log(response.analysisResult);
    }
  });

  samples.forEach(function(sample) {
    call.write(sample);
  });

  call.end(function() {
    console.log("Thank you, we have successfully received your samples.");
    console.log("Our lab is going to analyse them and send you a notification as soon as we have the results.");
    console.log("Number of samples requested: " + sampleCount);
  });
}
promptSample();
}

// Function to initiate a chat session with customer support
function contactCustomerSupport() {
  var name = readlineSync.question("What is your name?: ")
  var call = supportClient.contactCustomerSupport()

  call.on('data', function(resp){
    console.log(resp.name+ ':' + resp.message)
  })

  call.on('end', function(){})

  call.on('error', function(e){
    console.log("Cannot connect to chat service")
  })
  call.write({
    message: name+" joined the chat.",
    name: name
  })

  var rl =readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.on("line", function(message){
    if(message.toLowerCase() === 'quit'){
      call.write({
        message: name + " left the chatroom.",
        name: name
      })
      call.end();
      rl.close();
    }
    else{
      call.write({
        message: message,
        name: name
      })
    }
  })
}
// Wait for user's choice and navigate to the corresponding submenu
function handleMainMenu() {
  const choice = parseInt(readlineSync.question("Choose an option: "));
  switch (choice) {
    case 1:
      handleAirMenu();
      break;
    case 2:
      handleWaterMenu();
      break;
    case 3:
      contactCustomerSupport();
      break;
    default:
      console.log("Error. Please select among the available options.");
      console.log();
      displayInitialMenu();
      handleMainMenu();
  }
}

displayInitialMenu();
handleMainMenu();
