import * as React from "react";
import * as pkg from "./package";
import * as core from "./core";
import * as srceditor from "./srceditor"
import * as sui from "./sui";
import * as codecard from "./codecard"

import * as hidbridge from "./hidbridge";

let d3  = require("d3");

import Cloud = pxt.Cloud;
import Util = pxt.Util;

const lf = Util.lf
const max_x_items = 300;

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

class SensorData {
    public acc: number[];
    public mag: number[];
    public roll: number;
    public pitch: number;

    constructor() {
        this.acc = [0, 0, 0];
        this.mag = [0, 0, 0];
        this.pitch = 0;
        this.roll = 0;
    }
}

export class Editor extends srceditor.Editor {

    config: pxt.PackageConfig = {} as any;
    isSaving: boolean;
    changeMade: boolean = false;

    isRecording: boolean = false;
    wasRecording: boolean = false;

    recordedDataList: RecordedData[];

    prepare() {
        this.isReady = true;

        this.recordedDataList = [];

        // assign events to capture of recording or not recording.
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

        // initialize the dataset with empty values
        let dataset: SensorData[];
        dataset = [];

        for (let i = 0; i < max_x_items; i++) {
            let data = new SensorData();

            dataset.push(data);
        }

        let svg = d3.select("#viz")
            .append("svg")
            .attr("width", 600)
            .attr("height", 300);


        // Initialize "g" elements in the svg that will contain other graphical elements based on 
        // the number of variables that will be visualized at every time point.
        let points = svg.selectAll("g")
                            .data(dataset)
                            .enter()
                            .append("g");

        // First dimension:
        let x = points.append("circle")
            .attr("cx", (d: SensorData, i: any) => {
                return (i * 2);
            })
            .attr("cy", (d: SensorData, i: any) => {
                return d.acc[0] + 25;
            })
            .attr("r", 2)
            .attr("fill", "red");

        // Second dimension:
        let y = points.append("circle")
            .attr("cx", (d: SensorData, i: any) => {
                return (i * 2);
            })
            .attr("cy", (d: SensorData, i: any) => {
                return d.acc[1] + 25;
            })
            .attr("r", 2)
            .attr("fill", "green");

        // Third dimension:
        let z = points.append("circle")
            .attr("cx", (d: SensorData, i: any) => {
                return (i * 2);
            })
            .attr("cy", (d: SensorData, i: any) => {
                return d.acc[2] + 25;
            })
            .attr("r", 2)
            .attr("fill", "blue");

        // Bind updating functions to every instance of the serial port:
        if (hidbridge.shouldUse()) {
            hidbridge.initAsync()
                .then(dev => {
                    dev.onSerial = (buf, isErr) => {
                        console.log(Util.fromUTF8(Util.uint8ArrayToString(buf)));

                        let strBuf: string = Util.fromUTF8(Util.uint8ArrayToString(buf));
                        document.getElementById("serial_span").innerText = strBuf;

                        // visualize ACC(x,y,z) to d3: 
                        // pop the oldest value from the visualization queue
                        dataset.shift();

                        // create a new SensorData instance based on the serial port values
                        let newData = new SensorData();

                        let strBufArray = strBuf.split(" ");
                        newData.acc = [parseInt(strBufArray[0]), parseInt(strBufArray[1]), parseInt(strBufArray[2])];

                        dataset.push(newData);

                        x.attr("cy", (d: any, i: any) => {
                            return Math.abs(dataset[i].acc[0] * (100 / 1024));
                        });

                        y.attr("cy", (d: any, i: any) => {
                            return Math.abs(dataset[i].acc[1] * (100 / 1024));
                        });

                        z.attr("cy", (d: any, i: any) => {
                            return Math.abs(dataset[i].acc[2] * (100 / 1024));
                        });

                        // record data if the user is holding the space bar:
                        if (this.wasRecording == false && this.isRecording == true) {
                            // start recording:
                            let newRecord = new RecordedData(1);
                            this.recordedDataList.push(newRecord);
                            this.recordedDataList[this.recordedDataList.length - 1].startTime = Date.now();
                            this.recordedDataList[this.recordedDataList.length - 1].rawData.push(newData);
                        }
                        else if (this.wasRecording == true && this.isRecording == true) {
                            // continue recording:
                            this.recordedDataList[this.recordedDataList.length - 1].rawData.push(newData);
                        }
                        else if (this.wasRecording == true && this.isRecording == false) {
                            // stop recording:
                            this.recordedDataList[this.recordedDataList.length - 1].endTime = Date.now();

                            // visualize the recorded data:
                            let newSVG = d3.select("#viz")
                                .append("svg")
                                .attr("width", 150)
                                .attr("height", 300);

                            // Initialize "g" elements in the svg that will contain other graphical elements based on 
                            // the number of variables that will be visualized at every time point.
                            let newPoints = newSVG.selectAll("g")
                                                .data(this.recordedDataList[this.recordedDataList.length - 1].rawData)
                                                .enter()
                                                .append("g");

                            // TODO: turn this into a function?
                            // First dimension:
                            newPoints.append("circle")
                                .attr("cx", (d: SensorData, i: any) => {
                                    return (i * 2);
                                })
                                .attr("cy", (d: SensorData, i: any) => {
                                    return Math.abs(d.acc[0] * (100 / 1024));
                                })
                                .attr("r", 2)
                                .attr("fill", "red");

                            // Second dimension:
                            newPoints.append("circle")
                                .attr("cx", (d: SensorData, i: any) => {
                                    return (i * 2);
                                })
                                .attr("cy", (d: SensorData, i: any) => {
                                    return Math.abs(d.acc[1] * (100 / 1024));
                                })
                                .attr("r", 2)
                                .attr("fill", "green");

                            // Third dimension:
                            newPoints.append("circle")
                                .attr("cx", (d: SensorData, i: any) => {
                                    return (i * 2);
                                })
                                .attr("cy", (d: SensorData, i: any) => {
                                    return Math.abs(d.acc[2] * (100 / 1024));
                                })
                                .attr("r", 2)
                                .attr("fill", "blue");
                        }

                        this.wasRecording = this.isRecording;
                    }
                })
                .catch(e => {
                    pxt.log(`hidbridge failed to load, ${e}`);
                })
        }
    }


    getId() {
        return "pxtJsonEditor"
    }


    display() {
        return (
            <div id="viz" className="ui content">
                Serial value: <span id="serial_span"></span>
            </div>
        )
    }


    acceptsFile(file: pkg.File) {
        if (file.name != pxt.CONFIG_NAME) return false

        if (file.isReadonly()) {
            // TODO add read-only support
            return false
        }

        try {
            let cfg = JSON.parse(file.content)
            // TODO validate?
            return true;
        } catch (e) {
            return false;
        }
    }
}