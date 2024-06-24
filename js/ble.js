function preConnect() {
  if (gattServer != null && gattServer.connected) {
    if (bleDevice != null && bleDevice.gatt.connected)
      bleDevice.gatt.disconnect();
  } else {
    connectTrys = 0;
    navigator.bluetooth.requestDevice(
      { 
        optionalServices: [
          '0000221f-0000-1000-8000-00805f9b34fb', 
          '00001f10-0000-1000-8000-00805f9b34fb', 
          '13187b10-eba9-a3ba-044e-83d3217d9a38'
        ],
        //acceptAllDevices: true
        filters: [
          { namePrefix: 'ESL' }
        ]
      }).then(device => {
      device.addEventListener('gattserverdisconnected', disconnect);
      bleDevice = device;
      connect();
    }).catch(handleError);
  }
}

function connect() {
  console.log(bleDevice);
  if (writeCharacteristic == null) {
    addLog("Connecting to: " + bleDevice.name);
    bleDevice.gatt.connect().then(server => {
      console.log('> Found GATT server');
      gattServer = server;
      return gattServer.getPrimaryService('0000221f-0000-1000-8000-00805f9b34fb');
    })
    .then(service => {
      console.log('> Found service');
      Theservice = service;
      return Theservice.getCharacteristic('0000331f-0000-1000-8000-00805f9b34fb');
    })
    .then(characteristic => {
      console.log('> Found write characteristic');
      addLog('> Found write characteristic');
      document.getElementById("connectbutton").innerHTML = 'Disconnect';
      writeCharacteristic = characteristic;
      return writeCharacteristic.startNotifications().then(() => {
        writeCharacteristic.addEventListener('characteristicvaluechanged', event => {
          var value = event.target.value;
          handleNotify(value);
        });
        connect_to_rxtx();
      });
    })
    .catch(handleError);
  }
}

function reConnect() {
  connectTrys = 0;
  if (bleDevice != null && bleDevice.gatt.connected)
    bleDevice.gatt.disconnect();
  resetVariables();
  addLog("Reconnect");
  setTimeout(function () { connect(); }, 300);
}

function disconnect() {
  resetVariables();
  console.log('Disconnected.');
  addLog('Disconnected.');
  document.getElementById("connectbutton").innerHTML = 'Connect';
}