//==========================================================================================
// AUDIO SETUP
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

// Namnet måste matcha engine.wasm
const dspName = "engine";
const instance = new FaustWasm2ScriptProcessor(dspName);

// output to window or npm package module
if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

// Skapa DSP från engine.wasm
engine.createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams;

        // (valfritt) sätt lite default-värden
        dspNode.setParamValue("/engine/brushLevel", 0.9);
        dspNode.setParamValue("/engine/rotorLevel", 0.6);
        dspNode.setParamValue("/engine/statorLevel", 0.7);
        dspNode.setParamValue("/engine/tubeRes", 0.2);
        dspNode.setParamValue("/engine/runtime", 5.0);
        dspNode.setParamValue("/engine/gate", 0);   // starta med motor av
        dspNode.setParamValue("/engine/volume", 0.3);
    });


//==========================================================================================
// INTERACTIONS
//==========================================================================================

function accelerationChange(accx, accy, accz) {
    // valfri extra interaktion
}

let lastEngineActive = false; // minns om motorn var igång senast


function deviceMoved() {
    movetimer = millis();
    statusLabels[2].style("color", "pink");
}

function deviceTurned() {
    threshVals[1] = turnAxis;
    // Vrid telefonen (deviceTurned) -> starta motorn på ganska hög nivå
    if (typeof turntimer !== 'undefined') {
        turntimer = millis();
    }
    statusLabels[1].style("color", "pink");
    playAudio(0.8);
}


function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
    // Shaken används nu bara som visuell feedback, inte för att trigga ljud
}

function getMinMaxParam(address) {
    const exampleMinMaxParam = findByAddress(dspNodeParams, address);
    const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
    console.log('Min value:', exampleMinValue, 'Max value:', exampleMaxValue);
    return [exampleMinValue, exampleMaxValue];
}


//==========================================================================================
// AUDIO INTERACTION – ENGINE
//==========================================================================================

// Allmän wrapper: styr motorn med ett "pressure" [0,1]
function playAudio(pressure) {
    if (!dspNode) return;
    if (audioContext.state === 'suspended') return;

    const p = Math.max(0, Math.min(1, pressure)); // clamp 0..1

    // Slå på motorn om vi har lite tryck
    dspNode.setParamValue("/engine/gate", p > 0.05 ? 1 : 0);

    // Koppla pressure till maxSpeed och volume
    dspNode.setParamValue("/engine/maxSpeed", p);
    dspNode.setParamValue("/engine/volume", 0.2 + 0.8 * p);
}


//==========================================================================================
// END
//==========================================================================================