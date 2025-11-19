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
const dspName = "brass";
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
brass.createDSP(audioContext, 1024)
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
//0
//==========================================================================================

function accelerationChange(accx, accy, accz) {
    // playAudio()
}
let wasPointingUp = false; // minns om vi redan var i "pekar uppåt"-läge

function rotationChange(rotx, roty, rotz) {
    if (!dspNode) return;

    // Kolla värdena i konsolen första gången så du ser hur de beter sig
    console.log("rotation:", rotx, roty, rotz);

    // Vi tolkar:
    // rotx ≈ pitch (fram/tilt), roty ≈ roll (sida)
    const pitch = rotx;
    const roll  = roty;

    // Villkor för "telefonen pekar rakt upp":
    // - pitch nära -90 (eller +90 beroende på hur du håller telefonen)
    // - roll inte för sned
    const pitchTarget   = -90;  // testa ev +90 om du ser det i loggen
    const pitchTolerance = 15;  // hur nära vi kräver att pitch ska vara
    const rollMax       = 25;   // hur mycket sidolutning vi tillåter

    const pitchDiff = Math.abs(pitch - pitchTarget);
    const pointingUp =
        (pitchDiff < pitchTolerance) &&
        (Math.abs(roll) < rollMax);

    // Endast när vi GÅR IN i "pointing up"-läge triggar vi ljud
    if (pointingUp && !wasPointingUp) {
        statusLabels[1].style("color", "pink"); // visuellt feedback
        playAudio(1.0); // max tryck när vi pekar rakt upp
    }

    // Uppdatera state
    wasPointingUp = pointingUp;
}

function mousePressed() {
   // playAudio(mouseX/windowWidth)
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
    // playAudio();
}

function getMinMaxParam(address) {
    const exampleMinMaxParam = findByAddress(dspNodeParams, address);
    // ALWAYS PAY ATTENTION TO MIN AND MAX, ELSE YOU MAY GET REALLY HIGH VOLUMES FROM YOUR SPEAKERS
    const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
    console.log('Min value:', exampleMinValue, 'Max value:', exampleMaxValue);
    return [exampleMinValue, exampleMaxValue]
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

function playAudio(pressure) {
    if (!dspNode) {
        return;
    }
    if (audioContext.state === 'suspended') {
        return;
    }
    console.log(pressure)
    dspNode.setParamValue("/brass/blower/pressure", pressure)
}

//==========================================================================================
// END
//==========================================================================================