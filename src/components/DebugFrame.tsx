import { Modal } from "@salesforce/design-system-react";
import { Connection } from "jsforce";
import React, { Component, RefObject } from "react";
import "./DebugFrame.css";

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
  async viewIframeLog() {
    const { sfApi, logs, apexName, inspectDate } = this.props;

    if (!inspectDate) {
      return;
    }

    this.setState({
      isOpen: true,
    });

    for (const logId of logs) {
      const log = await sfApi.sobject("ApexLog").retrieve(logId, ["Id"]);

      if (!log || !log.attributes) {
        return;
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

      const rawLog = await response.text();

      if (rawLog.indexOf(apexName) === -1) {
        continue;
      }

      const iframe = this.iframeRef.current;
      return iframe && iframe.contentWindow
        ? iframe.contentWindow.postMessage({
            command: "streamLog",
            name: apexName,
            data: rawLog,
          }, "*")
        : null;
    }
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
