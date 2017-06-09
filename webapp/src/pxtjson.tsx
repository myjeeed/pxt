/// <reference path="../../typings/globals/react/index.d.ts" />
/// <reference path="../../typings/globals/react-dom/index.d.ts" />
/// <reference path="../../built/pxtlib.d.ts" />

import * as React from "react";
import * as pkg from "./package";
import * as core from "./core";
import * as srceditor from "./srceditor"
import * as sui from "./sui";
import * as codecard from "./codecard"

import * as hidbridge from "./hidbridge";

const d3 = require("d3");

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

function download(filename: string, text: string) {
    let pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        let event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}


function testELL() {
    console.log("ELL is still not working!");
    // let model = new ell.ELL_Model();
    // let model2 = new ell.ELL_Model();
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
        let x = points.append("line")
            .attr("x1", (d: SensorData, i: any) => {
                return i;
            })
            .attr("y1", (d: SensorData, i: any) => {
                return Math.abs(dataset[i].acc[0] * (100 / 1024));
            })
            .attr("x2", (d: SensorData, i: any) => {
                return (i + 1);
            })
            .attr("y2", (d: SensorData, i: any) => {
                if (i + 1 < dataset.length)
                    return Math.abs(dataset[i + 1].acc[0] * (100 / 1024));
                else if (i + 1 == dataset.length)
                    return Math.abs(dataset[i].acc[0] * (100 / 1024));
                else
                    return 0;
            })
            .attr("stroke", "red")
            .attr("stroke-width", 1);

        // First dimension:
        let y = points.append("line")
            .attr("x1", (d: SensorData, i: any) => {
                return i;
            })
            .attr("y1", (d: SensorData, i: any) => {
                return Math.abs(dataset[i].acc[1] * (100 / 1024));
            })
            .attr("x2", (d: SensorData, i: any) => {
                return (i + 1);
            })
            .attr("y2", (d: SensorData, i: any) => {
                if (i + 1 < dataset.length)
                    return Math.abs(dataset[i + 1].acc[1] * (100 / 1024));
                else if (i + 1 == dataset.length)
                    return Math.abs(dataset[i].acc[1] * (100 / 1024));
                else
                    return 0;
            })
            .attr("stroke", "green")
            .attr("stroke-width", 1);

                // First dimension:
        let z = points.append("line")
            .attr("x1", (d: SensorData, i: any) => {
                return i;
            })
            .attr("y1", (d: SensorData, i: any) => {
                return Math.abs(dataset[i].acc[2] * (100 / 1024));
            })
            .attr("x2", (d: SensorData, i: any) => {
                return (i + 1);
            })
            .attr("y2", (d: SensorData, i: any) => {
                if (i + 1 < dataset.length)
                    return Math.abs(dataset[i + 1].acc[2] * (100 / 1024));
                else if (i + 1 == dataset.length)
                    return Math.abs(dataset[i].acc[2] * (100 / 1024));
                else
                    return 0;
            })
            .attr("stroke", "blue")
            .attr("stroke-width", 1);

        d3.select("#viz")
            .append("br");

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

                        x.attr("y1", (d: any, i: any) => {
                            return Math.abs(dataset[i].acc[0] * (100 / 1024));
                        })
                        .attr("y2", (d: any, i: any) => {
                            if (i + 1 < dataset.length)
                                return Math.abs(dataset[i + 1].acc[0] * (100 / 1024));
                            else if (i + 1 == dataset.length)
                                return Math.abs(dataset[i].acc[0] * (100 / 1024));
                            else
                                return 0;
                        });

                        y.attr("y1", (d: any, i: any) => {
                            return Math.abs(dataset[i].acc[1] * (100 / 1024));
                        })
                        .attr("y2", (d: any, i: any) => {
                            if (i + 1 < dataset.length)
                                return Math.abs(dataset[i + 1].acc[1] * (100 / 1024));
                            else if (i + 1 == dataset.length)
                                return Math.abs(dataset[i].acc[1] * (100 / 1024));
                            else
                                return 0;
                        });

                        z.attr("y1", (d: any, i: any) => {
                            return Math.abs(dataset[i].acc[2] * (100 / 1024));
                        })
                        .attr("y2", (d: any, i: any) => {
                            if (i + 1 < dataset.length)
                                return Math.abs(dataset[i + 1].acc[2] * (100 / 1024));
                            else if (i + 1 == dataset.length)
                                return Math.abs(dataset[i].acc[2] * (100 / 1024));
                            else
                                return 0;
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

                            // JSON.stringify(this.recordedDataList[this.recordedDataList.length - 1])

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
                            newPoints.append("line")
                                .attr("x1", (d: SensorData, i: any) => {
                                    return i;
                                })
                                .attr("y1", (d: SensorData, i: any) => {
                                    return Math.abs(this.recordedDataList[this.recordedDataList.length - 1].rawData[i].acc[0] * (100 / 1024));
                                })
                                .attr("x2", (d: SensorData, i: any) => {
                                    return (i + 1);
                                })
                                .attr("y2", (d: SensorData, i: any) => {
                                    if (i + 1 < this.recordedDataList[this.recordedDataList.length - 1].rawData.length)
                                        return Math.abs(this.recordedDataList[this.recordedDataList.length - 1].rawData[i + 1].acc[0] * (100 / 1024));
                                    else if (i + 1 == this.recordedDataList[this.recordedDataList.length - 1].rawData.length)
                                        return Math.abs(this.recordedDataList[this.recordedDataList.length - 1].rawData[i - 1].acc[0] * (100 / 1024));
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
                                    return Math.abs(this.recordedDataList[this.recordedDataList.length - 1].rawData[i].acc[1] * (100 / 1024));
                                })
                                .attr("x2", (d: SensorData, i: any) => {
                                    return (i + 1);
                                })
                                .attr("y2", (d: SensorData, i: any) => {
                                    if (i + 1 < this.recordedDataList[this.recordedDataList.length - 1].rawData.length)
                                        return Math.abs(this.recordedDataList[this.recordedDataList.length - 1].rawData[i + 1].acc[1] * (100 / 1024));
                                    else if (i + 1 == this.recordedDataList[this.recordedDataList.length - 1].rawData.length)
                                        return Math.abs(this.recordedDataList[this.recordedDataList.length - 1].rawData[i - 1].acc[1] * (100 / 1024));
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
                                    return Math.abs(this.recordedDataList[this.recordedDataList.length - 1].rawData[i].acc[2] * (100 / 1024));
                                })
                                .attr("x2", (d: SensorData, i: any) => {
                                    return (i + 1);
                                })
                                .attr("y2", (d: SensorData, i: any) => {
                                    if (i + 1 < this.recordedDataList[this.recordedDataList.length - 1].rawData.length)
                                        return Math.abs(this.recordedDataList[this.recordedDataList.length - 1].rawData[i + 1].acc[2] * (100 / 1024));
                                    else if (i + 1 == this.recordedDataList[this.recordedDataList.length - 1].rawData.length)
                                        return Math.abs(this.recordedDataList[this.recordedDataList.length - 1].rawData[i - 1].acc[2] * (100 / 1024));
                                    else
                                        return 0;
                                })
                                .attr("stroke", "blue")
                                .attr("stroke-width", 1);
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
        console.log("is it working?");
        let tempThis = this;

        function saveToFile() {
            console.log("writing to file...");

            download('recorded.json', JSON.stringify(tempThis.recordedDataList));
        }

        function loadFromFile(e: any) {
            let file = e.target.files;

            let reader = new FileReader();
            reader.readAsText(file[0]);

            reader.onload = function() {
                let str = reader.result;
                console.log(str);
                let obj: RecordedData[] = JSON.parse(str) as RecordedData[];

                for (let i = 0; i < obj.length; i++)
                    console.log("start: " + obj[i].startTime + " end: " + obj[i].endTime);
            };
        }

        return (
            <div id="viz" className="ui content">
                Serial value: <span id="serial_span"></span>
                <br/>
                <button onClick={saveToFile}>Save recorded labels to file</button>
                <input onChange={loadFromFile} id="file_input" type="file"/>
                <br/>
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