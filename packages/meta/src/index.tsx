import React from "react";
import {render} from "react-dom";
import {App} from "./internal";

const root = window.document.querySelector("#root");

render(<App />, root);
