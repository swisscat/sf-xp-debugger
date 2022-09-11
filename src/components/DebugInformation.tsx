import React, { Component } from "react";
import { Connection } from "jsforce";
import OrgInfo from "./OrgInfo";
import UserInfo from "./UserInfo";

interface Props {
  sfApi: Connection;
  externalUserId: string;
}

interface DebugConfigurationState {
  userId?: string;
  orgId?: string;
}

export default class DebugInformation extends Component<Props, DebugConfigurationState> {
  state: DebugConfigurationState = {};
  async componentDidMount() {
    const { sfApi } = this.props;

    const identity = await sfApi.identity();

    this.setState({
      userId: identity.user_id,
      orgId: identity.organization_id,
    });
  }
  render() {
    const { externalUserId, sfApi } = this.props;
    const { orgId, userId } = this.state;
    return (
      externalUserId && (
        <div className="slds-grid slds-gutters">
          {userId && (
            <div className="slds-col">
              <UserInfo userId={userId} sfApi={sfApi} label="Salesforce User" />
            </div>
          )}
          <div className="slds-col">
            <UserInfo userId={externalUserId} sfApi={sfApi} label="External User" />
          </div>
          {orgId && (
            <div className="slds-col">
              <OrgInfo orgId={orgId} sfApi={sfApi} />
            </div>
          )}
        </div>
      )
    );
  }
}
