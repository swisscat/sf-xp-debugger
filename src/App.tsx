import { Spinner, Toast, ToastContainer } from "@salesforce/design-system-react";
import React, { Component } from "react";
import { Browser } from "webextension-polyfill";
import DebugInformation from "./components/DebugInformation";
import ManageTrace from "./components/ManageTrace";
import RequestStack from "./components/RequestStack";
import Tabs from "./layout/Tabs";
import { Connection, SfDate } from "jsforce";

declare var browser: Browser;

interface Props {}

interface TraceFlag {
  ExpirationDate: string;
}
interface AppState {
  error?: string;
  sfApi: Connection;
  externalUserId?: string;
  traceActiveUntil?: Date;
}

class App extends Component<Props, AppState> {
  state: AppState = {
    error: undefined,
    sfApi: new Connection({}),
    externalUserId: undefined,
  };
  constructor(props: any) {
    super(props);
    this.componentDidMount = this.componentDidMount.bind(this);
  }
  async componentDidMount() {
    const [currentLocation] = await browser.devtools.inspectedWindow.eval("location.href");

    const loggedAsCookie = await browser.cookies.get({ name: "RRetURL", url: currentLocation });

    if (loggedAsCookie === null) {
      return this.setState({
        error: "Salesforce domain could not be established. Please log in from Salesforce, and access Experience Cloud using Login As to use this debugger",
      });
    }

    const salesforceLoggedAsUrl = new URL(loggedAsCookie.value);

    const instanceUrl = salesforceLoggedAsUrl.hostname;
    const externalContactId = salesforceLoggedAsUrl.pathname.substring(1);

    const salesforceSessionCookie = await browser.cookies.get({ url: loggedAsCookie.value, name: "sid" });

    if (salesforceSessionCookie === null) {
      return this.setState({
        error: `Could not find an established session for ${instanceUrl}. Please log in again on that domain.`,
      });
    }

    const sessionId = salesforceSessionCookie.value;
    const sfApi = new Connection({ instanceUrl: `https://${instanceUrl}`, sessionId, version: "55.0" });

    let externalUser;

    try {
      externalUser = await sfApi.sobject("User").findOne({ ContactId: externalContactId }, ["Id"]);
    } catch (err) {
      return this.setState({
        error: `Invalid session or expired`,
      });
    }

    if (!externalUser) {
      return this.setState({
        error: `The user with Contact ID ${externalContactId} cannot be found in the platform. It may have been removed. Please log-in again.`,
      });
    }

    const externalUserId = externalUser.Id;

    let traceActiveUntil;

    const activeTrace = await sfApi.tooling
      .sobject("TraceFlag")
      .findOne({ TracedEntityId: externalUserId, ExpirationDate: { $gte: SfDate.toDateTimeLiteral(new Date()) } }, ["ExpirationDate"]) as TraceFlag
      
    if (activeTrace) {
      traceActiveUntil = SfDate.parseDate(activeTrace.ExpirationDate);
    }

    this.setState({
      externalUserId,
      sfApi,
      traceActiveUntil
    });
  }
  render() {
    const { error, externalUserId, traceActiveUntil, sfApi } = this.state;

    if (error) {
      return (
        <ToastContainer>
          <Toast
            labels={{
              heading: error,
            }}
            variant="error"
          />
        </ToastContainer>
      );
    }

    if (!externalUserId) {
      return <Spinner size="large" variant="brand" />;
    }

    return (
      <Tabs appName="XP Profiler">
      <div data-label="Debug">
        <RequestStack sfApi={sfApi} traceActiveUntil={traceActiveUntil} />
      </div>
        <div data-label="Configuration">
          <div className="slds-box">
            {externalUserId && <ManageTrace sfApi={sfApi} externalUserId={externalUserId} onTraceChange={this.componentDidMount} hasActiveTrace={!!traceActiveUntil} />}
            <DebugInformation sfApi={sfApi} externalUserId={externalUserId} />
          </div>
        </div>
      </Tabs>
    );
  }
}

export default App;
