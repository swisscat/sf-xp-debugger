import { Accordion, AccordionPanel, Button, Card, DataTable, DataTableCell, DataTableColumn, Icon } from "@salesforce/design-system-react";
import { Entry } from "har-format";
import { Connection } from "jsforce";
import React, { Component } from "react";
import { Browser } from "webextension-polyfill";
import DebugFrame from "./DebugFrame";
import { dispatchEventOnNavigation, sendMessageOnNavigationEvent } from './TraceExplorerScripts';
declare var browser: Browser;

interface Props {
  sfApi: Connection;
  traceActiveUntil?: Date;
  onLocationChange: Function;
}

interface Trace {
  url: string;
  stack: Array<SalesforceRequest>
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
  traceList: Array<Trace>;
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

export default class TraceExplorer extends Component<Props> {
  state: State = {
    traceList: [],
  };
  constructor(props: Props) {
    super(props);

    this.requestListener = this.requestListener.bind(this);
    this.reloadListener = this.reloadListener.bind(this);
    this.messageListener = this.messageListener.bind(this);
  }
  requestListener = async (request: unknown) => {
    const { traceActiveUntil, sfApi } = this.props;
    const { traceList } = this.state;
    const entry = request as Entry;
    const endDate = new Date();
    const trace = traceList[traceList.length - 1];

    const messageParam = entry.request.postData?.params?.find((param) => param.name === "message")?.value;
    const requestIdHeader = entry.request.headers.find((header) => header.name.toLowerCase() === "x-sfdc-request-id")?.value;

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

    if (!!traceActiveUntil) {
      const logs = (await sfApi.sobject("ApexLog").find({ RequestIdentifier: `TID:${requestIdHeader}` }, ["Id"])) as Array<{ Id: string }>;
      item.logs = logs.map((item) => item.Id);
    }

    const finishedRequests = allNodes(trace.stack).filter((req) => req.endDate < item.startDate);

    let stackRequest;
    if (finishedRequests.length) {
      stackRequest = finishedRequests.reduce((a, b) => {
        return a.endDate > b.endDate ? a : b;
      });
    }

    if (stackRequest) {
      stackRequest.children.push(item);
    } else {
      trace.stack.push(item);
    }

    this.setState({
      traceList,
    });

    browser.storage.local.set({ traceList });
  };
  reloadListener() {
    const { onLocationChange } = this.props;
    this.initUrlChangeListener();
    this.initTraceList();
    onLocationChange();
  }
  messageListener(message: any) {
    if (message.type === 'urlChange') {
      this.initTraceList();
    }
  }
  async initTraceList() {
    const { traceList: storedTraceList } = await browser.storage.local.get("traceList");

    const traceList = storedTraceList || [];

    const [currentLocation] = await browser.devtools.inspectedWindow.eval("location.href.substring(location.origin.length)");

    traceList.push({
      url: currentLocation,
      stack: []
    })

    this.setState({ traceList });
  }
  initUrlChangeListener(initRequestListener: boolean = false) {
    if (initRequestListener) {
      browser.devtools.network.onRequestFinished.addListener(this.requestListener);
    }
    browser.devtools.network.onNavigated.addListener(this.reloadListener);
    browser.runtime.onMessage.addListener(this.messageListener);

    browser.devtools.inspectedWindow.eval(`(${dispatchEventOnNavigation.toString()})()`);

    browser.scripting.executeScript({
      target: { tabId: browser.devtools.inspectedWindow.tabId },
      func: sendMessageOnNavigationEvent
    });
  }
  async componentDidMount() {
    this.initTraceList();
    this.initUrlChangeListener(true);
  }

  componentWillUnmount(): void {
    browser.devtools.network.onRequestFinished.removeListener(this.requestListener);
    browser.devtools.network.onNavigated.removeListener(this.reloadListener);
    browser.runtime.onMessage.removeListener(this.messageListener);
  }

  flushStack() {
    browser.storage.local.remove("traceList");
    this.initTraceList();
  }

  renderStackChildren(stack: Array<SalesforceRequest>) {
    const { sfApi } = this.props;
    const { showLog, inspectDate } = this.state;

    const ViewTraceTableCell = ({ ...props }) => (
      <DataTableCell {...props}>
        <a
          href="#cell"
          onClick={() =>
            this.setState({
              showLog: {
                requestId: props.request,
                itemId: props.item.id,
              },
              inspectDate: new Date(),
            })
          }
        >
          View Trace
        </a>
      </DataTableCell>
    );
    ViewTraceTableCell.displayName = DataTableCell.displayName;
    return (
      <div className="slds-box">
        <div className="slds-grid slds-gutters">
          {stack.map((item, idx) => (
            <div className="slds-col" key={item.requestId + idx}>
              <Card heading={`APEX: ${item.items.length} requests`} icon={<Icon category="standard" name="apex" size="small" />}>
                <DataTable items={item.items}>
                  <DataTableColumn key="name" label="Controller" property="name" />
                  <DataTableColumn key="total" label="Total" property="total" />
                  <DataTableColumn key="db" label="Database" property="db" />
                  {!!item.logs.length &&
                    <DataTableColumn key="id" label="" property="id">
                      <ViewTraceTableCell request={item.requestId} logs={item.logs} />
                    </DataTableColumn>}
                </DataTable>
                {inspectDate &&
                  item.items.map((rq) => (
                    <DebugFrame
                      key={item.requestId + rq.id}
                      logs={item.logs}
                      apexName={rq.name}
                      inspectDate={showLog && showLog.requestId === item.requestId && showLog.itemId === rq.id ? inspectDate : undefined}
                      sfApi={sfApi}
                    />
                  ))}
                {!!item.children.length && (
                  <div className="slds-card__body slds-card__body_inner">
                    <p className="slds-text-heading_small slds-truncate slds-m-bottom_small">
                      Sub-requests
                    </p>
                    {this.renderStackChildren(item.children)}
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  render() {
    const { traceActiveUntil } = this.props;
    const { traceList } = this.state;

    return <>
      <Accordion>
        {traceList.map((trace, idx) => <AccordionPanel expanded={true} key={idx} summary={trace.url} id={idx} onTogglePanel={() => { }} onClickSummary={() => { }}>
          {this.renderStackChildren(trace.stack)}
        </AccordionPanel>).reverse()}
      </Accordion>
      <div className="slds-docked-form-footer">
        <div className="slds-button slds-text-body_regular slds-text-color_weak">
          {traceActiveUntil ? `Trace active until ${traceActiveUntil.toLocaleString()}` : `Trace not enabled`} &bull;
        </div>
        <Button label="Flush logs" onClick={() => this.flushStack()} />
      </div>
    </>
  }
}
