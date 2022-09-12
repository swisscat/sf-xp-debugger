import { Button, Modal, Spinner } from "@salesforce/design-system-react";
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
  frameHeight: string;
  isDownloading: boolean;
  isLoaded: boolean;
}

export default class DebugFrame extends Component<Props> {
  state: State = {
    isOpen: false,
    frameHeight: "0px",
    isDownloading: false,
    isLoaded: false,
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
    iframe?.contentWindow?.postMessage(
      {
        command: "streamLog",
        name: apexName,
        data: log.raw,
      },
      "*"
    );

    this.setState({
      isLoaded: true,
    });
  }
  downloadLog = async () => {
    const { apexName } = this.props;

    this.setState({
      isDownloading: true,
    });

    const log = await this.getLogData();

    if (!log) {
      return;
    }

    const url = URL.createObjectURL(new Blob([log.raw], { type: "application/octet-stream" }));
    await browser.downloads.download({ url, filename: apexName + ".log" });

    this.setState({
      isDownloading: false,
    });
  };
  closeFrame = () => {
    this.setState({ isOpen: false, isLoaded: false });
  };
  render() {
    const { isOpen, frameHeight, isDownloading, isLoaded } = this.state;

    return (
      <Modal
        isOpen={isOpen}
        ariaHideApp={false}
        onRequestClose={this.closeFrame}
        containerClassName="debug-frame-container"
        footer={[
          <Button key="1" iconCategory="utility" iconName="close" iconPosition="left" label="Close" onClick={this.closeFrame} />,
          <Button
            key="2"
            disabled={isDownloading ? true : null}
            iconCategory="utility"
            iconName="download"
            iconPosition="left"
            label={
              <p>
                Download
                {isDownloading && <Spinner size="small" variant="brand" />}
              </p>
            }
            variant="brand"
            onClick={this.downloadLog}
          />,
        ]}
      >
        {!isLoaded && <Spinner size="large" variant="brand" />}
        <iframe
          ref={this.iframeRef}
          title="TraceViewer"
          src="traceViewer/index.html"
          scrolling="no"
          height={frameHeight}
          width="100%"
          style={{
            width: "100%",
            overflow: "auto",
          }}
          onLoad={() => {
            this.setState({
              frameHeight: this.iframeRef.current?.contentWindow?.document.body.scrollHeight + "px",
            });
          }}
        />
      </Modal>
    );
  }
}
