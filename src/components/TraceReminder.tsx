import { Alert, AlertContainer } from "@salesforce/design-system-react";
import React, { Component } from "react";
import "./TraceReminder.css";

interface Props {
  traceActiveUntil?: Date;
}

interface State {
  isOpen: boolean;
}

export default class TraceReminder extends Component<Props> {
  state: State = {
    isOpen: true,
  }
  componentDidUpdate(prevProps: Readonly<Props>): void {
    if (this.props.traceActiveUntil !== prevProps.traceActiveUntil) {
      this.setState({
        isOpen: true
      })
    }
  }
  render() {
    const { traceActiveUntil } = this.props;
    const { isOpen } = this.state;
    return (
      isOpen && (
        <AlertContainer className="slds-position-relative">
          <Alert
            dismissible
            labels={{
              heading: traceActiveUntil ? `Trace active until ${traceActiveUntil.toLocaleString()}` : `Trace not enabled`,
            }}
            onRequestClose={() => {
              this.setState({ isOpen: false });
            }}
          />
        </AlertContainer>
      )
    );
  }
}
