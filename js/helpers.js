function decimalToHex(d, padding) {
  var hex = Number(d).toString(16);
  padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

  while (hex.length < padding) {
    hex = "0" + hex;
  }

  return hex;
}

function calculateCRC(localData) {
  var checkPosistion = 0;
  var outCRC = 0;
  addLog(Number("0x" + localData.substring(checkPosistion, checkPosistion + 2)));
  while (checkPosistion < 0x40000) {
    if (checkPosistion < localData.length)
      outCRC += Number("0x" + localData.substring(checkPosistion, checkPosistion + 2));
    else
      outCRC += 0xff;
    checkPosistion += 2;
  }
  return decimalToHex(outCRC & 0xffff, 4);
}

function hexToBytes(hex) {
  for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
  return new Uint8Array(bytes);
}

function bytesToHex(data) {
  return new Uint8Array(data).reduce(function (memo, i) {
    return memo + ("0" + i.toString(16)).slice(-2);
  }, "");
}

function byteToHex(intIn) {
  var stringOut = "";
  stringOut = ("0" + intIn.toString(16)).substr(-2)
  return stringOut;
}

function intToHex(intIn) {
  var stringOut = "";
  stringOut = ("0000" + intIn.toString(16)).substr(-4)
  return stringOut.substring(2, 4) + stringOut.substring(0, 2);
}

function intToHex4(intIn) {
  var stringOut = "";
  stringOut = ("00000000" + intIn.toString(16)).substr(-8)
  return stringOut;
}