window.cancelRequestAnimFrame = (function () {
    return window.cancelAnimationFrame ||
        window.webkitCancelRequestAnimationFrame ||
        window.mozCancelRequestAnimationFrame ||
        window.oCancelRequestAnimationFrame ||
        window.msCancelRequestAnimationFrame ||
        clearTimeout;
})();


var canvas, gl,
    ratio,
    cw,
    ch,
    colorLoc,
    drawType,
    numLines = 100000;
var target = [];
var id;
var frameCount = 0;
var letterTiming = 29;
var imageIndex = 0;

var imageURLArr = [
    "images/00.png",
    "images/01.png",
    "images/02.png",
    "images/03.png",
    "images/04.png",
    "images/03.png",
    "images/03.png",
    "images/05.png"
];

var perspectiveMatrix;
var randomTargetXArr = [],
    randomTargetYArr = [];
drawType = 0;
var count = 0;

window.onload = init();

function init() {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext('2d');

    for (var ii = 0; ii < imageURLArr.length; ii++) {
        var image = new Image();
        image.crossOrigin = "Anonymous";
        image.src = imageURLArr[ii];

        image.onload = onLoadImageHandler.bind(this, image, canvas, ctx, ii);
    }
}

function onLoadImageHandler(image, canvas, ctx, number) {
    //console.log(image);
    var size = image.width;
    canvas.width = size;
    canvas.height = size;

    ctx.drawImage(image, 0, 0);
    var imageData = ctx.getImageData(0, 0, size, size);

    var data = imageData.data;
    target[number] = [];

    for (var ii = 0; ii < data.length; ii += 4) {
        if (data[ii] === 0) {
            var pixNumber = ii / 4;
            var xPos = pixNumber % size;
            var yPos = parseInt(pixNumber / size);
            var pos = {
                x: xPos / size - 0.5,
                y: -yPos / size + 0.5
            };
            target[number].push(pos);
        }

    }

    count++;

    if (count == imageURLArr.length) {
        loadScene();
    }

}

/**
 * Initialises WebGL and creates the 3D scene.
 */
function loadScene() {
    canvas = document.getElementById("c");
    gl = canvas.getContext("experimental-webgl", {
        preserveDrawingBuffer: true
    });

    if (!gl) {
        alert("There's no WebGL context available.");
        return;
    }

    cw = window.innerWidth;
    ch = window.innerHeight;
    canvas.width = cw;
    canvas.height = ch;
    gl.viewport(0, 0, canvas.width, canvas.height);

    var vertexShaderScript = document.getElementById("shader-vs");
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderScript.text);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        alert("Couldn't compile the vertex shader");
        gl.deleteShader(vertexShader);
        return;
    }

    var fragmentShaderScript = document.getElementById("shader-fs");
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderScript.text);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        alert("Couldn't compile the fragment shader");
        gl.deleteShader(fragmentShader);
        return;
    }

    gl.program = gl.createProgram();
    gl.attachShader(gl.program, vertexShader);
    gl.attachShader(gl.program, fragmentShader);
    gl.linkProgram(gl.program);
    if (!gl.getProgramParameter(gl.program, gl.LINK_STATUS)) {
        alert("Unable to initialise shaders");
        gl.deleteProgram(gl.program);
        gl.deleteProgram(vertexShader);
        gl.deleteProgram(fragmentShader);
        return;
    }
    gl.useProgram(gl.program);
    var vertexPosition = gl.getAttribLocation(gl.program, "vertexPosition");
    gl.enableVertexAttribArray(vertexPosition);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);

    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // ------------------

    setup();

    // ------------------

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    var fieldOfView = 30.0;
    var aspectRatio = canvas.width / canvas.height;
    var nearPlane = 1.0;
    var farPlane = 10000.0;
    var top = nearPlane * Math.tan(fieldOfView * Math.PI / 360.0);
    var bottom = -top;
    var right = top * aspectRatio;
    var left = -right;

    var a = (right + left) / (right - left);
    var b = (top + bottom) / (top - bottom);
    var c = (farPlane + nearPlane) / (farPlane - nearPlane);
    var d = (2 * farPlane * nearPlane) / (farPlane - nearPlane);
    var x = (2 * nearPlane) / (right - left);
    var y = (2 * nearPlane) / (top - bottom);
    perspectiveMatrix = [
        x, 0, a, 0,
        0, y, b, 0,
        0, 0, c, d,
        0, 0, -1, 0
    ];

    var modelViewMatrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
    var vertexPosAttribLocation = gl.getAttribLocation(gl.program, "vertexPosition");
    gl.vertexAttribPointer(vertexPosAttribLocation, 3.0, gl.FLOAT, false, 0, 0);
    var uModelViewMatrix = gl.getUniformLocation(gl.program, "modelViewMatrix");
    var uPerspectiveMatrix = gl.getUniformLocation(gl.program, "perspectiveMatrix");
    gl.uniformMatrix4fv(uModelViewMatrix, false, new Float32Array(perspectiveMatrix));
    gl.uniformMatrix4fv(uPerspectiveMatrix, false, new Float32Array(modelViewMatrix));
    animate();
}

var count = 0;
var cn = 0;

function animate() {

    id = requestAnimationFrame(animate);
    drawScene();

    frameCount++;
    imageIndex ++;

    if (frameCount % letterTiming == letterTiming - 1) {
        nextLetter();
        letterTiming = parseInt(Math.random() * 10 + 20);
        frameCount = 0;
    }

    // export
    var screenshot = canvas.toDataURL();
    var aLink = document.createElement('a');
    var evt = document.createEvent("HTMLEvents");
    aLink.download = 'image_' + imageIndex + '.png';
    aLink.href = screenshot;
    aLink.click();
}


function drawScene() {
    draw();

    gl.lineWidth(1);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.drawArrays(gl.LINES, 0, numLines);

    gl.flush();
}

// ===================================
var coefficient = 0.4;
var targetCoefficient = 0.01;


var vertices,
    velocities,
    freqArr,
    thetaArr,
    velThetaArr,
    velRadArr,
    boldRateArr;

// -------------------------------

function setup() {

    vertices = [];

    // -------------------------------

    for (var ii = 0; ii < numLines; ii++) {
        vertices.push(0, 0, 1.83);
        vertices.push(0, 0, 1.83);

        var randomPos = target[drawType][parseInt(target[drawType].length * Math.random())];
        randomTargetXArr.push(randomPos.x);
        randomTargetYArr.push(randomPos.y);
    }

    vertices = new Float32Array(vertices);
    randomTargetXArr = new Float32Array(randomTargetXArr);
    randomTargetYArr = new Float32Array(randomTargetYArr);

}

// -------------------------------

// -------------------------------

function draw() {
    cn += 0.1;

    var i, n = vertices.length,
        p, bp;
    var px, py;
    var pTheta;
    var rad;
    var num;

    coefficient += (targetCoefficient - coefficient) * 0.1;


    for (i = 0; i < numLines * 2; i += 2) {
        count += 0.3;
        bp = i * 3;
        // copy old positions

        vertices[bp] = vertices[bp + 3];
        vertices[bp + 1] = vertices[bp + 4];

        num = parseInt(i / 2);
        var targetPosX = randomTargetXArr[num];
        var targetPosY = randomTargetYArr[num];
        //va
        px = vertices[bp + 3];
        px += (targetPosX - px) * coefficient + (Math.random() - 0.5) * coefficient;
        vertices[bp + 3] = px;


        py = vertices[bp + 4];
        py += (targetPosY - py) * coefficient + (Math.random() - 0.5) * coefficient;
        vertices[bp + 4] = py;
    }
}

function nextLetter() {
    var rotate;
    var tansY;

    drawType = (drawType + 1) % imageURLArr.length;
    rotate = 90;
    transY = -15;


    coefficient = 0.3;
    randomTargetXArr = [];
    randomTargetYArr = [];

    // -------------------------------

    for (var ii = 0; ii < numLines; ii++) {
        var randomPos = target[drawType][parseInt(target[drawType].length * Math.random())];
        randomTargetXArr.push(randomPos.x);
        randomTargetYArr.push(randomPos.y);
    }

    vertices = new Float32Array(vertices);
    randomTargetXArr = new Float32Array(randomTargetXArr);
    randomTargetYArr = new Float32Array(randomTargetYArr);
}

window.addEventListener("click", function (event) {
    nextLetter();
});
