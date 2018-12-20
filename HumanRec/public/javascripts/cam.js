class Cam {
    constructor(isWebcam, name, socket) {
        this._isWebcam = isWebcam;
        this._name = name;
        this._socket = socket;
    }
    get isWebcam() {
        return this._isWebcam;
    }
    set name(name) {
        this._name = name;
    }
    get name() {
        return this._name;
    }
    get socket() {
        return this._socket;
    }
}