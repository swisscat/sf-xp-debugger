import { IconSettings } from "@salesforce/design-system-react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <IconSettings iconPath="/lib/icons">
      <App />
    </IconSettings>
  </React.StrictMode>
);
