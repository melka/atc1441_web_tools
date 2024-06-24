let bleDevice;
let gattServer;
let Theservice;
let ServiceMain;
let settingsCharacteristics;
let writeCharacteristic;
let busy = false;
let imgArray;
let imgArrayLen = 0;
let uploadPart = 0;
let startTime = 0;
let reconnectTrys = 0;

function delay(delayInms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(2);
    }, delayInms);
  });
}

function resetVariables() {
  busy = false;
  gattServer = null;
  Theservice = null;
  writeCharacteristic = null;
  document.getElementById("log").value = '';
}

function handleError(error) {
  console.log(error);
  resetVariables();
  if (bleDevice == null)
    return;
  if (reconnectTrys <= 5) {
    reconnectTrys++;
    connect();
  }
  else {
    addLog("Was not able to connect, aborting");
    reconnectTrys = 0;
  }
}

async function sendCommand(cmd) {
  if (writeCharacteristic) {
    await writeCharacteristic.writeValue(cmd);
  }
}

async function rxTxSendCommand(cmd) {
  if (settingsCharacteristics) {
    await settingsCharacteristics.writeValue(cmd);
  }
}

function readFlash(readAddress) {
  hex_address = decimalToHex(readAddress, 8);
  addLog("Reading address: " + hex_address + " now");
  raw_cmd = "04" + hex_address;
  addLog("Sending: " + raw_cmd);
  cmd = hexToBytes(raw_cmd);
  sendCommand(cmd);
  console.log('CMD was Send');
}

function readRam(readAddress) {
  hex_address = decimalToHex(readAddress, 8);
  addLog("Reading address: " + hex_address + " now");
  raw_cmd = "05" + hex_address;
  addLog("Sending: " + raw_cmd);
  cmd = hexToBytes(raw_cmd);
  sendCommand(cmd).then(() => {
    console.log('CMD was Send');
  })
    .catch(handleError);
}

function writeFW(writeAddress, data) {
}

var fwSizeComplete = 0;
var fwBytesTransmited = 0;

// Sending a 0x100 long dataset to a bank at given address
async function sendPart(address, data) {
  hex_address = decimalToHex(address, 8);
  var part_len = 480;
  while (data.length) {
    var cur_part_len = part_len;
    if (data.length < part_len)
      cur_part_len = data.length;
    var data_part = data.substring(0, cur_part_len);
    data = data.substring(cur_part_len);
    console.log("Sub Part: " + "03" + data_part);
    await sendCommand(hexToBytes("03" + data_part));
    fwBytesTransmited += cur_part_len;
    setStatus('Current part: ' + fwBytesTransmited / 2 + " All: " + fwSizeComplete / 2 + " Time: " + (new Date().getTime() - startTime) / 1000.0 + "s");
  }
  await sendCommand(hexToBytes("02" + hex_address));
  console.log("Writing bank: " + hex_address);
  await delay(50);
}

async function eraseFwArea() {
  var fwAreaSize = 0x20000;
  var fwCurAddress = 0x20000;
  while (fwCurAddress < (0x20000 + fwAreaSize)) {
    hex_address = decimalToHex(fwCurAddress, 8);
    console.log("Erasing block: " + hex_address);
    await sendCommand(hexToBytes("01" + hex_address));
    fwCurAddress += 0x1000;
  }
}

async function doCRCcheck(localCRC) {
  await sendCommand(hexToBytes("06"));
}

async function doFinalFlash(crc) {
  addLog("Sending Final flash: " + "07C001CEED" + crc);
  await sendCommand(hexToBytes("07C001CEED" + crc));
}

async function sendFile(address, data) {
  startTime = new Date().getTime();
  var part_len = 0x200;
  var addressOffset = 0;
  var inCRC = calculateCRC(data);
  addLog("File CRC = " + inCRC);
  fwSizeComplete = data.length;
  fwBytesTransmited = 0;
  await eraseFwArea();
  while (data.length) {
    var cur_part_len = part_len;
    if (data.length < part_len)
      cur_part_len = data.length;
    var data_part = data.substring(0, cur_part_len);
    data = data.substring(cur_part_len);
    await sendPart(address + addressOffset, data_part);
    addressOffset += cur_part_len / 2;
  }
  await doFinalFlash(inCRC);
}

function sendcmd(cmdTXT) {
  console.log('SendCMDnow');
  let cmd = hexToBytes(cmdTXT);
  addLog('Send CMD: ' + cmdTXT);
  console.log('Send CMD: ');
  console.log(cmdTXT);
  console.log('Send CMD bytes: ');
  console.log(cmd);
  sendCommand(cmd).then(() => {
    console.log('CMD was Send');
  })
    .catch(handleError);
}

function sendimg(cmdIMG) {
  imgArray = cmdIMG.replace(/(?:\r\n|\r|\n|,|0x| )/g, '');
  imgArrayLen = imgArray.length;
  uploadPart = 0;
  console.log('Sending image ' + imgArrayLen);
  sendCommand(hexToBytes("0000")).then(() => {
    sendCommand(hexToBytes("020000")).then(() => {
      sendIMGpart();
    })
  })
    .catch(handleError);
}

function sendIMGpart() {
  if (imgArray.length > 0) {
    let currentpart = "03" + imgArray.substring(0, 38);
    imgArray = imgArray.substring(38);
    setStatus('Current part: ' + uploadPart++);
    console.log('Curr Part: ' + currentpart);
    sendCommand(hexToBytes(currentpart)).then(() => {
      sendIMGpart();
    })
  } else {
    console.log('Last Part: ' + imgArray);
    sendCommand(hexToBytes("01")).then(() => {
      console.log('Update was send');
    })
  }
}

function handleNotify(data) {
  addLog("Got bytes: " + bytesToHex(data.buffer));
}

function connect_to_rxtx() {
  gattServer.getPrimaryServices().then(services => {
    for (var i = 0; i < services.length; i++) {
      console.log("Services: " + services[i].uuid);
      if (services[i].uuid == "00001f10-0000-1000-8000-00805f9b34fb") {
        gattServer.getPrimaryService('00001f10-0000-1000-8000-00805f9b34fb')
          .then(service => {
            addLog("Found custom Main service");
            ServiceMain = service;
            return ServiceMain.getCharacteristic('00001f1f-0000-1000-8000-00805f9b34fb');
          }).then(characteristic => {
            addLog("Found custom write characteristic");
            settingsCharacteristics = characteristic;
          }).catch();
        return;
      }
    }
  }).catch();
}

function setTime(hourOffset) {
  let unixNow = Math.round(Date.now() / 1000)+(60*60*hourOffset);

var s = new Date(unixNow*1000).toLocaleTimeString("de-DE")

  addLog("Setting time : " + s + " : dd" + intToHex4(unixNow));
  rxTxSendCommand(hexToBytes("dd" + intToHex4(unixNow)));
}

function sendForceEpd(nr)
{
  addLog("Forcing EPD : e0" + byteToHex(nr+1));
  rxTxSendCommand(hexToBytes("e0" + byteToHex(nr+1)));
}

function setStatus(statusText) {
  document.getElementById("status").innerHTML = statusText;
}

function addLog(logTXT) {
  var today = new Date();
  var time = ("0" + today.getHours()).slice(-2) + ":" + ("0" + today.getMinutes()).slice(-2) + ":" + ("0" + today.getSeconds()).slice(-2) + " : ";
  document.getElementById("log").innerHTML += time + logTXT + '<br>';
  console.log(time + logTXT);
  while ((document.getElementById("log").innerHTML.match(/<br>/g) || []).length > 10) {
    var logs_br_position = document.getElementById("log").innerHTML.search("<br>");
    document.getElementById("log").innerHTML = document.getElementById("log").innerHTML.substring(logs_br_position + 4);
  }
}

window.onload = function () {
  document.querySelector("#file").addEventListener("change", function () {
    var reader = new FileReader();
    reader.onload = function () {
      firmwareArray = bytesToHex(this.result);
      if (firmwareArray.substring(16, 24) != "4b4e4c54") {
        alert("Select file is no telink firmware .bin");
        addLog("Select file is no telink firmware .bin");
        firmwareArray = "";
        return;
      }
      addLog("File was selected, size: " + firmwareArray.length / 2 + " bytes");
      document.getElementById("cmdIMAGE").value = firmwareArray;
    }
    if (this.files[0] != null)
      reader.readAsArrayBuffer(this.files[0]);
    else
      addLog("No file selected");
  }, false);
}

function resetFileSelector() {
  document.getElementById("file").value = '';
};