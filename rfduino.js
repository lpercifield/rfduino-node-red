// RFduino Node Example
// Discover and read temperature from RFduinos running the Temperature Sketch
// https://github.com/RFduino/RFduino/blob/master/libraries/RFduinoBLE/examples/Temperature/Temperature.ino
//
// (c) 2014 Don Coleman
module.exports = function(RED) {

  function rfduinoNode(config) {

    RED.nodes.createNode(this,config);
    var node = this;
    var _peripheral;
    var _sendCharacteristic;
    var _bleAvailable = false;
     var noble = require('noble'),
     rfduino = require('./rfduino_core'),
     _ = require('underscore');
     this.log("Something happened");
     this.warn("Something happened you should know about");
// TODO why does this need to be wrapped?
var stop = function() {
    noble.stopScanning();
};

noble.on('scanStart', function() {
    console.log('Scan started');
    //setTimeout(stop, 5000);
});

noble.on('scanStop', function() {
    console.log('Scan stopped');
});

var onDeviceDiscoveredCallback = function(peripheral) {
    _peripheral = peripheral;
    console.log('\nDiscovered Peripherial ' + peripheral.uuid);

    if (_.contains(peripheral.advertisement.serviceUuids, rfduino.serviceUUID)) {
        stop();
        console.log('RFduino is advertising \'' + rfduino.getAdvertisedServiceName(peripheral) + '\' service.');

        peripheral.on('connect', function() {
            peripheral.discoverServices();
        });

        peripheral.on('disconnect', function() {
            console.log('Disconnected');
        });

        peripheral.on('servicesDiscover', function(services) {

            var rfduinoService;

            for (var i = 0; i < services.length; i++) {
                if (services[i].uuid === rfduino.serviceUUID) {
                    rfduinoService = services[i];
                    break;
                }
            }

            if (!rfduinoService) {
                console.log('Couldn\'t find the RFduino service.');
                return;
            }

            rfduinoService.on('characteristicsDiscover', function(characteristics) {
                console.log('Discovered ' + characteristics.length + ' service characteristics');

                var receiveCharacteristic;

                for (var i = 0; i < characteristics.length; i++) {
                    if (characteristics[i].uuid === rfduino.receiveCharacteristicUUID) {
                        receiveCharacteristic = characteristics[i];
                        break;
                    }
                }

                if (receiveCharacteristic) {
                    receiveCharacteristic.on('read', function(data, isNotification) {
                        // temperature service sends a float
                        //var payloadString = '{value:' + data.readFloatLE(0) + '\u00B0C' + '}';
                        var payloadString = '{ "value" : "' + data.readFloatLE(0) + '" }';
                        //var obj = {value:data.readFloatLE(0).toString()}
                        var obj = {r:data.readUInt8(0).toString(),g:data.readUInt8(2).toString(),b:data.readUInt8(4).toString(),celsius:data.readFloatLE(6).toFixed(2).toString(),fahrenheit:data.readFloatLE(11).toFixed(2).toString()}
                        //payload = r,g,b,CCCC,FFFF
                        var msg = { payload:"hi" };
                        msg.payload = obj;
                        node.send(msg);
                        //console.log(data.readFloatLE(0) + '\u00B0C');
                        //console.log(msg);
                    });

                    console.log('Subscribing for temperature notifications');
                    receiveCharacteristic.notify(true);
                }
                // TODO combine with loop above
                for (var i = 0; i < characteristics.length; i++) {
                    if (characteristics[i].uuid === rfduino.sendCharacteristicUUID) {
                        _sendCharacteristic = characteristics[i];
                        break;
                    }
                }

                // // toggle the LED on and off once a second
                // var buffer = new Buffer(1);
                // setInterval(function() {
                //     // toggle between 0 and 1
                //     if (buffer[0] === 0x1) {
                //         buffer[0] = 0x0;
                //     } else {
                //         buffer[0] = 0x1;
                //     }
                //     _sendCharacteristic.write(buffer, false)
                // }, 1000);

            });

            rfduinoService.discoverCharacteristics();

        });

        peripheral.connect();
    }
};
node.on('input', function(msg) {
    // do something with 'msg'
    console.log("Input msg: "+msg.payload.toString());
    console.log("Input msg: "+msg.topic.toString());
    if(msg.topic.toString() === "startScan"){
      if(_bleAvailable || noble.state === "poweredOn"){
        noble.startScanning([rfduino.serviceUUID], false);
      }else{
        this.warn("BLE not AVAILABLE");
      }
    }else if(msg.topic.toString()=== "LED"){
      console.log("LED val: "+parseInt(msg.payload.v));
      //var buffer = new Buffer(1);
      var ledVal = msg.payload.v;
      _sendCharacteristic.write(new Buffer(ledVal), false)
    }else if(msg.topic.toString() ==="disconnect"){
      _peripheral.disconnect();
    }
});
node.on('close', function(done) {
  _peripheral.disconnect();
  done();
});
var startScan = function(){

}
noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
      _bleAvailable = true;
      console.log("BLE AVAILABLE");
    }
});

noble.on('discover', onDeviceDiscoveredCallback);
 }

RED.nodes.registerType("rfduino",rfduinoNode);
}
