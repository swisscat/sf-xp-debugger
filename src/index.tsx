import { IconSettings } from "@salesforce/design-system-react";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

ReactDOM.render(
  <React.StrictMode>
    <IconSettings iconPath="/lib/icons">
      <App />
    </IconSettings>
  </React.StrictMode>,
  document.getElementById("root")
);
