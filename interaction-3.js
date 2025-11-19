//==========================================================================================
// AUDIO SETUP – FIRE + WIND
//==========================================================================================
let fireNode = null;
let windNode = null;
let fireParams = null;
let windParams = null;
let jsonParams = null;

// ========== FIRE SETUP ==========
const fireName = "fire";
const fireInstance = new FaustWasm2ScriptProcessor(fireName);

if (typeof module === "undefined") {
    window[fireName] = fireInstance;
} else {
    const exp = {};
    exp[fireName] = fireInstance;
    module.exports = exp;
}

window[fireName].createDSP(audioContext, 1024)
    .then(node => {
        fireNode = node;
        fireNode.connect(audioContext.destination);
        console.log('FIRE params: ', fireNode.getParams());
        const jsonString = fireNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        fireParams = jsonParams;

        // startvärden – volym lite lagom
        fireNode.setParamValue("/fire/wet", 1);      // vått trä = mer crackle
        fireNode.setParamValue("/fire/gate", 0);     // avstängd från start
        fireNode.setParamValue("/fire/volume", 0.7);
    });


// ========== WIND SETUP ==========
const windName = "wind";
const windInstance = new FaustWasm2ScriptProcessor(windName);

if (typeof module === "undefined") {
    window[windName] = windInstance;
} else {
    const exp = {};
    exp[windName] = windInstance;
    module.exports = exp;
}

window[windName].createDSP(audioContext, 1024)
    .then(node => {
        windNode = node;
        windNode.connect(audioContext.destination);
        console.log('WIND params: ', windNode.getParams());
        const jsonString = windNode.getJSON();
        const ui = JSON.parse(jsonString)["ui"][0]["items"];
        windParams = ui;

        // startvärden – vind avstängd
        windNode.setParamValue("/wind/wind/force", 0.0);
        windNode.setParamValue("/wind/volume", 0.0);
    });


//==========================================================================================
// INTERACTIONS
//==========================================================================================

function accelerationChange(accx, accy, accz) {
    // kan vara tom, vi använder tilt i rotationChange
}

let wasInFireZone = false;
let fireCracklesCount = 0;
const requiredCrackles = 3;
let windStarted = false;

// När telefonen tiltas (roll/pitch) vill vi först få FIRE-crackles
// och efter några trigger -> starta WIND
function rotationChange(rotx, roty, rotz) {
    if (!fireNode || !windNode) return;
    if (audioContext.state === "suspended") return;

    const pitch = rotx; // fram/bak
    const roll  = roty; // sida-till-sida

    // Debugga värdena första gången om du vill
    // console.log("rotation:", pitch, roll, rotz);

    // Definiera en "fire-zon": t.ex. telefon någorlunda platt,
    // men tiltad i sidled mer än en viss gräns.
    const flatTarget    = 0;
    const flatTolerance = 25;
    const isFlat        = Math.abs(pitch - flatTarget) < flatTolerance;

    const tiltThreshold = 25; // hur mycket sida-till-sida som krävs
    const strongTilt    = Math.abs(roll) > tiltThreshold;

    const inFireZone = isFlat && strongTilt && !windStarted;

    // vi triggar EN crackle när vi går IN i zonen
    if (inFireZone && !wasInFireZone) {
        statusLabels[1].style("color", "orange");
        triggerFireCrackle();
        fireCracklesCount += 1;

        // efter X crackles startar vi vinden
        if (fireCracklesCount >= requiredCrackles) {
            startWind();
        }
    }

    if (!inFireZone) {
        statusLabels[1].style("color", "black");
    }

    wasInFireZone = inFireZone;
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
    // vi använder inte skakning i denna interaction, så ingen ljudtrigger här
}


//==========================================================================================
// AUDIO HELPERS – FIRE + WIND
//==========================================================================================

// trigga en kort crackle från FIRE
function triggerFireCrackle() {
    if (!fireNode) return;

    // gate 1 en kort stund
    fireNode.setParamValue("/fire/gate", 1);
    setTimeout(() => {
        fireNode.setParamValue("/fire/gate", 0);
    }, 200); // 200 ms, justera om du vill längre/kortare crackle
}

// starta vinden gradvis
function startWind() {
    if (!windNode) return;
    windStarted = true;
    statusLabels[1].style("color", "lightblue");

    // fadea upp wind-force och volume
    windNode.setParamValue("/wind/wind/force", 0.0);
    windNode.setParamValue("/wind/volume", 0.0);

    let steps = 10;
    let current = 0;

    const interval = setInterval(() => {
        current += 1;
        const t = current / steps; // 0..1

        const force  = 0.2 + 0.8 * t;  // från lite vind till stark
        const volume = 0.2 + 0.8 * t;

        windNode.setParamValue("/wind/wind/force", force);
        windNode.setParamValue("/wind/volume", volume);

        if (current >= steps) {
            clearInterval(interval);
        }
    }, 200); // 200 ms per steg
}

//==========================================================================================
// END
//==========================================================================================