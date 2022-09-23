import React, { Component } from "react";
import { Connection, SfDate } from "jsforce";
import { Button, Card, ScopedNotification, Spinner } from "@salesforce/design-system-react";

interface Props {
  sfApi: Connection;
  externalUserId: string;
  onTraceChange: Function;
  hasActiveTrace: boolean;
}

interface Trace {
  Id: string;
  ExpirationDate: string;
}

interface DebugLevel {
  Id: string;
  DeveloperName: string;
  ApexCode: string;
}

interface State {
  debugLevels: Array<DebugLevel>;
  loaded: boolean;
  activeTrace?: Trace;
  error?: string;
}

export default class ManageTrace extends Component<Props, State> {
  state: State = {
    debugLevels: [],
    loaded: false,
  };

  async componentDidMount() {
    this.loadActiveTrace();

    const { sfApi } = this.props;

    const debugLevels = (await sfApi.tooling.sobject("DebugLevel").find()) as Array<DebugLevel>;

    this.setState({
      debugLevels,
      loaded: true,
      error: undefined
    });
  }
  async loadActiveTrace() {
    const { sfApi, externalUserId } = this.props;

    const activeTrace = (await sfApi.tooling.sobject("TraceFlag").findOne(
      {
        TracedEntityId: externalUserId,
        ExpirationDate: { $gte: SfDate.toDateTimeLiteral(new Date()) },
      },
      ["ExpirationDate"]
    )) as Trace;

    this.setState({
      loaded: true,
      activeTrace,
      error: undefined
    });
  }
  handleError(err: any) {
    this.setState({error: err.toString()});
  }
  async createTrace(debugLevelId: string) {
    const { onTraceChange, sfApi, externalUserId } = this.props;

    const existingTrace = await sfApi.tooling.sobject("TraceFlag").findOne({
      TracedEntityId: externalUserId,
      LogType: "USER_DEBUG",
    });

    existingTrace
      ? await sfApi.tooling.sobject("TraceFlag").update({
        Id: existingTrace.Id,
        StartDate: SfDate.toDateTimeLiteral(new Date()),
        ExpirationDate: SfDate.toDateTimeLiteral(new Date(Date.now() + 15 * 60 * 1000)),
        DebugLevelId: debugLevelId,
      })
        .catch((err) => this.handleError(err))
      : await sfApi.tooling.sobject("TraceFlag").create({
        StartDate: SfDate.toDateTimeLiteral(new Date()),
        ExpirationDate: SfDate.toDateTimeLiteral(new Date(Date.now() + 15 * 60 * 1000)),
        DebugLevelId: debugLevelId,
        LogType: "USER_DEBUG",
        TracedEntityId: externalUserId,
      })
        .catch((err) => this.handleError(err));

    onTraceChange();
  }
  componentDidUpdate(prevProps: Readonly<Props>): void {
    if (this.props.hasActiveTrace !== prevProps.hasActiveTrace) {
      this.loadActiveTrace();
    }
  }
  render() {
    const { debugLevels, loaded, activeTrace, error } = this.state;

    if (!loaded) {
      return <Spinner size="medium" variant="brand" />;
    }

    return (
      <div>
        <ScopedNotification theme="dark" className={`slds-theme_${error ? "error" : activeTrace ? "success" : "warning"}`}>
          {error ? <p>{error}</p> : activeTrace ? (
            <p>Trace activated until {SfDate.parseDate(activeTrace.ExpirationDate).toLocaleString()}</p>
          ) : (
            <p>No active trace found. Please select one below</p>
          )}
        </ScopedNotification>
        {!activeTrace && (
          <div className="slds-box">
            <div className="slds-grid slds-gutters">
              {debugLevels.map((debugLevel) => (
                <div className="slds-col" key={debugLevel.Id}>
                  <Card
                    id={debugLevel.Id}
                    headerActions={<Button label="Create Trace" onClick={() => this.createTrace(debugLevel.Id)} />}
                    heading={debugLevel.DeveloperName}
                    bodyClassName="slds-card__body_inner"
                  >
                    ApexCode Level: {debugLevel.ApexCode}
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}
