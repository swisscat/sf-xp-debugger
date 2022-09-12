import { Button, Modal } from "@salesforce/design-system-react";
import { Connection, SfDate } from "jsforce";
import React, { Component, RefObject } from "react";
import { Browser } from "webextension-polyfill";
import "./DebugFrame.css";
declare var browser: Browser;

interface Props {
  logs: Array<string>;
  inspectDate?: Date;
  sfApi: Connection;
  apexName: string;
}

interface State {
  isOpen: boolean;
}

export default class DebugFrame extends Component<Props> {
  state: State = {
    isOpen: false,
  };
  private iframeRef: RefObject<HTMLIFrameElement>;
  constructor(props: Props) {
    super(props);
    this.iframeRef = React.createRef();
  }
  componentDidMount(): void {
    this.viewIframeLog();
  }
  componentDidUpdate(prevProps: Readonly<Props>): void {
    const { inspectDate } = this.props;
    if (inspectDate !== prevProps.inspectDate) {
      this.viewIframeLog();
    }
  }
  async getLogData() {
    const { sfApi, logs, apexName } = this.props;

    for (const logId of logs) {
      let log = await sfApi.sobject("ApexLog").retrieve(logId, ["Id", "CreatedDate"]);

      if (!log || !log.attributes) {
        return null;
      }

      const response = await fetch(`${sfApi.instanceUrl}${log.attributes.url}/Body`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sfApi.accessToken}`,
        },
      });

      if (!response.body) {
        continue;
      }

      const raw = await response.text();

      if (raw.indexOf(apexName) === -1) {
        continue;
      }

      return { log, raw };
    }

    return null;
  }
  async viewIframeLog() {
    const { apexName, inspectDate } = this.props;
    if (!inspectDate) {
      return;
    }

    this.setState({
      isOpen: true,
    });

    const log = await this.getLogData();

    if (!log) {
      return;
    }

    const iframe = this.iframeRef.current;
    return iframe && iframe.contentWindow
      ? iframe.contentWindow.postMessage(
          {
            command: "streamLog",
            name: apexName,
            data: log.raw,
          },
          "*"
        )
      : null;
  }
  async downloadLog() {
    const { apexName } = this.props;
    const log = await this.getLogData();

    if (!log) {
      return;
    }

    const url = URL.createObjectURL(new Blob([log.raw], { type: "application/octet-stream" }));
    await browser.downloads.download({ url, filename: apexName + ".log" });
  }
  render() {
    const { isOpen } = this.state;
    return (
      <Modal
        isOpen={isOpen}
        ariaHideApp={false}
        onRequestClose={() => {
          this.setState({ isOpen: false });
        }}
        containerClassName="debug-frame-container"
      >
        <Button label="Download log" onClick={() => this.downloadLog()} />
        <iframe
          ref={this.iframeRef}
          title="TraceViewer"
          src="traceViewer/index.html"
          style={{
            width: "100%",
            height: "500px",
          }}
        />
      </Modal>
    );
  }
}
