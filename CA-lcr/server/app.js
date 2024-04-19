const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load proto files
const airProtoPath = __dirname + "/protos/air.proto";
const airPackageDefinition = protoLoader.loadSync(airProtoPath);
const air = grpc.loadPackageDefinition(airPackageDefinition).air;

const waterProtoPath = __dirname + "/protos/water.proto";
const waterPackageDefinition = protoLoader.loadSync(waterProtoPath);
const water = grpc.loadPackageDefinition(waterPackageDefinition).water;

const supportProtoPath = __dirname + "/protos/support.proto";
const supportPackageDefinition = protoLoader.loadSync(supportProtoPath);
const support = grpc.loadPackageDefinition(supportPackageDefinition).support;

//*************** AIR ***********************
// Implementation of unary RPC method to get air quality for Dublin districts
function getAirQuality(call, callback) {
  const district = call.request.district;
  console.log("Received getAirQuality request");
  const airQualityData = {
    co2Level: getRandomNumber(300, 500),
    temperature: getRandomNumber(10, 30),
    humidity: getRandomNumber(30, 70),
  };
  const airQuality = determineAirQuality(airQualityData.co2Level);
  callback(null, {
    ...airQualityData,
    airQuality: airQuality,
  });
  console.log("getAirQuality request ended");
  console.log();
}

// Function to determine air quality based on CO2 level
function determineAirQuality(co2Level){
  if (co2Level < 350) {
    return "Very good";
  } else if (co2Level < 450) {
    return "Good";
  } else if (co2Level < 600) {
    return "Fair";
  } else if (co2Level < 800) {
    return "Poor";
  } else {
    return "Very poor";
  }
}

// Function to generate a random number
function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

///*************** WATER ***********************
// Function to determine water quality based on pH level
function determineWaterQuality(pHLevel) {
  if (pHLevel < 6.5) {
    return "Poor";
  } else if (pHLevel < 8) {
    return "Good";
  } else {
    return "Very good";
  }
}

// Implementation of server-side streaming RPC method for water quality forecast
function getWaterQualityForecast(call) {
  console.log("Received getWaterQualityForecast request");

  let counter = 0;

  const intervalId = setInterval(() => {
    if (counter >= 5) {
      clearInterval(intervalId);
      console.log('getWaterQualityForecast stream ended');
      console.log();
      call.end();
      return;
    }
    const waterQualityForecastData = {
      pHLevel: getRandomNumber(6, 8),
      temperature: getRandomNumber(10, 20),
      dissolvedOxygen: getRandomNumber(5, 10),
    };
    const waterQuality = determineWaterQuality(waterQualityForecastData.pHLevel);
    call.write({
      pHLevel: waterQualityForecastData.pHLevel,
      temperature: waterQualityForecastData.temperature,
      dissolvedOxygen: waterQualityForecastData.dissolvedOxygen,
      waterQuality: waterQuality,
    });
    counter++;
  }, 2000);

  call.on('end', function() {
    clearInterval(intervalId);
    console.log('Water quality forecast stream ended');
    console.log();
  });
};

// Implementation of client-side streaming RPC method for upload water quality sample
function uploadWaterQualitySample(call) {
  console.log("Received uploadWaterQualitySample request");

  let sampleCount = 0;

  call.on('data', function (sample) {
    console.log("Received water quality sample " + (++sampleCount) + ":", sample);
  });
  call.on('end', function () {
    console.log("uploadWaterQualitySample stream ended");
    console.log();
  });
  call.on('error', function (e) {
    console.error("Error:", e.message);
  });
}
//*************** CUSTOMER SUPPORT SERVICE ***********************
var clients = {}

function contactCustomerSupport(call){
  console.log("Received contactCustomerSupport request");
  call.on('data', function(chat_message){
    if(!(chat_message.name in clients)){
      clients[chat_message.name] = {
        name: chat_message.name,
        call: call}
    }
    for(var client in clients){
      clients[client].call.write({
        name: chat_message.name,
        message: chat_message.message
      })
    }
  })
  call.on('end', function(){
    console.log("contactCustomerSupport communication ended");
    call.end();
  })
  call.on('error', function(e){
    console.log(e);
  })
}

/// ************ SERVER  *************
// Create gRPC server
const server = new grpc.Server();

// Add services and implementations to the server
server.addService(air.AirQualityService.service, {
  getAirQuality,
});

server.addService(water.WaterQualityService.service, {
  getWaterQualityForecast,
  uploadWaterQualitySample,
});

server.addService(support.CustomerSupportService.service, {
  contactCustomerSupport,
});

// Start the server
server.bindAsync("0.0.0.0:40000", grpc.ServerCredentials.createInsecure(), function() {
  server.start()
})
