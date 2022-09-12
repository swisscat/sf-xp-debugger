import React, { Component } from "react";
import { Connection } from "jsforce";
import LoadingCard from "../layout/LoadingCard";

interface Props {
  sfApi: Connection;
  userId: string;
  label: string;
}

interface User {
    Name: string;
    FullPhotoUrl: string;
}

interface UserInfoState {
  user?: User
}

export default class UserInfo extends Component<Props, UserInfoState> {
  state: UserInfoState = {};
  async componentDidMount() {
    const { sfApi, userId } = this.props;

    const user = await sfApi.sobject("User").retrieve(userId, { fields: ["FullPhotoUrl", "Name"] }) as User;

    this.setState({
      user
    });
  }
  render() {
    const { label } = this.props;
    const { user } = this.state;
    return (
      <LoadingCard loaded={!!user} heading={user?.Name} avatar={user?.FullPhotoUrl}>
        {label}
      </LoadingCard>
    );
  }
}
