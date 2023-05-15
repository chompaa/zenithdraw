"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mode = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const socket_1 = require("../../socket");
const react_1 = require("react");
const react_2 = require("react");
const react_3 = require("react");
const react_4 = require("react");
require("./style.css");
var Mode;
(function (Mode) {
    Mode[Mode["Draw"] = 0] = "Draw";
    Mode[Mode["Move"] = 1] = "Move";
})(Mode = exports.Mode || (exports.Mode = {}));
function Board({ color, mode }) {
    let canvas = (0, react_4.useRef)(null);
    const [ctx, setCtx] = (0, react_3.useState)(null);
    const [mouse, setMouse] = (0, react_3.useState)({ x: 0, y: 0 });
    const [prevMouse, setPrevMouse] = (0, react_3.useState)({ x: 0, y: 0 });
    // drawing
    const [drawing, setDrawing] = (0, react_3.useState)(false);
    // moving
    const [moving, setMoving] = (0, react_3.useState)(false);
    const [moveStart, setMoveStart] = (0, react_3.useState)({ x: 0, y: 0 });
    const [cameraOffset, setCameraOffset] = (0, react_3.useState)({ x: 0, y: 0 });
    const [maxCameraOffset, setMaxCameraOffset] = (0, react_3.useState)({ x: 0, y: 0 });
    // zooming
    const SCROLL_SENSITIVITY = 0.001;
    const MIN_ZOOM = 1;
    const MAX_ZOOM = 5;
    const [zoom, setZoom] = (0, react_3.useState)(1);
    const [peerDrawing, setPeerDrawing] = (0, react_3.useState)();
    const draw = (0, react_1.useCallback)((start, end, strokeColor) => {
        if (!ctx || !canvas.current) {
            return;
        }
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.closePath();
        ctx.stroke();
        requestAnimationFrame(() => draw(start, end, strokeColor));
    }, [ctx]);
    const getEventLocation = (e) => {
        if (e.touches && e.touches.length == 1) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        else if (e.clientX && e.clientY) {
            return { x: e.clientX, y: e.clientY };
        }
    };
    const clamp = (n, min, max) => {
        return Math.max(min, Math.min(n, max));
    };
    const clampToCamera = (0, react_1.useCallback)((x, y) => {
        if (!canvas.current) {
            return { x: 0, y: 0 };
        }
        console.log(zoom);
        return {
            x: clamp(x, (canvas.current.width - (maxCameraOffset.x * zoom)), maxCameraOffset.x * zoom),
            y: clamp(y, (canvas.current.height - (maxCameraOffset.y * zoom)), maxCameraOffset.y * zoom)
        };
    }, [maxCameraOffset, zoom]);
    const mouseMove = (e) => {
        if (!canvas.current || !ctx) {
            return;
        }
        let rect = canvas.current.getBoundingClientRect();
        if (moving) {
            let clampedOffset = clampToCamera((e.clientX - moveStart.x), (e.clientY - moveStart.y));
            console.log(clampedOffset);
            setCameraOffset({ x: clampedOffset.x, y: clampedOffset.y });
        }
        setPrevMouse(mouse);
        setMouse({
            x: (e.clientX - rect.left - cameraOffset.x) / zoom,
            y: (e.clientY - rect.top - cameraOffset.y) / zoom,
        });
        if (drawing) {
            draw(prevMouse, mouse, color);
            socket_1.socket.emit('draw-data', [{ start: prevMouse, end: mouse, color: color }]);
        }
    };
    const mouseDown = (e) => {
        if (!canvas.current) {
            return;
        }
        console.log("down");
        if (mode === Mode.Draw) {
            setDrawing(true);
        }
        else {
            setMoving(true);
            setMoveStart({
                x: e.clientX - cameraOffset.x,
                y: e.clientY - cameraOffset.y,
            });
        }
    };
    const mouseUp = () => {
        if (!canvas.current) {
            return;
        }
        if (mode === Mode.Draw) {
            setDrawing(false);
        }
        else {
            setMoving(false);
        }
    };
    const wheel = (amount) => {
        let newZoom = zoom + amount;
        if (newZoom < MIN_ZOOM || newZoom > MAX_ZOOM) {
            return;
        }
        setZoom(newZoom);
    };
    // const update = (scale: number, offset: Position) => {
    //   if (!canvas.current || !ctx) {
    //     return;
    //   }
    //   const width = canvas.current.width;
    //   const height = canvas.current.height;
    //   ctx.resetTransform();
    //   ctx.clearRect(0, 0, width, height);
    //   ctx.translate(width / 2, height / 2);
    //   ctx.translate(-width / 2 + offset.x, -height / 2 + offset.y);
    //   ctx.scale(scale, scale);
    // }
    (0, react_2.useEffect)(() => {
        if (!canvas.current || !ctx) {
            return;
        }
        const width = canvas.current.width;
        const height = canvas.current.height;
        ctx.resetTransform();
        ctx.clearRect(0, 0, width, height);
        ctx.translate(width / 2, height / 2);
        const offset = clampToCamera(cameraOffset.x, cameraOffset.y);
        ctx.translate(-width / 2 + offset.x, -height / 2 + offset.y);
        ctx.scale(zoom, zoom);
        // update(zoom, clampToCamera(cameraOffset.x, cameraOffset.y));
        ctx.strokeStyle = "red";
        ctx.strokeRect(-maxCameraOffset.x + 10, -maxCameraOffset.y + 10, maxCameraOffset.x * 2 - 20, maxCameraOffset.y * 2 - 20);
    }, [cameraOffset, zoom, clampToCamera, ctx, maxCameraOffset]);
    (0, react_2.useEffect)(() => {
        if (!ctx) {
            return;
        }
        ctx.strokeStyle = color;
    }, [color, ctx]);
    (0, react_2.useEffect)(() => {
        if (!peerDrawing) {
            return;
        }
        draw(peerDrawing.start, peerDrawing.end, peerDrawing.color);
    }, [peerDrawing, draw]);
    (0, react_2.useEffect)(() => {
        if (!canvas.current) {
            return;
        }
        let style = getComputedStyle(canvas.current);
        canvas.current.width = parseInt(style.getPropertyValue('width'));
        canvas.current.height = parseInt(style.getPropertyValue('height'));
        let canvasCtx = canvas.current.getContext('2d', { willReadFrequently: true });
        canvasCtx.lineCap = 'round';
        canvasCtx.lineJoin = 'round';
        canvasCtx.lineWidth = 5;
        canvasCtx.translate(canvas.current.width / 2, canvas.current.height / 2);
        setCtx(canvasCtx);
        setCameraOffset({ x: canvas.current.width / 2, y: canvas.current.height / 2 });
        setMaxCameraOffset({ x: canvas.current.width * 0.5, y: canvas.current.height * 0.5 });
        socket_1.socket.on('draw-data', (drawings) => {
            drawings.forEach((drawing) => setPeerDrawing(drawing));
        });
    }, []);
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("canvas", { ref: canvas, className: 'board', id: 'board', onMouseMove: mouseMove, onMouseDown: mouseDown, onMouseUp: mouseUp, onWheel: (e) => {
                    wheel(-e.deltaY * SCROLL_SENSITIVITY);
                    e.preventDefault();
                } }), (0, jsx_runtime_1.jsx)("button", Object.assign({ onClick: () => wheel(SCROLL_SENSITIVITY * 50) }, { children: "Zoom in" })), (0, jsx_runtime_1.jsx)("button", Object.assign({ onClick: () => wheel(-SCROLL_SENSITIVITY * 50) }, { children: "Zoom out" }))] }));
}
exports.default = Board;
