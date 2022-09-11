import { Button, Card } from "@salesforce/design-system-react";
import { Entry } from "har-format";
import { Connection } from "jsforce";
import React, { Component } from "react";
import { Browser } from "webextension-polyfill";
import DebugFrame from "./DebugFrame";
declare var browser: Browser;

interface Props {
  sfApi: Connection;
  hasActiveTrace: boolean;
}

interface SalesforceRequest {
  name: string;
  startDate: Date;
  endDate: Date;
  requestId: string;
  summary: {};
  items: Array<SalesforceRequestItem>;
  children: Array<SalesforceRequest>;
  logs: Array<string>;
}

interface SalesforceRequestItem {
  id: string;
  name: string;
  total: number;
  db: number;
}

interface SalesforceRequestMessage {
  actions: Array<SalesforceRequestMessageAction>;
}

interface SalesforceRequestMessageAction {
  id: string;
  descriptor: string;
  params: {
    classname: string;
    method: string;
  };
}

interface SalesforceResponseBody {
  perfSummary: {
    actionsTotal: {};
    actions: {
      [action: string]: {
        total: number;
        db: number;
      };
    };
  };
}

interface BrowserRequest extends Entry {
  getContent: Function;
}

interface State {
  stack: Array<SalesforceRequest>;
  showLog?: {
    requestId: string;
    itemId: string;
  };
  inspectDate?: Date;
}

const allNodes = (stack: Array<SalesforceRequest>): Array<SalesforceRequest> => {
  return ([] as Array<SalesforceRequest>).concat.apply(
    [],
    stack.map((item) => {
      if (item.children.length) {
        return [...allNodes(item.children), item];
      }
      return [item];
    })
  );
};

export default class RequestStack extends Component<Props> {
  state: State = {
    stack: [],
  };
  componentDidMount() {
    const { sfApi, hasActiveTrace } = this.props;
    const { stack } = this.state;
    browser.devtools.network.onRequestFinished.addListener(async (request: unknown) => {
      const entry = request as Entry;
      const endDate = new Date();

      const messageParam = (((entry.request.postData || {}).params || []).find((param) => param.name === "message") || {}).value;
      const requestIdHeader = (entry.request.headers.find((header) => header.name === "x-sfdc-request-id") || {}).value;

      if (entry.request.url.indexOf("s/sfsites/aura") === -1 || !entry.request.queryString.find((param) => param.name === "aura.ApexAction.execute")) {
        return;
      }

      if (!messageParam || !requestIdHeader) {
        console.error("Unexpected request", entry.request);
        return;
      }

      let body: SalesforceResponseBody;

      try {
        const [rawBody] = await (request as BrowserRequest).getContent();
        body = JSON.parse(rawBody);
      } catch (err) {
        console.error("Caught unexpected request with non-JSON body", entry.request);
        return;
      }

      const message: SalesforceRequestMessage = JSON.parse(decodeURIComponent(messageParam));

      const item: SalesforceRequest = {
        name: "APEX",
        startDate: new Date(entry.startedDateTime),
        endDate,
        requestId: requestIdHeader,
        summary: body.perfSummary.actionsTotal,
        items: message.actions
          .filter((action) => action.descriptor === "aura://ApexActionController/ACTION$execute")
          .map((action) => ({
            id: action.id,
            name: `${action.params.classname}.${action.params.method}`,

            ...body.perfSummary.actions[action.id],
          })),
        children: [],
        logs: [],
      };

      if (hasActiveTrace) {
        const logs = (await sfApi.sobject("ApexLog").find({ RequestIdentifier: `TID:${requestIdHeader}` }, ["Id"])) as Array<{ Id: string }>;
        item.logs = logs.map((item) => item.Id);
      }

      const finishedRequests = allNodes(stack).filter((req) => req.endDate < item.startDate);

      let stackRequest;
      if (finishedRequests.length) {
        stackRequest = finishedRequests.reduce((a, b) => {
          return a.endDate > b.endDate ? a : b;
        });
      }

      if (stackRequest) {
        stackRequest.children.push(item);
      } else {
        stack.push(item);
      }

      this.setState({
        stack,
      });
    });
  }

  renderStackChildren(stack: Array<SalesforceRequest>) {
    const { sfApi } = this.props;
    const { showLog, inspectDate } = this.state;
    return (
      <div className="slds-box">
        <div className="slds-grid slds-gutters">
          {stack.map((item) => (
            <div className="slds-col" key={item.requestId}>
              <Card heading={item.requestId} bodyClassName="slds-card__body_inner">
                {item.items.map((rq) => (
                  <p key={rq.id}>
                    {rq.name} - total ${rq.total} - db ${rq.db}
                    <Button
                      label="Get log"
                      onClick={() =>
                        this.setState({
                          showLog: {
                            requestId: item.requestId,
                            itemId: rq.id,
                          },
                          inspectDate: new Date(),
                        })
                      }
                    />
                    <DebugFrame
                      logs={item.logs}
                      apexName={rq.name}
                      inspectDate={showLog && showLog.requestId === item.requestId && showLog.itemId === rq.id ? inspectDate : undefined}
                      sfApi={sfApi}
                    />
                  </p>
                ))}
                {item.children.length ? this.renderStackChildren(item.children) : ""}
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  render() {
    const { stack } = this.state;
    const { sfApi } = this.props;

    //return <DebugFrame logs={["07L7Z00000WmrRlUAJ"]} apexName="B2B_LCC_POSAccess.getMaisonPOSAccess" inspectDate={new Date()} sfApi={sfApi} />;

    if (!stack.length) {
      return <div></div>;
    }

    return <div>{this.renderStackChildren(stack)}</div>;
  }
}
