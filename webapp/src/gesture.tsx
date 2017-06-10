import * as React from "react";
import * as ReactDOM from "react-dom";
import * as data from "./data";
import * as sui from "./sui";
import * as pkg from "./package";
import * as blocks from "./blocks"
import * as hidbridge from "./hidbridge";

const d3 = require("d3");

// TODO: move to a file where the rest of the data definitions are located


/**
 * Generates a new file that would contain the given text and saves it 
 * by downloading it in the browser.
 */
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
    }

    hide() {
        this.setState({ visible: false });
    }

    show() {
        this.setState({ visible: true });

        this.initialized = true;

        d3.select("#viz").append("span").attr("id", "serial_span");

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

        recordedDataList = [];

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

        // Second dimension:
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

        // Third dimension:
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
                        recordedDataList.push(newRecord);
                        recordedDataList[recordedDataList.length - 1].startTime = Date.now();
                        recordedDataList[recordedDataList.length - 1].rawData.push(newData);
                    }
                    else if (this.wasRecording == true && this.isRecording == true) {
                        // continue recording:
                        recordedDataList[recordedDataList.length - 1].rawData.push(newData);
                    }
                    else if (this.wasRecording == true && this.isRecording == false) {
                        // stop recording:
                        recordedDataList[recordedDataList.length - 1].endTime = Date.now();

                        // JSON.stringify(recordedDataList[recordedDataList.length - 1])

                        // visualize the recorded data:
                        let newSVG = d3.select("#viz")
                            .append("svg")
                            .attr("width", 150)
                            .attr("height", 300);

                        // Initialize "g" elements in the svg that will contain other graphical elements based on 
                        // the number of variables that will be visualized at every time point.
                        let newPoints = newSVG.selectAll("g")
                                            .data(recordedDataList[recordedDataList.length - 1].rawData)
                                            .enter()
                                            .append("g");

                        // TODO: turn this into a function?
                        // First dimension:
                        newPoints.append("line")
                            .attr("x1", (d: SensorData, i: any) => {
                                return i;
                            })
                            .attr("y1", (d: SensorData, i: any) => {
                                return Math.abs(recordedDataList[recordedDataList.length - 1].rawData[i].acc[0] * (100 / 1024));
                            })
                            .attr("x2", (d: SensorData, i: any) => {
                                return (i + 1);
                            })
                            .attr("y2", (d: SensorData, i: any) => {
                                if (i + 1 < recordedDataList[recordedDataList.length - 1].rawData.length)
                                    return Math.abs(recordedDataList[recordedDataList.length - 1].rawData[i + 1].acc[0] * (100 / 1024));
                                else if (i + 1 == recordedDataList[recordedDataList.length - 1].rawData.length)
                                    return Math.abs(recordedDataList[recordedDataList.length - 1].rawData[i - 1].acc[0] * (100 / 1024));
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
                                return Math.abs(recordedDataList[recordedDataList.length - 1].rawData[i].acc[1] * (100 / 1024));
                            })
                            .attr("x2", (d: SensorData, i: any) => {
                                return (i + 1);
                            })
                            .attr("y2", (d: SensorData, i: any) => {
                                if (i + 1 < recordedDataList[recordedDataList.length - 1].rawData.length)
                                    return Math.abs(recordedDataList[recordedDataList.length - 1].rawData[i + 1].acc[1] * (100 / 1024));
                                else if (i + 1 == recordedDataList[recordedDataList.length - 1].rawData.length)
                                    return Math.abs(recordedDataList[recordedDataList.length - 1].rawData[i - 1].acc[1] * (100 / 1024));
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
                                return Math.abs(recordedDataList[recordedDataList.length - 1].rawData[i].acc[2] * (100 / 1024));
                            })
                            .attr("x2", (d: SensorData, i: any) => {
                                return (i + 1);
                            })
                            .attr("y2", (d: SensorData, i: any) => {
                                if (i + 1 < recordedDataList[recordedDataList.length - 1].rawData.length)
                                    return Math.abs(recordedDataList[recordedDataList.length - 1].rawData[i + 1].acc[2] * (100 / 1024));
                                else if (i + 1 == recordedDataList[recordedDataList.length - 1].rawData.length)
                                    return Math.abs(recordedDataList[recordedDataList.length - 1].rawData[i - 1].acc[2] * (100 / 1024));
                                else
                                    return 0;
                            })
                            .attr("stroke", "blue")
                            .attr("stroke-width", 1);
                    }

                    this.wasRecording = this.isRecording;

                    }
                });
        }
        
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
                <div id="viz" className="ui content">
                </div>

            </sui.Modal>
        )
    }
}
