/// <reference path="../../built/pxtlib.d.ts"/>

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as data from "./data";
import * as sui from "./sui";
import * as pkg from "./package";
import * as blocks from "./blocks"
import * as hidbridge from "./hidbridge";

import Cloud = pxt.Cloud;

const d3 = require("d3");
var MediaStreamRecorder = require('msr');

// TODO: move to a file where the rest of the data definitions are located


/**
 * Generates a new file that would contain the given text and saves it 
 * by downloading it in the browser.
 */
function download(filename: string, text: string) {
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
    public svg: any;    // points to the svg containing the visualization of that recorded data.
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

    constructor() {
        this.acc = [0, 0, 0];
        this.mag = [0, 0, 0];
        this.pitch = 0;
        this.roll = 0;
        this.time = 0;
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

let recordedDataList: RecordedData[];
let MAX_GRAPH_SAMPLES = 450;
const GRAPH_HEIGHT = 30;
const MAX_ACC_VAL = 1023;
const Y_OFFSET = 25;
const Y_DISTANCE = 100;

let smoothedLine = d3.line()
    .x((d: Point) => {
        return d.X;
    })
    .y((d: Point) => {
        return d.Y;
    })
    .curve(d3.curveBasis);

export class GestureToolbox extends data.Component<ISettingsProps, GestureToolboxState> {
    isRecording: boolean = false;
    wasRecording: boolean = false;
    initialized: boolean = false;
    localMediaStream: any;

    constructor(props: ISettingsProps) {
        super(props);
        this.state = {
            visible: false
        }

        recordedDataList = [];

        // assign events to capture if recording or not
        window.onkeydown = (e: any) => {
            // if pressed "space" key
            if (e.keyCode == 32)
                this.isRecording = true;
        };

        window.onkeyup = (e: any) => {
            // if released "space" key
            if (e.keyCode == 32)
                this.isRecording = false;
        };
    }

    drawRecDataSmoothed(index: number) {
        let newSVG = d3.select("#viz")
                            .append("svg")
                            .attr("width", 150)
                            .attr("height", 300);

        // add time (x-axis) to the SensorData
        for (let i = 0; i < recordedDataList[index].rawData.length; i++) {
            recordedDataList[index].rawData[i].time = i;
        }

        newSVG.append("path")
            .attr("d", smoothedLine(recordedDataList[index].rawData.map(
                (d: SensorData) => {
                    return new Point(d.time + 25, d.acc[0] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET);
                })))
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("fill", "none");

        newSVG.append("path")
            .attr("d", smoothedLine(recordedDataList[index].rawData.map(
                (d: SensorData) => {
                    return new Point(d.time + 25, d.acc[1] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + Y_DISTANCE);
                })))
            .attr("stroke", "green")
            .attr("stroke-width", 2)
            .attr("fill", "none");

        newSVG.append("path")
            .attr("d", smoothedLine(recordedDataList[index].rawData.map(
                (d: SensorData) => {
                    return new Point(d.time + 25, d.acc[2] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + Y_DISTANCE * 2);
                })))
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("fill", "none");
    }

    hide() {
        this.setState({ visible: false });
        this.localMediaStream.stop();
    }

    show() {
        this.setState({ visible: true });

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
                    this.localMediaStream = stream;

                    mediaRecorder = new MediaStreamRecorder(stream);
                    mediaRecorder.mimeType = 'video/mp4';

                    mediaRecorder.ondataavailable = function (blob: any) {
                        // add video element to be played later
                        d3.select("#viz").append("video")
                            .attr("src", window.URL.createObjectURL(blob))
                            .attr("controls", "controls")
                            .attr("width", "200px");

                        recordedDataList[recordedDataList.length - 1].video = blob;
                    };
                }, () => {
                    console.error('media error');
                });
        }


        // initialize the dataset with empty values
        let dataset: SensorData[];
        dataset = [];

        for (let i = 0; i < MAX_GRAPH_SAMPLES; i++) {
            let data = new SensorData();
            data.time = i;
            dataset.push(data);
        }

        let mainSVG = d3.select("#viz")
            .append("svg")
            .attr("width", 550)
            .attr("height", 350)
            .attr("style", "margin: 25px; padding: 25px;");

        mainSVG.append("path")
            .attr("d", smoothedLine(dataset.map(
                (d: SensorData) => {
                    return new Point(d.time + 25, d.acc[0] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET);
                })))
            .attr("class", "acc_x")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("fill", "none");

        mainSVG.append("path")
            .attr("d", smoothedLine(dataset.map(
                (d: SensorData) => {
                    return new Point(d.time + 25, d.acc[1] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + Y_DISTANCE);
                })))
            .attr("class", "acc_y")
            .attr("stroke", "green")
            .attr("stroke-width", 2)
            .attr("fill", "none");

        mainSVG.append("path")
            .attr("d", smoothedLine(dataset.map(
                (d: SensorData) => {
                    return new Point(d.time + 25, d.acc[2] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + Y_DISTANCE * 2);
                })))
            .attr("class", "acc_z")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("fill", "none");

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

        mainSVG.append("g")
            .attr("class", "x_axis")
            .attr("transform", "translate(25, 300)")
            .call(xAxis);

        mainSVG.append("g")
            .attr("class", "y_axis")
            .attr("transform", "translate(25, -50)")
            .call(yAxis);


        d3.select("#viz")
            .append("br");

        // Draw all of the previously recorded data in the current session:
        for (let i = 0; i < recordedDataList.length; i++) {
            this.drawRecDataSmoothed(i);
            // TODO: Display the videos after re-opening the gesture toolbox
            // add video element to be played later
            d3.select("#viz").append("video")
                .attr("src", window.URL.createObjectURL(recordedDataList[i].video))
                .attr("controls", "controls")
                .attr("width", "200px");
        }

        if (hidbridge.shouldUse()) {
            hidbridge.initAsync()
                .then(dev => {
                    dev.onSerial = (buf, isErr) => {
                        // console.log(Util.fromUTF8(Util.uint8ArrayToString(buf)));

                        let strBuf: string = Util.fromUTF8(Util.uint8ArrayToString(buf));
                        // document.getElementById("serial_span").innerText = strBuf;

                        // visualize ACC(x,y,z) to d3: 
                        // pop the oldest value from the visualization queue
                        dataset.shift();
                        dataset.forEach((element: SensorData) => {
                            element.time--;
                        })

                        // create a new SensorData instance based on the serial port values
                        let newData = new SensorData();
                        newData.time = dataset.length - 1;

                        let strBufArray = strBuf.split(" ");

                        // populate members of newData (type: SensorData) with the values received from the device
                        for (let i = 0; i < strBufArray.length; i++) {
                            if (strBufArray[i] == "ACC") {
                                newData.acc = [parseInt(strBufArray[i + 1]), parseInt(strBufArray[i + 2]), parseInt(strBufArray[i + 3])];

                                i += 3;
                            }
                            else if (strBufArray[i] == "ROT") {
                                newData.pitch = parseInt(strBufArray[i + 1]);
                                newData.roll = parseInt(strBufArray[i + 2]);

                                i += 2;
                            }
                            else if (strBufArray[i] == "MAG") { // Not available in Adafruit's Circuit Playground Express
                                newData.mag = [parseInt(strBufArray[i + 1]), parseInt(strBufArray[i + 2]), parseInt(strBufArray[i + 3])];

                                i += 3;
                            }
                        }

                        dataset.push(newData);

                        mainSVG.select(".acc_x")
                            .attr("d", smoothedLine(dataset.map(
                            (d: SensorData) => {
                                return new Point(d.time + 25, d.acc[0] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET);
                            })));

                        mainSVG.select(".acc_y")
                            .attr("d", smoothedLine(dataset.map(
                            (d: SensorData) => {
                                return new Point(d.time + 25, d.acc[1] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + Y_DISTANCE);
                            })));

                        mainSVG.select(".acc_z")
                            .attr("d", smoothedLine(dataset.map(
                            (d: SensorData) => {
                                return new Point(d.time + 25, d.acc[2] * (GRAPH_HEIGHT / MAX_ACC_VAL) + Y_OFFSET + Y_DISTANCE * 2);
                            })));

                        // record data if the user is holding the space bar:
                        if (this.wasRecording == false && this.isRecording == true) {
                            // start recording sensor data:
                            let newRecord = new RecordedData(1);
                            recordedDataList.push(newRecord);
                            recordedDataList[recordedDataList.length - 1].startTime = Date.now();
                            recordedDataList[recordedDataList.length - 1].rawData.push(newData.Clone());

                            // start recording webcam video:
                            mediaRecorder.start(60 * 1000);
                        }
                        else if (this.wasRecording == true && this.isRecording == true) {
                            // continue recording:
                            recordedDataList[recordedDataList.length - 1].rawData.push(newData.Clone());
                        }
                        else if (this.wasRecording == true && this.isRecording == false) {
                            // stop recording sensor data:
                            recordedDataList[recordedDataList.length - 1].endTime = Date.now();

                            // stop recording webcam video:
                            mediaRecorder.stop();

                            // visualize the recorded data:
                            this.drawRecDataSmoothed(recordedDataList.length - 1);
                        }

                        this.wasRecording = this.isRecording;
                    }
                });
        }

        d3.select("#sendToTrain_btn").on("click", () => {
            // Make sure that we're running on localhost
            if (!pxt.appTarget.serial || !Cloud.isLocalHost() || !Cloud.localToken)
                return;

            pxt.debug('initializing ell pipe');
            let ws = new WebSocket(`ws://localhost:${pxt.options.wsPort}/${Cloud.localToken}/ell`);
            ws.onopen = (ev) => {
                pxt.debug('ell-ws: socket opened');

                ws.send(JSON.stringify(recordedDataList));
            }
            ws.onclose = (ev) => {
                pxt.debug('ell-ws: socket closed')
            }
            ws.onmessage = (ev) => {
                try {
                    console.log(ev.data);
                }
                catch (e) {
                    pxt.debug('unknown message: ' + ev.data);
                }
            }
        });

        d3.select("#save_btn").on("click", () => {
            const f2 = pkg.mainEditorPkg().setFile("newFile.json", JSON.stringify(recordedDataList));
            // make it so that if the user clicks on the file, it would show up in the gesture toolbox
        });

        d3.select("#download_btn").on("click", () => {
            download("recordedData.json", JSON.stringify(recordedDataList));
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
                    // this.drawRecordedData(recordedDataList.length - 1);
                    this.drawRecDataSmoothed(recordedDataList.length - 1);
                }
            };
        });





        // navigator.getUserMedia({video: true, audio: false}, function(localMediaStream) {
        //     let video = document.querySelector('video');
        //     video.src = window.URL.createObjectURL(localMediaStream);

        //     // Note: onloadedmetadata doesn't fire in Chrome when using it with getUserMedia.
        //     // See crbug.com/110938.
        //     video.onloadedmetadata = function(e: any) {
        //     // Ready to go. Do some stuff.
        //     };
        // }, errorCallback);


        // This works! Though it requires 'webcam.js' to be copied
        // into the /built/web/ directory:

        // d3.select("#gum-local").autoplay = true;
        // d3.select("video").attr("width", "300px");
        // // let errorElement = d3.select("#errorMsg");
        // // let video = d3.select("video");

        // const script = document.createElement("script");

        // script.src = "/blb/webcam.js";
        // script.async = true;

        // document.getElementById("viz").appendChild(script);
    }

    shouldComponentUpdate(nextProps: ISettingsProps, nextState: GestureToolboxState, nextContext: any): boolean {
        return this.state.visible != nextState.visible;
    }

    renderCore() {
        const { visible } = this.state;

        return (
            <sui.Modal open={this.state.visible} className="gesture_toolbox" header={lf("Gestures") } size="fullscreen"
                onClose={() => this.hide() } dimmer={true}
                closeIcon={true}
                closeOnDimmerClick closeOnDocumentClick
                >

                <video id="gum-local" width="275px"></video>
                <div id="errorMsg"></div>
                <button type="button" id="sendToTrain_btn">Train</button>
                <button type="button" id="save_btn">Save JSON</button>
                <button type="button" id="download_btn">Download JSON</button>
                <input id="file_input" type="file"/>
                <div id="viz" className="ui content">
                </div>

            </sui.Modal>
        )
    }
}
