import * as core from "./core";

import Cloud = pxt.Cloud;
import U = pxt.Util;

let iface: pxt.worker.Iface
let devPath: Promise<string>


interface HidDevice {
    vendorId: number; // 9025,
    productId: number; // 589,
    path: string;
    serialNumber: string; // '',
    manufacturer: string; // 'Arduino LLC',
    product: string; // 'Arduino Zero',
    release: number; // 0x4201
}


export class HIDError extends Error {
    constructor(msg: string) {
        super(msg)
        this.message = msg
    }
}

let bridgeByPath: pxt.Map<BridgeIO> = {}

interface OOB {
    op: string;
    result: {
        path: string;
        data?: string;
        isError?: boolean;
        errorMessage?: string;
        errorStackTrace?: string;
    }
}

function onOOB(v: OOB) {
    let b = U.lookup(bridgeByPath, v.result.path)
    if (b) {
        b.onOOB(v)
    } else {
        console.error("Dropping data for " + v.result.path)
    }
}

function init() {
    if (!iface) {
        if (!Cloud.isLocalHost() || !Cloud.localToken)
            return;
        pxt.debug('initializing hid pipe');
        iface = pxt.worker.makeWebSocket(
            `ws://localhost:${pxt.options.wsPort}/${Cloud.localToken}/hid`, onOOB)
    }
}

export function shouldUse() {
    return pxt.appTarget.serial && pxt.appTarget.serial.useHF2 && Cloud.isLocalHost() && !!Cloud.localToken
}

function mkBridgeAsync(): Promise<pxt.HF2.PacketIO> {
    init()
    let b = new BridgeIO()
    return b.initAsync()
        .then(() => b);
}

export var mkPacketIOAsync = mkBridgeAsync;

class BridgeIO implements pxt.HF2.PacketIO {
    onData = (v: Uint8Array) => { };
    onEvent = (v: Uint8Array) => { };
    onError = (e: Error) => { };
    onSerial = (v: Uint8Array, isErr: boolean) => { };
    public dev: HidDevice;

    constructor() {
    }

    onOOB(v: OOB) {
        if (v.op == "serial") {
            this.onSerial(U.fromHex(v.result.data), v.result.isError)
        } else if (v.op = "event") {
            this.onEvent(U.fromHex(v.result.data))
        }
    }

    talksAsync(cmds: pxt.HF2.TalkArgs[]): Promise<Uint8Array[]> {
        return iface.opAsync("talk", {
            path: this.dev.path,
            cmds: cmds.map(c => ({ cmd: c.cmd, data: c.data ? U.toHex(c.data) : "" }))
        })
            .then(resp => {
                return resp.map((v: any) => U.fromHex(v.data))
            })
    }

    error(msg: string) {
        throw new HIDError(U.lf("USB/HID error on device {0} ({1})", this.dev.product, msg))
    }

    reconnectAsync(): Promise<void> {
        return this.initAsync()
    }

    disconnectAsync(): Promise<void> {
        return iface.opAsync("disconnect", {
            path: this.dev.path
        })
    }

    sendPacketAsync(pkt: Uint8Array): Promise<void> {
        throw new Error("should use talksAsync()!")
    }

    sendSerialAsync(buf: Uint8Array, useStdErr: boolean): Promise<void> {
        return iface.opAsync("sendserial", {
            path: this.dev.path,
            data: U.toHex(buf),
            isError: useStdErr
        })
    }

    initAsync(): Promise<void> {
        return iface.opAsync("list", {})
            .then((devs: any) => {
                let d0 = (devs.devices as HidDevice[]).filter(d => (d.release & 0xff00) == 0x4200)[0]
                if (d0) {
                    if (this.dev)
                        delete bridgeByPath[this.dev.path]
                    this.dev = d0
                    bridgeByPath[this.dev.path] = this
                }
                else throw new Error("No device connected")
            })
            .then(() => iface.opAsync("init", {
                path: this.dev.path
            }))
    }
}

function hf2Async() {
    return mkPacketIOAsync()
        .then(h => {
            let w = new pxt.HF2.Wrapper(h)
            return w.reconnectAsync(true)
                .then(() => w)
        })
}

let initPromise: Promise<pxt.HF2.Wrapper>
export function initAsync() {
    if (!initPromise)
        initPromise = hf2Async()
            .catch(err => {
                initPromise = null
                return Promise.reject(err)
            })
    return initPromise
}
