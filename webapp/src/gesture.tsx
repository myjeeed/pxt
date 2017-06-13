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
// var MediaStreamRecorder = require('msr');

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
    }
}

export interface GestureToolboxState {
    visible?: boolean;
}

let recordedDataList: RecordedData[];
let max_x_items = 500;

export class GestureToolbox extends data.Component<ISettingsProps, GestureToolboxState> {
    isRecording: boolean = false;
    wasRecording: boolean = false;
    initialized: boolean = false;

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

    drawRecordedData(index: number) {
        let newSVG = d3.select("#viz")
                            .append("svg")
                            .attr("width", 150)
                            .attr("height", 300);

        // Initialize "g" elements in the svg that will contain other graphical elements based on 
        // the number of variables that will be visualized at every time point.
        let newPoints = newSVG.selectAll("g")
                            .data(recordedDataList[index].rawData)
                            .enter()
                            .append("g");

        // TODO: turn this into a function?
        // First dimension:
        newPoints.append("line")
            .attr("x1", (d: SensorData, i: any) => {
                return i;
            })
            .attr("y1", (d: SensorData, i: any) => {
                return  (recordedDataList[index].rawData[i].acc[0] * ( 30 / 1024) + 25);
            })
            .attr("x2", (d: SensorData, i: any) => {
                return (i + 1);
            })
            .attr("y2", (d: SensorData, i: any) => {
                if (i + 1 < recordedDataList[index].rawData.length)
                    return  (recordedDataList[index].rawData[i + 1].acc[0] * ( 30 / 1024) + 25);
                else if (i + 1 == recordedDataList[index].rawData.length)
                    return  (recordedDataList[index].rawData[i - 1].acc[0] * ( 30 / 1024) + 25);
                else
                    return 0;
            })
            .attr("stroke", "red")
            .attr("stroke-width", 1);

        // Second dimension:
        newPoints.append("line")
            .attr("x1", (d: SensorData, i: any) => {
                return i;
            })
            .attr("y1", (d: SensorData, i: any) => {
                return  (recordedDataList[index].rawData[i].acc[1] * ( 30 / 1024) + 125);
            })
            .attr("x2", (d: SensorData, i: any) => {
                return (i + 1);
            })
            .attr("y2", (d: SensorData, i: any) => {
                if (i + 1 < recordedDataList[index].rawData.length)
                    return  (recordedDataList[index].rawData[i + 1].acc[1] * ( 30 / 1024) + 125);
                else if (i + 1 == recordedDataList[index].rawData.length)
                    return  (recordedDataList[index].rawData[i - 1].acc[1] * ( 30 / 1024) + 125);
                else
                    return 0;
            })
            .attr("stroke", "green")
            .attr("stroke-width", 1);

        // Third dimension:
        newPoints.append("line")
            .attr("x1", (d: SensorData, i: any) => {
                return i;
            })
            .attr("y1", (d: SensorData, i: any) => {
                return  (recordedDataList[index].rawData[i].acc[2] * ( 30 / 1024) + 225);
            })
            .attr("x2", (d: SensorData, i: any) => {
                return (i + 1);
            })
            .attr("y2", (d: SensorData, i: any) => {
                if (i + 1 < recordedDataList[index].rawData.length)
                    return  (recordedDataList[index].rawData[i + 1].acc[2] * ( 30 / 1024) + 225);
                else if (i + 1 == recordedDataList[index].rawData.length)
                    return  (recordedDataList[index].rawData[i - 1].acc[2] * ( 30 / 1024) + 225);
                else
                    return 0;
            })
            .attr("stroke", "blue")
            .attr("stroke-width", 1);
    }

    drawRecordedDataSmoothed(index: number) {
        let newSVG = d3.select("#viz")
                            .append("svg")
                            .attr("width", 150)
                            .attr("height", 300);

        // add time (x-axis) to the SensorData

        for (let i = 0; i < recordedDataList[index].rawData.length; i++) {
            recordedDataList[index].rawData[i].time = i;
        }

        let lineFunctionX = d3.line()
            .x((d: SensorData) => {
                return d.time;
            })
            .y((d: SensorData) => {
                return d.acc[0] * (30 / 1023) + 25;
            })
            .curve(d3.curveBundle.beta(0.8));

        newSVG.append("path")
            .attr("d", lineFunctionX(recordedDataList[index].rawData))
            .attr("stroke", "red")
            .attr("stroke-width", 1)
            .attr("fill", "none");

        let lineFunctionY = d3.line()
            .x((d: SensorData) => {
                return d.time;
            })
            .y((d: SensorData) => {
                return d.acc[1] * (30 / 1023) + 125;
            })
            .curve(d3.curveBundle.beta(0.8));

        newSVG.append("path")
            .attr("d", lineFunctionY(recordedDataList[index].rawData))
            .attr("stroke", "green")
            .attr("stroke-width", 1)
            .attr("fill", "none");

        let lineFunctionZ = d3.line()
            .x((d: SensorData) => {
                return d.time;
            })
            .y((d: SensorData) => {
                return d.acc[2] * (30 / 1023) + 225;
            })
            .curve(d3.curveBundle.beta(0.8));

        newSVG.append("path")
            .attr("d", lineFunctionZ(recordedDataList[index].rawData))
            .attr("stroke", "blue")
            .attr("stroke-width", 1)
            .attr("fill", "none");

        // TODO: 
    }

    hide() {
        this.setState({ visible: false });
    }

    show() {
        this.setState({ visible: true });

        // initialize web-cam:
        // Elegent solution to preview webcam video:

        // let errorCallback = function(e: any) {
        //     console.log('Reeeejected!', e);
        // };

        // let nav = navigator as any;

        // nav.getUserMedia  = nav.getUserMedia || nav.webkitGetUserMedia ||
        //                   nav.mozGetUserMedia || nav.msGetUserMedia;

        // let streamRecorder: any;

        // if (nav.getUserMedia) {
        //     nav.getUserMedia({audio: false, video: true}, (stream: any) => {
        //         let video = document.querySelector('video') as any;
        //         video.autoplay = true;
        //         video.src = window.URL.createObjectURL(stream);
        //     }, errorCallback);
        // }
        // else {
        //     alert("not supported");
        // }

        // let nav = navigator as any;

        // nav.getUserMedia  = nav.getUserMedia || nav.webkitGetUserMedia ||
        //                     nav.mozGetUserMedia || nav.msGetUserMedia;
        
        // let mediaRecorder: any;

        // if (nav.getUserMedia) {
        //     nav.getUserMedia({audio: false, video: true},
        //         (stream: any) => {
        //             let video = document.querySelector('video') as any;
        //             video.autoplay = true;
        //             video.src = window.URL.createObjectURL(stream);
                    
        //             mediaRecorder = new MediaStreamRecorder(stream);
        //             mediaRecorder.mimeType = 'video/mp4';
                    
        //             mediaRecorder.ondataavailable = function (blob: any) {
        //                 // POST/PUT "Blob" using FormData/XHR2
        //                 let blobURL = URL.createObjectURL(blob);
        //                 console.log('<a href="' + blobURL + '">' + blobURL + '</a>');

        //                 // add video element to be played later
        //                 d3.select("#viz").append("video")
        //                     .attr("src", window.URL.createObjectURL(blob))
        //                     .attr("controls", "controls")
        //                     .attr("width", "200px");
        //             };

        //             // mediaRecorder.ondataavailable = function (blob: any) {
        //             //     // POST/PUT "Blob" using FormData/XHR2 
        //             //     let blobURL = URL.createObjectURL(blob);
        //             //     // document.write('<a href="' + blobURL + '">' + blobURL + '</a>');
        //             //     mediaRecorder.save();
        //             // };
        //         }, () => {
        //             console.error('media error');
        //         });
        // }

        


        // initialize the dataset with empty values
        let dataset: SensorData[];
        dataset = [];

        for (let i = 0; i < max_x_items; i++) {
            let data = new SensorData();

            dataset.push(data);
        }

        let svg = d3.select("#viz")
            .append("svg")
            .attr("width", 550)
            .attr("height", 300);

        // Initialize "g" elements in the svg that will contain other graphical elements based on 
        // the number of variables that will be visualized at every time point.
        let points = svg.selectAll("g")
                            .data(dataset)
                            .enter()
                            .append("g");

        // First dimension:
        let x = points.append("line")
            .attr("x1", (d: SensorData, i: any) => {
                return i;
            })
            .attr("y1", (d: SensorData, i: any) => {
                return  (dataset[i].acc[0] * (30 / 1024) + 25);
            })
            .attr("x2", (d: SensorData, i: any) => {
                return (i + 1);
            })
            .attr("y2", (d: SensorData, i: any) => {
                if (i + 1 < dataset.length)
                    return  (dataset[i + 1].acc[0] * (30 / 1024) + 25);
                else if (i + 1 == dataset.length)
                    return  (dataset[i].acc[0] * (30 / 1024) + 25);
                else
                    return 0;
            })
            .attr("stroke", "white")
            .attr("stroke-width", 1);

        // Second dimension:
        let y = points.append("line")
            .attr("x1", (d: SensorData, i: any) => {
                return i;
            })
            .attr("y1", (d: SensorData, i: any) => {
                return  (dataset[i].acc[1] * ( 30 / 1024) + 125);
            })
            .attr("x2", (d: SensorData, i: any) => {
                return (i + 1);
            })
            .attr("y2", (d: SensorData, i: any) => {
                if (i + 1 < dataset.length)
                    return  (dataset[i + 1].acc[1] * ( 30 / 1024) + 125);
                else if (i + 1 == dataset.length)
                    return  (dataset[i].acc[1] * ( 30 / 1024) + 125);
                else
                    return 0;
            })
            .attr("stroke", "white")
            .attr("stroke-width", 1);

        // Third dimension:
        let z = points.append("line")
            .attr("x1", (d: SensorData, i: any) => {
                return i;
            })
            .attr("y1", (d: SensorData, i: any) => {
                return  (dataset[i].acc[2] * ( 30 / 1024) + 225);
            })
            .attr("x2", (d: SensorData, i: any) => {
                return (i + 1);
            })
            .attr("y2", (d: SensorData, i: any) => {
                if (i + 1 < dataset.length)
                    return  (dataset[i + 1].acc[2] * ( 30 / 1024) + 225);
                else if (i + 1 == dataset.length)
                    return  (dataset[i].acc[2] * ( 30 / 1024) + 225);
                else
                    return 0;
            })
            .attr("stroke", "white")
            .attr("stroke-width", 1);

        d3.select("#viz")
            .append("br");

        // Draw all of the previously recorded data in the current session:
        for (let i = 0; i < recordedDataList.length; i++) {
            this.drawRecordedDataSmoothed(i);
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

                        // create a new SensorData instance based on the serial port values
                        let newData = new SensorData();

                        let strBufArray = strBuf.split(" ");
                        newData.acc = [parseInt(strBufArray[0]), parseInt(strBufArray[1]), parseInt(strBufArray[2])];

                        dataset.push(newData);

                        x.attr("y1", (d: any, i: any) => {
                            return  (dataset[i].acc[0] * ( 30 / 1024) + 25);
                        })
                        .attr("y2", (d: any, i: any) => {
                            if (i + 1 < dataset.length)
                                return  (dataset[i + 1].acc[0] * ( 30 / 1024) + 25);
                            else if (i + 1 == dataset.length)
                                return  (dataset[i].acc[0] * ( 30 / 1024) + 25);
                            else
                                return 0;
                        })
                        .attr("stroke", "red");

                        y.attr("y1", (d: any, i: any) => {
                            return  (dataset[i].acc[1] * ( 30 / 1024) + 125);
                        })
                        .attr("y2", (d: any, i: any) => {
                            if (i + 1 < dataset.length)
                                return  (dataset[i + 1].acc[1] * ( 30 / 1024) + 125);
                            else if (i + 1 == dataset.length)
                                return  (dataset[i].acc[1] * ( 30 / 1024) + 125);
                            else
                                return 0;
                        })
                        .attr("stroke", "green");

                        z.attr("y1", (d: any, i: any) => {
                            return  (dataset[i].acc[2] * ( 30 / 1024) + 225);
                        })
                        .attr("y2", (d: any, i: any) => {
                            if (i + 1 < dataset.length)
                                return  (dataset[i + 1].acc[2] * ( 30 / 1024) + 225);
                            else if (i + 1 == dataset.length)
                                return  (dataset[i].acc[2] * ( 30 / 1024) + 225);
                            else
                                return 0;
                        })
                        .attr("stroke", "blue");

                        // record data if the user is holding the space bar:
                    if (this.wasRecording == false && this.isRecording == true) {
                        // start recording sensor data:
                        let newRecord = new RecordedData(1);
                        recordedDataList.push(newRecord);
                        recordedDataList[recordedDataList.length - 1].startTime = Date.now();
                        recordedDataList[recordedDataList.length - 1].rawData.push(newData);

                        // start recording webcam video:
                        // mediaRecorder.start(60 * 1000);
                    }
                    else if (this.wasRecording == true && this.isRecording == true) {
                        // continue recording:
                        recordedDataList[recordedDataList.length - 1].rawData.push(newData);
                    }
                    else if (this.wasRecording == true && this.isRecording == false) {
                        // stop recording sensor data:
                        recordedDataList[recordedDataList.length - 1].endTime = Date.now();

                        // stop recording webcam video:
                        // mediaRecorder.stop();

                        // visualize the recorded data:
                        this.drawRecordedDataSmoothed(recordedDataList.length - 1);
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
                    this.drawRecordedDataSmoothed(recordedDataList.length - 1);
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
                onClose={() => this.setState({ visible: false }) } dimmer={true}
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
