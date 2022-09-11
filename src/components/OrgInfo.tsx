import React, { Component } from "react";
import { Connection } from "jsforce";
import LoadingCard from "../layout/LoadingCard";

interface Props {
  sfApi: Connection;
  orgId: string;
}

interface Organization {
    Name: string;
    IsSandbox: string;
    InstanceName: string;
    OrganizationType: string;
}

interface UserInfoState {
  org?: Organization
}

export default class OrgInfo extends Component<Props, UserInfoState> {
  state: UserInfoState = {};
  async componentDidMount() {
    const { sfApi, orgId } = this.props;
    const org = await sfApi.sobject("Organization").retrieve(orgId, { fields: ["Name", "InstanceName", "IsSandbox", "OrganizationType"] }) as Organization;

    this.setState({
      org
    });
  }
  render() {
    const { org } = this.state;
    return (
      <LoadingCard loaded={!!org} heading={`Instance ${org? org.Name : ''} (${org && org.IsSandbox ? "Sandbox" : "PRODUCTION"})`}>
        {org? org.InstanceName : ''} - Type: {org? org.OrganizationType : ''}
      </LoadingCard>
    );
  }
}
