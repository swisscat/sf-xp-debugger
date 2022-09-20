import { Modal, Spinner, Toast, ToastContainer } from "@salesforce/design-system-react";
import React, { Component, ReactNode } from "react";
import { Browser, Cookies } from "webextension-polyfill";
import DebugInformation from "./components/DebugInformation";
import ManageTrace from "./components/ManageTrace";
import TraceExplorer from "./components/TraceExplorer";
import Tabs from "./layout/Tabs";
import { Connection, SfDate } from "jsforce";

declare var browser: Browser;

interface Props { }

interface TraceFlag {
  ExpirationDate: string;
}
interface AppState {
  error?: {
    title: string;
    message: ReactNode;
  };
  currentDomain?: string;
  sfApi?: Connection;
  externalUserId?: string;
  traceActiveUntil?: Date;
}

class App extends Component<Props, AppState> {
  state: AppState = {};
  constructor(props: any) {
    super(props);
  }
  cookieChangeListener = ({ cookie }: Cookies.OnChangedChangeInfoType) => {
    if (["RRetURL", "sid"].includes(cookie.name)) {
      this.bootstrapApp();
    }
  }
  componentDidMount() {
    this.bootstrapApp();

    browser.cookies.onChanged.addListener(this.cookieChangeListener);
  }
  componentWillUnmount(): void {
    browser.cookies.onChanged.removeListener(this.cookieChangeListener);
  }
  async bootstrapApp() {
    this.setState({
      error: undefined
    })

    const [currentLocation] = await browser.devtools.inspectedWindow.eval("location.href");

    const currentLocationUrl = new URL(currentLocation);
    this.setState({
      currentDomain: currentLocationUrl.hostname
    })

    const loggedAsCookie = await browser.cookies.get({ name: "RRetURL", url: currentLocation });

    if (loggedAsCookie === null) {
      return this.setState({
        error: {
          title: "Experience Cloud not found",
          message: <><p>Could not find an Experience Cloud domain on <a href="#top">{currentLocation}</a>.</p><p>Please connect to Salesforce, then use "login as" a Contact in order to use this tool.</p></>
        },
      });
    }

    const salesforceLoggedAsUrl = new URL(loggedAsCookie.value);

    const instanceUrl = salesforceLoggedAsUrl.hostname;
    const externalContactId = salesforceLoggedAsUrl.pathname.substring(1);

    const salesforceSessionCookie = await browser.cookies.get({ url: loggedAsCookie.value, name: "sid" });

    if (salesforceSessionCookie === null) {
      return this.setState({
        error: {
          title: "Salesforce Session not found",
          message: <><p>Could not find an established session for <a href="#top">{instanceUrl}</a>.</p><p>Please log in again on that domain.</p></>
        },
      });
    }

    const sessionId = salesforceSessionCookie.value;
    const sfApi = new Connection({ instanceUrl: `https://${instanceUrl}`, sessionId, version: "55.0" });

    let externalUser;

    try {
      externalUser = await sfApi.sobject("User").findOne({ ContactId: externalContactId }, ["Id"]);
    } catch (err) {
      return this.setState({
        error: {
          title: 'Salesforce Session expired',
          message: <><p>The session on <a href="#top">{instanceUrl}</a> has expired.</p><p>Please log in again on that domain.</p></>
        },
      });
    }

    if (!externalUser) {
      return this.setState({
        error: {
          title: 'Contact not found',
          message: <><p>The user with Contact ID ${externalContactId} cannot be found on <a href="#top">${instanceUrl}</a>. It may have been removed.</p><p>Please log-in again.</p></>
        },
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
    const { error, externalUserId, currentDomain, traceActiveUntil, sfApi } = this.state;

    if (error) {
      return (
        <Modal disableClose ariaHideApp={false} prompt="error" size="medium" heading={error.title} isOpen={true}><div className="slds-m-around_medium">{error.message}</div></Modal>
      );
    }

    if (!sfApi || !externalUserId) {
      return <Spinner size="large" variant="brand" />;
    }

    return (
      <Tabs appName={`${currentDomain} - XP Profiler`}>
        <div data-label="Debug">
          <TraceExplorer sfApi={sfApi} traceActiveUntil={traceActiveUntil} onLocationChange={() => this.bootstrapApp()} />
        </div>
        <div data-label="Configuration">
          <div className="slds-box">
            {externalUserId && <ManageTrace sfApi={sfApi} externalUserId={externalUserId} onTraceChange={() => this.bootstrapApp()} hasActiveTrace={!!traceActiveUntil} />}
            <DebugInformation sfApi={sfApi} externalUserId={externalUserId} />
          </div>
        </div>
      </Tabs>
    );
  }
}

export default App;
