/// <reference path="../../built/pxtlib.d.ts"/>

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as data from "./data";
import * as sui from "./sui";
import * as pkg from "./package";
import * as blocks from "./blocks"
import * as hidbridge from "./hidbridge";

import Cloud = pxt.Cloud;

// JavaScript libraries used:
const d3 = require("d3");
const MediaStreamRecorder = require("msr");
const THREE = require("three");

// TODO: move to a file where the rest of the data definitions are located


/**
 * Generates a new file that would contain the given text and saves it 
 * by downloading it in the browser.
 */
function downloadString(filename: string, text: string) {
    let pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    // Virtually click on the <a> element:
    if (document.createEvent) {
        let event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}

function downloadVideo(filename: string, video: any) {
    let a = document.createElement('a');
    a.setAttribute('href', video);
    a.setAttribute('download', filename);

    // Virtually click on the <a> element:
    if (document.createEvent) {
        let event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        a.dispatchEvent(event);
    }
    else {
        a.click();
    }
}

type ISettingsProps = pxt.editor.ISettingsProps;
type IAppProps = pxt.editor.IAppProps;
type IAppState = pxt.editor.IAppState;
type IProjectView = pxt.editor.IProjectView;

class Point {
    public X: number;
    public Y: number;

    constructor(x: number, y: number) {
        this.X = x;
        this.Y = y;
    }
}

/** 
 * Keeps a record of all the information for a gesture sample, including SensorData and it's Label. 
 */
class RecordedData {
    public rawData: SensorData[];
    public labelStr: string;
    public labelNum: number;
    public startTime: number;
    public endTime: number;
    public container: any;    // points to the div container for displaying sensor data + video + ...
    public video: any;

    constructor(_labelNum: number) {
        this.rawData = [];
        this.labelNum = _labelNum;
    }
}

/**
 * Contains X, Y, Z values for Accelerometer and Magnetometer sensors in addition 
 * to the Roll and Pitch values of the device's orientation in degrees.
 */
class SensorData {
    public acc: number[];
    public mag: number[];
    public roll: number;
    public pitch: number;
    public time: number;
    public soundLevel: number;

    constructor() {
        this.acc = [0, 0, 0];
        this.mag = [0, 0, 0];
        this.pitch = 0;
        this.roll = 0;
        this.time = 0;
        this.soundLevel = 0;
    }

    public Clone() {
        let s = new SensorData();

        s.acc[0] = this.acc[0];
        s.acc[1] = this.acc[1];
        s.acc[2] = this.acc[2];

        s.mag[0] = this.mag[0];
        s.mag[1] = this.mag[1];
        s.mag[2] = this.mag[2];

        s.roll = this.roll;
        s.pitch = this.pitch;
        s.time = this.time;

        return s;
    }
}

export interface GestureToolboxState {
    visible?: boolean;
}

enum ELLCommand {
    CreateModel = 1,
    ComputeLabels = 2,
    RecvLabels = 3,
    RecvAssembly = 4,
}

let ws: any;
let hasTrainedModel: boolean = false;
const max_slots: number = 10;
let compLabelSlots: number = max_slots;
let compLabelArray: SensorData[];
compLabelArray = [];

let inTutorialMode = false;
let tutorialStep = 0;

let recordedDataList: RecordedData[];
let recordingLabels: string[];
recordingLabels = [];
recordingLabels.push("N/A");
let curLabelNum: number = 1; //starts with 1

let MAX_GRAPH_SAMPLES = 450;
const GRAPH_HEIGHT = 24;
const MAX_ACC_VAL = 1023;
const Y_OFFSET = 60;
const Y_DISTANCE = 100;

let smoothedLine = d3.line()
    .x((d: Point) => {
        return d.X;
    })
    .y((d: Point) => {
        return d.Y;
    })
    .curve(d3.curveBasis);

let scene: any, camera: any, renderer: any, geometry: any, material: any, mesh: any;

let cube_roll: number;
let cube_pitch: number;
let rotationVector: any;
let tmpQuaternion: any;

let isRecording: boolean = false;
let wasRecording: boolean = false;
let initialized: boolean = false;
let localMediaStream: any;

function drawInformation(index: number) {
    let divContainer: any = recordedDataList[index].container;
    let label = recordedDataList[index].labelStr;

    divContainer.append("h4")
        .attr("class", "label-title")
        .html(label);
}

function drawRecVideo(index: number) {
    let divContainer: any = recordedDataList[index].container;
    let vid = recordedDataList[index].video;

    divContainer.append("video")
        .attr("src", vid)
        .attr("controls", "controls")
        .attr("width", "200px");
}

function drawRecDataSmoothed(index: number) {
    let divContainer: any = recordedDataList[index].container;
    let newSVG = divContainer.append("svg")
        .attr("width", recordedDataList[index].rawData.length)
        .attr("height", 300);

    // add time (x-axis) to the SensorData
    for (let i = 0; i < recordedDataList[index].rawData.length; i++) {
        recordedDataList[index].rawData[i].time = i;
    }

    newSVG.append("path")
        .attr("d", smoothedLine(recordedDataList[index].rawData.map(
            (d: SensorData) => {
                return new Point(d.time, d.acc[0] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + 25);
            })))
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("fill", "none");

    newSVG.append("path")
        .attr("d", smoothedLine(recordedDataList[index].rawData.map(
            (d: SensorData) => {
                return new Point(d.time, d.acc[1] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + Y_DISTANCE + 25);
            })))
        .attr("stroke", "green")
        .attr("stroke-width", 2)
        .attr("fill", "none");

    newSVG.append("path")
        .attr("d", smoothedLine(recordedDataList[index].rawData.map(
            (d: SensorData) => {
                return new Point(d.time, d.acc[2] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + Y_DISTANCE * 2 + 25);
            })))
        .attr("stroke", "blue")
        .attr("stroke-width", 2)
        .attr("fill", "none");
}

function drawDeleteButton(index: number) {
    let divContainer: any = recordedDataList[index].container;

    divContainer.append("button")
        .attr("type", "button")
        .attr("class", "delete_button")
        .attr("value", recordedDataList[recordedDataList.length - 1].startTime)
        .html("x")
        .on("click", function() {
            let elemStartTime = parseInt(this.value);
            let idx: number = -1;

            for (let i = 0; i < recordedDataList.length; i++) {
                if (recordedDataList[i].startTime == elemStartTime) {
                    idx = i;
                }
            }
            if (idx != -1) {
                recordedDataList[idx].container.attr("style", "display: none;");
                recordedDataList.splice(idx, 1);
            }
            else
                console.error("index not found!");
            
            // TODO: should update the model after the data has been deleted.
        });
}

function updateGestureLabel() {
    d3.select("#gesture-title").html("Current Gesture: " + recordingLabels[curLabelNum]);
}

function init3D() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, 1, 1, 10000 );
    camera.position.z = 1000;

    geometry = new THREE.CylinderGeometry( 100, 100, 30, 48 /*number of segmented faces around the circumference of the cylinder*/ );
    material = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } );

    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );
    scene.background = new THREE.Color( 0xffffff );

    // rotationVector = new THREE.Vector3(0, 0, 0);
    // tmpQuaternion = new THREE.Quaternion();

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( 300, 300 );

    document.getElementById("realtime-graph").appendChild( renderer.domElement );
}

function animate3D() {
    requestAnimationFrame( animate3D );

    mesh.rotation.x = cube_roll;
    mesh.rotation.y = cube_pitch;

    renderer.render( scene, camera );
}

export class GestureToolbox extends data.Component<ISettingsProps, GestureToolboxState> {

    constructor(props: ISettingsProps) {
        super(props);
        this.state = {
            visible: false
        }

        recordedDataList = [];

        // assign events to capture if recording or not
        window.onkeydown = (e: any) => {
            // if pressed "space" key
            if (e.keyCode == 32 && recordingLabels.length != 1)
                isRecording = true;
            else if (recordingLabels.length == 1) {
                d3.select("#gesture-title").style("color", "red").transition().delay(1000).style("color", "black");
            }
        };

        window.onkeyup = (e: any) => {
            // if released "space" key
            if (e.keyCode == 32)
                isRecording = false;
        };

        pxt.debug('initializing ell pipe');
        ws = new WebSocket(`ws://localhost:${pxt.options.wsPort}/${Cloud.localToken}/ell`);
        ws.onopen = (ev: any) => {
            pxt.debug('ell-ws: socket opened');

            // ws.send(JSON.stringify(recordedDataList));

            // ws.send(ELLCommand.CreateModel + JSON.stringify(recordedDataList));
        }
        ws.onclose = (ev: any) => {
            pxt.debug('ell-ws: socket closed')
        }
        ws.onmessage = (ev: any) => {
            try {
                let recvData = (ev.data) as string;
                let recvCommand = parseInt(recvData[0]);
                let recDataStr = recvData.substr(1, recvData.length - 1);
                            
                switch(recvCommand) {
                    case ELLCommand.RecvAssembly:
                        hasTrainedModel = true;

                        // downloadString("assembly.s", recDataStr);
                    break;

                    case ELLCommand.RecvLabels:
                        let labelsArray = JSON.parse(recDataStr) as number[];

                        for (let i = 0; i < labelsArray.length; i++) {
                            if (labelsArray[i] != 0)
                                d3.select("#recognized-gesture-title").html("Recognized Gesture: " + labelsArray[i]);
                            else if (labelsArray[i] == 0)
                                d3.select("#recognized-gesture-title").html("Recognized Gesture: N/A");
                        }
                    break;
                }
            }
            catch (e) {
                pxt.debug('unknown message: ' + ev.data);
            }
        }
    }

    hide() {
        this.setState({ visible: false });
        localMediaStream.stop();
    }

    show() {
        this.setState({ visible: true });

        // apply the visibility state of whether in tutorial mode or in recording mode:
        if (inTutorialMode) {
            d3.select("#recording_container").style("display", "none");
            d3.select("#tutorial_container").style("display", "block");
        } else {
            d3.select("#recording_container").style("display", "block");
            d3.select("#tutorial_container").style("display", "none");
        }
        // TODO: update the visibility of content based on tutorialStep

        let nav = navigator as any;
        let mediaRecorder: any;

        nav.getUserMedia  = nav.getUserMedia || nav.webkitGetUserMedia ||
                            nav.mozGetUserMedia || nav.msGetUserMedia;

        if (nav.getUserMedia) {
            nav.getUserMedia({audio: false, video: true},
                (stream: any) => {
                    let video = document.querySelector('video') as any;
                    video.autoplay = true;
                    video.src = window.URL.createObjectURL(stream);
                    localMediaStream = stream;

                    mediaRecorder = new MediaStreamRecorder(stream);
                    mediaRecorder.mimeType = 'video/mp4';
                }, () => {
                    console.error('media error');
                });
        }

        // initialize the realtime graph:
        let realTimeData: SensorData[];
        realTimeData = [];

        for (let i = 0; i < MAX_GRAPH_SAMPLES; i++) {
            let data = new SensorData();
            data.time = i;
            realTimeData.push(data);
        }

        // initialize the tutorial graph:
        let tutorialTimeGraphSVG = d3.select("#tutorial-graph")
            .append("svg")
            .attr("width", 550)
            .attr("height", 375);
        
        let tutorialBarGraphSVG = d3.select("#tutorial-graph")
            .append("svg")
            .attr("width", 200)
            .attr("height", 375);
        
        tutorialBarGraphSVG.append("path")
            .attr("d", "M10 40 H 60 V 310 H 10 L 10 40")
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("fill", "none")
            .attr("class", "bargraph_border");
        
        tutorialBarGraphSVG.append("path")
            .attr("d", "M20 50 H 50 V 300 H 20 L 20 50")
            .attr("fill", "red")
            .attr("class", "bargraph_mercury");
        

        // create initial time series (set to 0)
        tutorialTimeGraphSVG.append("path")
            .attr("d", smoothedLine(realTimeData.map(
                (d: SensorData) => {
                    return new Point(d.time + 25, d.soundLevel * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET);
                })))
            .attr("class", "sound_p")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("fill", "none");

        let realTimeGraphSVG = d3.select("#realtime-graph")
            .append("svg")
            .attr("width", 550)
            .attr("height", 375);

        let mainVideo = d3.select("#webcam-video");

        realTimeGraphSVG.append("path")
            .attr("d", smoothedLine(realTimeData.map(
                (d: SensorData) => {
                    return new Point(d.time + 25, d.acc[0] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET);
                })))
            .attr("class", "acc_x")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("fill", "none");

        realTimeGraphSVG.append("path")
            .attr("d", smoothedLine(realTimeData.map(
                (d: SensorData) => {
                    return new Point(d.time + 25, d.acc[1] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + Y_DISTANCE);
                })))
            .attr("class", "acc_y")
            .attr("stroke", "green")
            .attr("stroke-width", 2)
            .attr("fill", "none");

        realTimeGraphSVG.append("path")
            .attr("d", smoothedLine(realTimeData.map(
                (d: SensorData) => {
                    return new Point(d.time + 25, d.acc[2] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + Y_DISTANCE * 2);
                })))
            .attr("class", "acc_z")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("fill", "none");

        // add x-y axis:

        let yScale = d3.scaleLinear()
            .domain([0, GRAPH_HEIGHT])
            .range([350, 0]);

        let xScale = d3.scaleLinear()
            .domain([0, MAX_GRAPH_SAMPLES])
            .range([0, 500]);

        let xAxis = d3.axisBottom(xScale)
            .ticks(5);

        let yAxis = d3.axisLeft(yScale)
            .ticks(6);

        realTimeGraphSVG.append("g")
            .attr("class", "x_axis")
            .attr("transform", "translate(25, 330)")
            .call(xAxis);

        realTimeGraphSVG.append("g")
            .attr("class", "y_axis")
            .attr("transform", "translate(25, -20)")
            .call(yAxis);
        
        tutorialTimeGraphSVG.append("g")
            .attr("class", "x_axis")
            .attr("transform", "translate(25, 330)")
            .call(xAxis);

        tutorialTimeGraphSVG.append("g")
            .attr("class", "y_axis")
            .attr("transform", "translate(25, -20)")
            .call(yAxis);


        d3.select("#realtime-graph")
            .append("br");
        
        d3.select("#tutorial-graph")
            .append("br");

        // Draw all of the previously recorded data in the current session:
        for (let i = 0; i < recordedDataList.length; i++) {
            recordedDataList[i].container = d3.select("#recorded-samples")
                                              .append("div").attr("class", "sample-container");
            drawInformation(i);
            drawRecVideo(i);
            drawRecDataSmoothed(i);
            drawDeleteButton(i);
        }

        if (hidbridge.shouldUse()) {
            hidbridge.initAsync()
                .then(dev => {
                    dev.onSerial = (buf, isErr) => {
                        // console.log(Util.fromUTF8(Util.uint8ArrayToString(buf)));
                        
                        let strBuf: string = Util.fromUTF8(Util.uint8ArrayToString(buf));
                        // document.getElementById("serial_span").innerText = strBuf;
                        // pop the oldest value from the visualization queue
                        realTimeData.shift();
                        realTimeData.forEach((element: SensorData) => {
                            element.time--;
                        })

                        // visualize ACC(x,y,z) to d3: 

                        // create a new SensorData instance based on the serial port values
                        let newData = new SensorData();
                        newData.time = realTimeData.length - 1;

                        let strBufArray = strBuf.split(" ");

                        // populate members of newData (type: SensorData) with the values received from the device
                        for (let i = 0; i < strBufArray.length; i++) {
                            if (strBufArray[i] == "A") {
                                newData.acc = [parseInt(strBufArray[i + 1]), parseInt(strBufArray[i + 2]), parseInt(strBufArray[i + 3])];

                                i += 3;
                            }
                            else if (strBufArray[i] == "R") {
                                newData.pitch = parseInt(strBufArray[i + 1]);
                                newData.roll = parseInt(strBufArray[i + 2]);

                                i += 2;
                            }
                            else if (strBufArray[i] == "M") { // Not available in Adafruit's Circuit Playground Express
                                newData.mag = [parseInt(strBufArray[i + 1]), parseInt(strBufArray[i + 2]), parseInt(strBufArray[i + 3])];

                                i += 3;
                            }
                            else if (strBufArray[i] == "S") { // For tutorial mode
                                newData.soundLevel = parseInt(strBufArray[i + 1]);
                                // d3.select("#recognized-gesture-title").html(newData.soundLevel);

                                i += 1;
                            }
                        }

                        realTimeData.push(newData);

                        if (!inTutorialMode) {

                            if (hasTrainedModel && compLabelSlots > 0 ) {
                                // SensorData[]
                                compLabelArray.push(newData)
                                compLabelSlots--;
                            }
                            
                            if (compLabelSlots == 0) {
                                // send to server in order to compute the labels of the latest X data points
                                ws.send(ELLCommand.ComputeLabels + JSON.stringify(compLabelArray));
                                compLabelArray = [];
                                compLabelSlots = max_slots;
                            }

                            // update cube's rotation:
                            cube_roll = newData.roll * (Math.PI / 180);
                            cube_pitch = newData.pitch * (Math.PI / 180);

                            realTimeGraphSVG.select(".acc_x")
                                .attr("d", smoothedLine(realTimeData.map(
                                (d: SensorData) => {
                                    return new Point(d.time + 25, d.acc[0] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET);
                                })));

                            realTimeGraphSVG.select(".acc_y")
                                .attr("d", smoothedLine(realTimeData.map(
                                (d: SensorData) => {
                                    return new Point(d.time + 25, d.acc[1] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + Y_DISTANCE);
                                })));

                            realTimeGraphSVG.select(".acc_z")
                                .attr("d", smoothedLine(realTimeData.map(
                                (d: SensorData) => {
                                    return new Point(d.time + 25, d.acc[2] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + Y_DISTANCE * 2);
                                })));

                            // record data if the user is holding the space bar:
                            if (wasRecording == false && isRecording == true) {
                                // start recording sensor data:
                                let newRecord = new RecordedData(1);
                                recordedDataList.push(newRecord);
                                recordedDataList[recordedDataList.length - 1].startTime = Date.now();
                                recordedDataList[recordedDataList.length - 1].rawData.push(newData.Clone());
                                recordedDataList[recordedDataList.length - 1].labelNum = curLabelNum;
                                recordedDataList[recordedDataList.length - 1].labelStr = recordingLabels[curLabelNum];

                                // start recording webcam video:
                                mediaRecorder.start(60 * 1000);
                            }
                            else if (wasRecording == true && isRecording == true) {
                                // continue recording:
                                recordedDataList[recordedDataList.length - 1].rawData.push(newData.Clone());
                            }
                            else if (wasRecording == true && isRecording == false) {
                                // stop recording sensor data:
                                recordedDataList[recordedDataList.length - 1].endTime = Date.now();

                                // stop recording webcam video:
                                mediaRecorder.stop();

                                mediaRecorder.ondataavailable = function (blob: any) {
                                    // add video element to be played/visualized later
                                    recordedDataList[recordedDataList.length - 1].video = window.URL.createObjectURL(blob);
                                    recordedDataList[recordedDataList.length - 1].container = d3.select("#recorded-samples")
                                                                        .append("div").attr("class", "sample-container");

                                    drawInformation(recordedDataList.length - 1);
                                    drawRecVideo(recordedDataList.length - 1);
                                    drawRecDataSmoothed(recordedDataList.length - 1);
                                    drawDeleteButton(recordedDataList.length - 1);
                                };

                                // update the DTW model with the current data:
                                ws.send(ELLCommand.CreateModel + JSON.stringify(recordedDataList));

                                // visualize the recorded data:
                                // drawRecDataSmoothed(recordedDataList.length - 1, recordedDataList[recordedDataList.length - 1].container);
                                // had to move this into the webcam's event function so that it would add the data after the video
                            }

                            wasRecording = isRecording;
                        }
                        else {
                            // in tutorial mode:
                            tutorialTimeGraphSVG.select(".sound_p")
                                .attr("d", smoothedLine(realTimeData.map(
                                (d: SensorData) => {
                                    return new Point(d.time + 25, d.soundLevel * (-250 / 2600) + 300);
                                })));

                            // rectangular visualization:
                            let mercury_height = newData.soundLevel * (-250 / 2600) + 300;
                            d3.select(".bargraph_mercury")
                                .attr("d", "M20 300 H 50 V " + mercury_height + " H 20 L 20 300");
                            
                        }
                    }
                });
        }

        d3.select("#sendToTrain_btn").on("click", () => {
            // Make sure that we're running on localhost
            // if (!pxt.appTarget.serial || !Cloud.isLocalHost() || !Cloud.localToken)
            //     return;
            
        });

        d3.select("#save_btn").on("click", () => {
            const f2 = pkg.mainEditorPkg().setFile("newFile.json", JSON.stringify(recordedDataList));
            // make it so that if the user clicks on the file, it would show up in the gesture toolbox
        });

        d3.select("#download_btn").on("click", () => {
            downloadString("recordedData.json", JSON.stringify(recordedDataList));
            // for (let i = 0; i < recordedDataList.length; i++)
            //     downloadVideo("recordedVideo", recordedDataList[i].video);
        });

        d3.select("#file_input").on("change", () => {
            let file = (document.getElementById("file_input") as any).files;

            let reader = new FileReader();

            // currently lets just visualize the first file (which may contain multiple instances of a RecordedData)
            reader.readAsText(file[0]);

            reader.onload = () => {
                let str = reader.result;
                let recDataFromFile: RecordedData[] = JSON.parse(str) as RecordedData[];

                for (let i = 0; i < recDataFromFile.length; i++) {
                    recordedDataList.push(recDataFromFile[i]);

                    // visualize the recorded data:
                    // drawRecVideo(recordedDataList.length - 1);
                    recordedDataList[recordedDataList.length - 1].container = d3.select("#recorded-samples")
                                                                                        .append("div").attr("class", "sample-container");

                    drawInformation(recordedDataList.length - 1);
                    drawRecVideo(recordedDataList.length - 1);
                    drawRecDataSmoothed(recordedDataList.length - 1);
                    drawDeleteButton(recordedDataList.length - 1);
                }
            };
        });

        // init3D();
        // animate3D();

        d3.select("#create-label-btn").on("click", () => {
            let newLabel = (document.getElementById("lbl-input") as any).value;

            if (newLabel == "") {
                alert("please enter a name for the gesture!")
            }
            else {
                let idx = recordingLabels.indexOf(newLabel);
                if (idx == -1) {
                    recordingLabels.push(newLabel);
                    curLabelNum = recordingLabels.length - 1;
                }
                else {
                    curLabelNum = idx;
                }

                updateGestureLabel();
            }
        });

        d3.select("#toggleTutorial_btn").on("click", () => {
            if (inTutorialMode) {
                inTutorialMode = false;
                d3.select("#recording_container").style("display", "block");
                d3.select("#tutorial_container").style("display", "none");
            } else {
                d3.select("#recording_container").style("display", "none");
                d3.select("#tutorial_container").style("display", "block");

                inTutorialMode = true;
                tutorialStep = 1;
            }
        });
    }

    shouldComponentUpdate(nextProps: ISettingsProps, nextState: GestureToolboxState, nextContext: any): boolean {
        return this.state.visible != nextState.visible;
    }

    renderCore() {
        const { visible } = this.state;

        return (
            <sui.Modal open={this.state.visible} className="gesture_toolbox" header={lf("Gesture Toolkit") } size="fullscreen"
                onClose={() => this.hide() } dimmer={true}
                closeIcon={true}
                closeOnDimmerClick closeOnDocumentClick
                >
                <button className="ui submit button big" id="toggleTutorial_btn">Tutorial Mode</button>
                <br/>
                <div id="recording_container">
                    {/*<button type="button" id="sendToTrain_btn">Train</button>*/}
                    {/*<button type="button" id="save_btn">Save JSON</button>*/}
                    {/*<button type="button" id="download_btn">Download JSON</button>*/}
                    {/*<input id="file_input" type="file"/>*/}

                    <br/>
                    <br/>
                    <div className="ui small form">
                        <div className="field" id="label-form">
                            <label>Enter Gesture Name: </label>
                            <input placeholder="GestureName" type="text" maxLength={16} id="lbl-input"/>
                            <button className="ui submit button" id="create-label-btn">Set Label</button>
                            <span id="gesture-title">Current Gesture: N/A</span>
                            <span id="recognized-gesture-title">Recognized Gesture: N/A</span>
                        </div>
                    </div>
                    <br/>
                    <div id="realtime-input">
                        <video id="webcam-video"></video>
                        <div id="realtime-graph" className="ui content"></div>
                    </div>
                    <div id="recorded-samples">
                    </div>
                </div>
                <div id="tutorial_container">
                    <div id="tutorial-graph" className="ui content"></div>
                </div>
            </sui.Modal>
        )
    }
}
