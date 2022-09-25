import { IconSettings } from "@salesforce/design-system-react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
const build = process.env.REACT_APP_EXT_BUILD || 'chrome';

root.render(
  <React.StrictMode>
    <IconSettings iconPath="/lib/icons">
      <App build={build}/>
    </IconSettings>
  </React.StrictMode>
);
