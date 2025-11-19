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

// ENGINE: styrs av tilt sida-till-sida när telefonen ligger platt i handen
function rotationChange(rotx, roty, rotz) {
    if (!dspNode) return;
    if (audioContext.state === "suspended") return;

    const pitch = rotx; // fram/bak
    const roll  = roty; // sida till sida

    console.log("rotation:", pitch, roll, rotz);

    // Telefonen "platt" ≈ pitch nära 0
    const flatTarget    = 0;
    const flatTolerance = 20;
    const isFlat = Math.abs(pitch - flatTarget) < flatTolerance;

    if (isFlat) {
        statusLabels[1].style("color", "lightgreen");
        playEngineFromTilt(roll);
        lastEngineActive = true;
    } else {
        statusLabels[1].style("color", "black");
        if (lastEngineActive) {
            dspNode.setParamValue("/engine/gate", 0); // stoppa motorn
            lastEngineActive = false;
        }
    }
}



function deviceMoved() {
    movetimer = millis();
    statusLabels[2].style("color", "pink");
}

function deviceTurned() {
    threshVals[1] = turnAxis;
}

function mousePressed() {
    // För desktop-debug – klick på skärmen -> motor på max
    playAudio(1.0);
}

function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
    // Skaka telefonen -> starta motorn på ganska hög nivå
    playAudio(0.8);
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

// Tilt-funktion (roll)
function playEngineFromTilt(roll) {
    if (!dspNode) return;
    if (audioContext.state === 'suspended') return;

    const maxTilt = 60;
    const clamped = Math.max(-maxTilt, Math.min(maxTilt, roll));
    const norm = Math.abs(clamped) / maxTilt; // 0 = platt, 1 = max tilt

    playAudio(norm);
}

//==========================================================================================
// END
//==========================================================================================