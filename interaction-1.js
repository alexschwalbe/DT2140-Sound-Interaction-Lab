//==========================================================================================
// AUDIO SETUP
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit just where you're asked to!
//------------------------------------------------------------------------------------------
//
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

// Change here to ("tuono") depending on your wasm file name
const dspName = "bubble";
const instance = new FaustWasm2ScriptProcessor(dspName);

// output to window or npm package module
if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

// The name should be the same as the WASM file, so change tuono with brass if you use brass.wasm
window[dspName].createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams
        // const exampleMinMaxParam = findByAddress(dspNodeParams, "/thunder/rumble");
        // // ALWAYS PAY ATTENTION TO MIN AND MAX, ELSE YOU MAY GET REALLY HIGH VOLUMES FROM YOUR SPEAKERS
        // const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
        // console.log('Min value:', exampleMinValue, 'Max value:', exampleMaxValue);
    });


//==========================================================================================
// INTERACTIONS
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit the next functions to create interactions
// Decide which parameters you're using and then use playAudio to play the Audio
//------------------------------------------------------------------------------------------
//
//==========================================================================================

function accelerationChange(accx, accy, accz) {
    if (!dspNode) return;

    // Beräkna ungefärlig rörelsestyrka
    const mag = Math.sqrt(accx * accx + accy * accy + accz * accz);

    // Tröskelvärde för "stor rörelse" – justera vid behov
    const largeMovementThreshold = 20; // prova gärna 10–30

    // Endast väldigt stora rörelser triggar ljudet
    if (mag > largeMovementThreshold) {
        playAudio();
    }
}

function rotationChange(rotx, roty, rotz) {
    if (!dspNode || !dspNodeParams) return;

    // Vi använder rotx (tilt sida-till-sida) som styrsignal
    const tilt = rotx; // ungefär -90 till +90 grader

    // Hämta min/max för en parameter i det aktuella WASM-ljudet
    const mainAddr = getMainParamAddress();
    const [minVal, maxVal] = getMinMaxParam(mainAddr);

    // Begränsa tilt till [-90, +90] och normalisera till [0, 1]
    const clamped = Math.max(-90, Math.min(90, tilt));
    const norm = (clamped + 90) / 180;

    // Skala till [minVal, maxVal]
    const value = minVal + norm * (maxVal - minVal);

    // Sätt parameter-värdet i DSP:n
    dspNode.setParamValue(mainAddr, value);
}

function mousePressed() {
    playAudio()
    // Use this for debugging from the desktop!
}

function deviceMoved() {
    movetimer = millis();
    statusLabels[2].style("color", "pink");
}

function deviceTurned() {
    threshVals[1] = turnAxis;
}
function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
    playAudio();
}

function getMinMaxParam(address) {
    const exampleMinMaxParam = findByAddress(dspNodeParams, address);
    // ALWAYS PAY ATTENTION TO MIN AND MAX, ELSE YOU MAY GET REALLY HIGH VOLUMES FROM YOUR SPEAKERS
    const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
    console.log('Min value:', exampleMinValue, 'Max value:', exampleMaxValue);
    return [exampleMinValue, exampleMaxValue]
}

function getMainParamAddress() {
    // Om vi har laddat parametrar från WASM, använd den första kontrollparametern
    if (dspNodeParams && dspNodeParams.length > 0 && dspNodeParams[0].address) {
        return dspNodeParams[0].address;
    }
    // Fallback om något skulle saknas
    return "/thunder/rumble";
}

//==========================================================================================
// AUDIO INTERACTION
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit here to define your audio controls 
//------------------------------------------------------------------------------------------
//
//==========================================================================================

function playAudio() {
    if (!dspNode) {
        return;
    }
    if (audioContext.state === 'suspended') {
        return;
    }
    // Hämta huvudparametern för det aktuella WASM-ljudet (t.ex. bubble)
    const mainAddr = getMainParamAddress();
    dspNode.setParamValue(mainAddr, 1);
    setTimeout(() => { dspNode.setParamValue(mainAddr, 0); }, 100);
}

//==========================================================================================
// END
//==========================================================================================