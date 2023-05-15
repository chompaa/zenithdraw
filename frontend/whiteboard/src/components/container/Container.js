"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Board_1 = __importStar(require("../board/Board"));
require("./style.css");
function Container() {
    const [mode, setMode] = (0, react_1.useState)(Board_1.Mode.Draw);
    const [color, setColor] = (0, react_1.useState)("#000000");
    const changeColor = (e) => {
        setColor(e.target.value);
    };
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: "container" }, { children: [(0, jsx_runtime_1.jsx)("div", Object.assign({ className: "color-picker-container" }, { children: (0, jsx_runtime_1.jsx)("input", { type: "color", onChange: changeColor }) })), (0, jsx_runtime_1.jsx)("div", Object.assign({ className: "board-container" }, { children: (0, jsx_runtime_1.jsx)(Board_1.default, { color: color, mode: mode }) })), (0, jsx_runtime_1.jsx)("button", Object.assign({ onClick: () => {
                    mode === Board_1.Mode.Draw ? setMode(Board_1.Mode.Move) : setMode(Board_1.Mode.Draw);
                    console.log(mode);
                } }, { children: "Hi" }))] })));
}
exports.default = Container;
