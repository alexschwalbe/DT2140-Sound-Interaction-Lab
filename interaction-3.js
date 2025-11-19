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

// Byt här till "engine" (namnet på din wasm-fil: engine.wasm)
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
    // Du kan använda accelerationen om du vill ha fler interaktioner
}

let lastEngineActive = false; // minns om motorn var igång senast

//------------------------------------------------------------------------------------------
// ENGINE: styrs av tilt sida-till-sida när telefonen ligger platt i handen
//------------------------------------------------------------------------------------------
function rotationChange(rotx, roty, rotz) {
    if (!dspNode) return;
    if (audioContext.state === "suspended") return;

    // rotx ≈ pitch (fram/bak), roty ≈ roll (sida till sida)
    const pitch = rotx;
    const roll  = roty;

    console.log("rotation:", pitch, roll, rotz);

    // 1) Kolla om telefonen ligger "platt" i handen (pitch nära 0 grader)
    const flatTarget    = 0;
    const flatTolerance = 20; // hur nära 0 för att räknas som platt
    const isFlat = Math.abs(pitch - flatTarget) < flatTolerance;

    if (isFlat) {
        // Telefonen är platt -> vi använder roll (sida-till-sida) för att styra motorn
        statusLabels[1].style("color", "lightgreen");
        playEngineFromTilt(roll);
        lastEngineActive = true;
    } else {
        // Inte platt -> stäng av motorn
        statusLabels[1].style("color", "black");
        if (lastEngineActive) {
            dspNode.setParamValue("/gate", 0); // stoppar motorn
            lastEngineActive = false;
        }
    }
}

function mousePressed() {
    // För debugging på desktop kan du ersätta tilt med musinteraktion om du vill
    // t.ex. playAudio(mouseX / windowWidth);
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
}

function getMinMaxParam(address) {
    const exampleMinMaxParam = findByAddress(dspNodeParams, address);
    // ALWAYS PAY ATTENTION TO MIN AND MAX, ELSE YOU MAY GET REALLY HIGH VOLUMES FROM YOUR SPEAKERS
    const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
    console.log('Min value:', exampleMinValue, 'Max value:', exampleMaxValue);
    return [exampleMinValue, exampleMaxValue];
}


//==========================================================================================
// AUDIO INTERACTION
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Här definierar vi våra audio-kontroller för engine.dsp
//------------------------------------------------------------------------------------------
//
//==========================================================================================

// Allmän wrapper: styr motor med ett "pressure" [0,1]
function playAudio(pressure) {
    if (!dspNode) return;
    if (audioContext.state === 'suspended') return;

    const p = Math.max(0, Math.min(1, pressure)); // clamp 0..1

    // Slå på motorn om vi har lite tryck
    dspNode.setParamValue("/gate", p > 0.05 ? 1 : 0);

    // Koppla pressure till maxSpeed och volume
    dspNode.setParamValue("/maxSpeed", p);
    dspNode.setParamValue("/volume", 0.2 + 0.8 * p);
}

// Engine-funktion specifikt för tilt (roll)
function playEngineFromTilt(roll) {
    if (!dspNode) return;
    if (audioContext.state === 'suspended') return;

    // roll är vinkel när du tiltar mobilen sida till sida.
    // Klamra till [-60, 60] och normalisera till [0,1]
    const maxTilt = 60;
    const clamped = Math.max(-maxTilt, Math.min(maxTilt, roll));
    const norm = Math.abs(clamped) / maxTilt; // 0 = platt, 1 = max tilt

    // Återanvänd playAudio så vi har samma mapping
    playAudio(norm);

    // Om du vill fixa vissa basvärden kan du göra det här:
    // dspNode.setParamValue("/statorLevel", 0.7);
    // dspNode.setParamValue("/brushLevel", 0.9);
    // dspNode.setParamValue("/rotorLevel", 0.6);
    // dspNode.setParamValue("/tubeRes", 0.2);
}

//==========================================================================================
// END
//==========================================================================================