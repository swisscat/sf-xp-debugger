import React, { Component, ReactNode } from "react";
import { Avatar, Card, Spinner } from "@salesforce/design-system-react";

interface Props {
  avatar?: string;
  children?: ReactNode;
  loaded: boolean;
  heading?: string;
}

export default class LoadingCard extends Component<Props> {
  render() {
    const { avatar, children, heading, loaded } = this.props;
    return (
      <Card bodyClassName="slds-card__body_inner" heading={heading || 'Loading...'} icon={avatar && <Avatar imgSrc={avatar} />}>
        {loaded ? children : <Spinner size="small" variant="brand" />}
      </Card>
    );
  }
}